import type { IServerAdapter } from '../server/IServerAdapter';
import type {
  InitRequest, InitResponse, SpinRequest, SpinResponse, BuyBonusRequest,
} from '../server/ServerMessage';
import type { RoundRecord } from './RoundRecorder';
import { Logger } from '../utils/Logger';

/**
 * Server adapter that replays a recorded round.
 * Feed it a RoundRecord and it returns the recorded server responses
 * in the exact same order — the state machine replays deterministically.
 */
export class ReplayServerAdapter implements IServerAdapter {
  private record: RoundRecord;
  private responseQueue: SpinResponse[];
  private responseIndex = 0;
  private logger = new Logger('ReplayServer');

  constructor(record: RoundRecord) {
    this.record = record;
    // Build response queue: main spin + all feature spins
    this.responseQueue = [
      record.spinResponse,
      ...record.featureResponses,
    ];
    this.logger.info(
      `Replay loaded: ${record.roundId}, ${this.responseQueue.length} responses`,
    );
  }

  async init(_request: InitRequest): Promise<InitResponse> {
    return {
      balance: this.record.player.balanceBefore,
      betLevels: [this.record.player.bet],
      defaultBet: this.record.player.bet,
      currency: this.record.player.currency,
    };
  }

  async spin(_request: SpinRequest): Promise<SpinResponse> {
    if (this.responseIndex >= this.responseQueue.length) {
      this.logger.warn('Replay exhausted — returning last response');
      return this.responseQueue[this.responseQueue.length - 1];
    }
    const response = this.responseQueue[this.responseIndex];
    this.responseIndex++;
    this.logger.debug(`Replay response ${this.responseIndex}/${this.responseQueue.length}`);
    return response;
  }

  async buyBonus(_request: BuyBonusRequest): Promise<SpinResponse> {
    return this.spin(_request as unknown as SpinRequest);
  }

  /** Reset to replay from the beginning */
  reset(): void {
    this.responseIndex = 0;
  }

  /** Whether all responses have been consumed */
  get isComplete(): boolean {
    return this.responseIndex >= this.responseQueue.length;
  }
}
