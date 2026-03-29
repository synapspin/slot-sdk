import type { IServerAdapter } from './IServerAdapter';
import type {
  InitRequest,
  InitResponse,
  SpinRequest,
  SpinResponse,
  BuyBonusRequest,
  WinResult,
  FeatureResult,
  GiftSpinsOffer,
} from './ServerMessage';
import type { SymbolDefinition, PaytableEntry, PaylineDefinition } from '../symbols/SymbolDefinition';
import { Logger } from '../utils/Logger';

export interface MockServerConfig {
  symbols: SymbolDefinition[];
  cols: number;
  rows: number;
  rowsPerCol?: number[];
  paytable: PaytableEntry[];
  paylines?: PaylineDefinition[];
  initialBalance?: number;
  betLevels: number[];
  defaultBet: number;
  currency?: string;
  /** RTP target (0-1), affects win frequency. Default 0.96 */
  rtp?: number;
  /** Free spins trigger config */
  freeSpinsTrigger?: {
    scatterSymbolId: number;
    minCount: number;
    spinsAwarded: number;
  };
  /** Hold and Win trigger config */
  holdAndWinTrigger?: {
    bonusSymbolId: number;
    minCount: number;
    initialRespins: number;
  };
}

export class MockServerAdapter implements IServerAdapter {
  private config: MockServerConfig;
  private balance: number;
  private logger = new Logger('MockServer');
  private symbolIds: number[];
  private regularSymbolIds: number[];

  constructor(config: MockServerConfig) {
    this.config = config;
    this.balance = config.initialBalance ?? 100000; // $1000 in cents
    this.symbolIds = config.symbols.map((s) => s.id);
    this.regularSymbolIds = config.symbols
      .filter((s) => s.type === 'regular' || s.type === 'wild')
      .map((s) => s.id);
  }

  async init(_request: InitRequest): Promise<InitResponse> {
    this.logger.info('Mock server init');
    return {
      balance: this.balance,
      betLevels: this.config.betLevels,
      defaultBet: this.config.defaultBet,
      currency: this.config.currency ?? 'USD',
    };
  }

  async spin(request: SpinRequest): Promise<SpinResponse> {
    const bet = request.anteBet
      ? Math.round(request.bet * 1.25)
      : request.bet;

    this.balance -= bet;

    // Generate random reel result
    const reelResult = this.generateReelResult();

    // Evaluate wins
    const wins = this.evaluateWins(reelResult, request.bet);
    const totalWin = wins.reduce((sum, w) => sum + w.payout, 0);

    this.balance += totalWin;

    // Check for features
    let feature: FeatureResult | undefined;

    if (this.config.freeSpinsTrigger) {
      const trigger = this.config.freeSpinsTrigger;
      const scatterCount = this.countSymbol(reelResult, trigger.scatterSymbolId);
      if (scatterCount >= trigger.minCount) {
        feature = {
          type: 'freeSpins',
          totalSpins: trigger.spinsAwarded,
          remainingSpins: trigger.spinsAwarded,
        };
      }
    }

    if (!feature && this.config.holdAndWinTrigger) {
      const trigger = this.config.holdAndWinTrigger;
      const bonusCount = this.countSymbol(reelResult, trigger.bonusSymbolId);
      if (bonusCount >= trigger.minCount) {
        feature = {
          type: 'holdAndWin',
          totalRespins: trigger.initialRespins,
          remainingRespins: trigger.initialRespins,
          stickyPositions: [],
        };
      }
    }

    const response: SpinResponse = {
      reelResult,
      totalWin,
      balance: this.balance,
      wins,
      feature,
    };

    this.logger.debug(`Spin: bet=${bet}, win=${totalWin}, balance=${this.balance}`);
    return response;
  }

  async buyBonus(request: BuyBonusRequest): Promise<SpinResponse> {
    const cost = request.bet * 100; // Typical buy bonus is ~100x bet
    this.balance -= cost;

    const reelResult = this.generateReelResult();
    const wins = this.evaluateWins(reelResult, request.bet);
    const totalWin = wins.reduce((sum, w) => sum + w.payout, 0);
    this.balance += totalWin;

    return {
      reelResult,
      totalWin,
      balance: this.balance,
      wins,
      feature: {
        type: 'freeSpins',
        totalSpins: 10,
        remainingSpins: 10,
      },
    };
  }

  private generateReelResult(): number[][] {
    const result: number[][] = [];
    const { cols, rows, rowsPerCol } = this.config;

    for (let col = 0; col < cols; col++) {
      const numRows = rowsPerCol?.[col] ?? rows;
      const column: number[] = [];
      for (let row = 0; row < numRows; row++) {
        // Weight regular symbols more heavily
        const useRegular = Math.random() > 0.15;
        const pool = useRegular ? this.regularSymbolIds : this.symbolIds;
        column.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      result.push(column);
    }

    return result;
  }

  private evaluateWins(grid: number[][], bet: number): WinResult[] {
    const wins: WinResult[] = [];

    if (this.config.paylines) {
      // Payline evaluation
      for (const payline of this.config.paylines) {
        const symbolsOnLine: { id: number; col: number; row: number }[] = [];
        for (let col = 0; col < grid.length; col++) {
          const row = payline.pattern[col];
          if (row !== undefined && grid[col][row] !== undefined) {
            symbolsOnLine.push({ id: grid[col][row], col, row });
          }
        }

        if (symbolsOnLine.length < 2) continue;

        // Check for consecutive matching from left
        const firstId = symbolsOnLine[0].id;
        const wildDef = this.config.symbols.find((s) => s.type === 'wild');
        let matchCount = 0;

        for (const sym of symbolsOnLine) {
          if (sym.id === firstId || (wildDef && sym.id === wildDef.id)) {
            matchCount++;
          } else {
            break;
          }
        }

        const paytableEntry = this.config.paytable.find(
          (p) => p.symbolId === firstId && p.count === matchCount,
        );

        if (paytableEntry) {
          wins.push({
            type: 'line',
            symbolId: firstId,
            positions: symbolsOnLine
              .slice(0, matchCount)
              .map((s) => [s.col, s.row] as [number, number]),
            payout: Math.round(bet * paytableEntry.payout / 100),
            multiplier: 1,
            lineIndex: payline.index,
          });
        }
      }
    } else {
      // Simple scatter-style evaluation
      const symbolCounts = new Map<number, [number, number][]>();
      for (let col = 0; col < grid.length; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const id = grid[col][row];
          if (!symbolCounts.has(id)) symbolCounts.set(id, []);
          symbolCounts.get(id)!.push([col, row]);
        }
      }

      for (const [symbolId, positions] of symbolCounts) {
        const entry = this.config.paytable.find(
          (p) => p.symbolId === symbolId && p.count === positions.length,
        );
        if (entry) {
          wins.push({
            type: 'scatter',
            symbolId,
            positions,
            payout: Math.round(bet * entry.payout / 100),
            multiplier: 1,
          });
        }
      }
    }

    return wins;
  }

  private countSymbol(grid: number[][], symbolId: number): number {
    let count = 0;
    for (const col of grid) {
      for (const id of col) {
        if (id === symbolId) count++;
      }
    }
    return count;
  }
}
