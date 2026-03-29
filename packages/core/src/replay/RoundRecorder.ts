import type { EventBus } from '../events/EventBus';
import type { SpinRequest, SpinResponse } from '../server/ServerMessage';
import { Logger } from '../utils/Logger';

/**
 * Complete snapshot of a single game round —
 * contains everything needed to deterministically replay it.
 */
export interface RoundRecord {
  /** Schema version for forward compatibility */
  version: 1;

  // ─── Session context ──────────────────────────
  /** Unique round ID */
  roundId: string;
  /** ISO timestamp when round started */
  timestamp: string;
  /** Game ID and version */
  gameId: string;
  gameVersion: string;
  /** Hash of config.json at time of play (for audit) */
  configHash?: string;

  // ─── Player state at round start ──────────────
  player: {
    balanceBefore: number;
    balanceAfter: number;
    currency: string;
    bet: number;
    anteBetEnabled: boolean;
  };

  // ─── Active features / promotions ─────────────
  activeContext: {
    /** e.g. tournament ID if player was in a tournament */
    tournamentId?: string;
    /** Gift spins remaining */
    giftSpinsRemaining?: number;
    /** Any custom context */
    [key: string]: unknown;
  };

  // ─── Server responses (source of truth) ───────
  /** The initial spin request */
  spinRequest: SpinRequest;
  /** Main spin response */
  spinResponse: SpinResponse;
  /** Feature round responses (free spins, hold&win respins) */
  featureResponses: SpinResponse[];

  // ─── Outcome summary ──────────────────────────
  outcome: {
    totalWin: number;
    featureTriggered: string | null;
    bigWinTier: string | null;
    jackpotWon: string | null;
    /** Duration of the round in ms (from spin to idle) */
    durationMs: number;
  };
}

/**
 * Records round data as the game plays.
 * Attaches to EventBus transparently — developer doesn't need to do anything.
 */
export class RoundRecorder {
  private eventBus: EventBus;
  private logger = new Logger('RoundRecorder');
  private recording = false;
  private currentRound: Partial<RoundRecord> | null = null;
  private roundStartTime = 0;
  private featureResponses: SpinResponse[] = [];
  private completedRounds: RoundRecord[] = [];
  private maxStoredRounds: number;

  /** Callback when a round is completed */
  onRoundComplete: ((record: RoundRecord) => void) | null = null;

  constructor(
    eventBus: EventBus,
    private getState: () => {
      balance: number;
      bet: number;
      currency: string;
      anteBetEnabled: boolean;
      gameId: string;
      gameVersion: string;
      featureState: Record<string, unknown>;
    },
    maxStoredRounds: number = 100,
  ) {
    this.eventBus = eventBus;
    this.maxStoredRounds = maxStoredRounds;
    this.attachListeners();
    this.logger.info('RoundRecorder active');
  }

  private attachListeners(): void {
    // Round starts when spin is requested
    this.eventBus.on('spin:requested', ({ bet, anteBet }) => {
      const state = this.getState();
      this.recording = true;
      this.roundStartTime = performance.now();
      this.featureResponses = [];

      this.currentRound = {
        version: 1,
        roundId: this.generateRoundId(),
        timestamp: new Date().toISOString(),
        gameId: state.gameId,
        gameVersion: state.gameVersion,
        player: {
          balanceBefore: state.balance,
          balanceAfter: 0, // filled on completion
          currency: state.currency,
          bet,
          anteBetEnabled: anteBet,
        },
        activeContext: { ...state.featureState },
        spinRequest: { bet, anteBet },
      };
    });

    // Capture main spin response
    this.eventBus.on('spin:responseReceived', (response) => {
      if (!this.currentRound) return;
      this.currentRound.spinResponse = response;
    });

    // Capture feature spin responses
    this.eventBus.on('feature:spinComplete', () => {
      // Feature responses come through spin:responseReceived too,
      // but we track them separately after the first one
      if (!this.currentRound || !this.currentRound.spinResponse) return;
    });

    // Track feature-related spin responses (after the main one)
    const originalSpinResponse = this.currentRound?.spinResponse;
    this.eventBus.on('spin:responseReceived', (response) => {
      if (!this.recording || !this.currentRound) return;
      // If we already have a main spinResponse and this is a different one,
      // it's a feature round response
      if (this.currentRound.spinResponse && response !== this.currentRound.spinResponse) {
        this.featureResponses.push(response);
      }
    });

    // Round ends when returning to idle
    this.eventBus.on('state:entered', ({ state }) => {
      if (state === 'idle' && this.recording) {
        this.completeRound();
      }
    });

    // Capture big win tier
    this.eventBus.on('win:big', ({ tier }) => {
      if (this.currentRound) {
        if (!this.currentRound.outcome) {
          (this.currentRound as any)._bigWinTier = tier;
        }
      }
    });

    // Capture feature trigger
    this.eventBus.on('feature:triggered', (feature) => {
      if (this.currentRound) {
        (this.currentRound as any)._featureType = feature.type;
      }
    });
  }

  private completeRound(): void {
    if (!this.currentRound || !this.currentRound.spinResponse) {
      this.recording = false;
      this.currentRound = null;
      return;
    }

    const state = this.getState();
    const round = this.currentRound as any;

    const record: RoundRecord = {
      version: 1,
      roundId: round.roundId,
      timestamp: round.timestamp,
      gameId: round.gameId,
      gameVersion: round.gameVersion,
      player: {
        ...round.player,
        balanceAfter: state.balance,
      },
      activeContext: round.activeContext,
      spinRequest: round.spinRequest,
      spinResponse: round.spinResponse,
      featureResponses: this.featureResponses,
      outcome: {
        totalWin: round.spinResponse.totalWin + this.featureResponses.reduce(
          (sum: number, r: SpinResponse) => sum + r.totalWin, 0,
        ),
        featureTriggered: round._featureType ?? null,
        bigWinTier: round._bigWinTier ?? null,
        jackpotWon: round.spinResponse.feature?.jackpot ?? null,
        durationMs: Math.round(performance.now() - this.roundStartTime),
      },
    };

    // Store
    this.completedRounds.push(record);
    if (this.completedRounds.length > this.maxStoredRounds) {
      this.completedRounds.shift();
    }

    this.logger.debug(
      `Round ${record.roundId}: bet=${record.player.bet}, ` +
      `win=${record.outcome.totalWin}, dur=${record.outcome.durationMs}ms`,
    );

    // Notify
    this.onRoundComplete?.(record);

    this.recording = false;
    this.currentRound = null;
  }

  private generateRoundId(): string {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).substring(2, 8);
    return `${ts}-${rnd}`;
  }

  // ─── Public API ──────────────────────────────

  /** Get all stored round records */
  getRounds(): RoundRecord[] {
    return [...this.completedRounds];
  }

  /** Get the last N rounds */
  getRecentRounds(n: number = 10): RoundRecord[] {
    return this.completedRounds.slice(-n);
  }

  /** Get a specific round by ID */
  getRound(roundId: string): RoundRecord | undefined {
    return this.completedRounds.find((r) => r.roundId === roundId);
  }

  /** Export a round as a shareable compressed string */
  static encode(record: RoundRecord): string {
    const json = JSON.stringify(record);
    // Base64 encode (works everywhere including iOS)
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      (_match, p1) => String.fromCharCode(parseInt('0x' + p1, 16)),
    ));
  }

  /** Decode a round from the encoded string */
  static decode(encoded: string): RoundRecord {
    const json = decodeURIComponent(
      Array.from(atob(encoded), (c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2),
      ).join(''),
    );
    return JSON.parse(json) as RoundRecord;
  }

  /** Generate a shareable replay URL */
  static createReplayUrl(record: RoundRecord, baseUrl: string): string {
    const encoded = RoundRecorder.encode(record);
    return `${baseUrl}?replay=${encoded}`;
  }

  /** Check if current URL has replay data */
  static getReplayFromUrl(): RoundRecord | null {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('replay');
    if (!data) return null;
    try {
      return RoundRecorder.decode(data);
    } catch {
      return null;
    }
  }
}
