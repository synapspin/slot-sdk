import type { IState } from './IState';
import type { EventBus } from '../events/EventBus';
import type { ReelSet } from '../reels/ReelSet';
import type { UIManager } from '../ui/UIManager';
import type { SoundManager } from '../sound/SoundManager';
import type { IServerAdapter } from '../server/IServerAdapter';
import type { SpinResponse } from '../server/ServerMessage';
import { Logger } from '../utils/Logger';

export interface GameContext {
  eventBus: EventBus;
  reelSet: ReelSet;
  uiManager: UIManager;
  soundManager: SoundManager;
  server: IServerAdapter;

  // Game state data
  balance: number;
  currentBet: number;
  betLevels: number[];
  currency: string;
  anteBetEnabled: boolean;
  anteBetMultiplier: number;

  // Spin state
  lastResponse: SpinResponse | null;
  totalWin: number;

  // Settings
  quickSpinEnabled: boolean;
  turboSpinEnabled: boolean;
  autoPlayRemaining: number;
  autoPlayConfig: AutoPlayConfig | null;

  // Feature state
  featureState: Record<string, unknown>;

  // Methods
  transitionTo(stateId: string): Promise<void>;
}

export interface AutoPlayConfig {
  totalSpins: number;
  lossLimit?: number;
  winLimit?: number;
  stopOnFeature?: boolean;
}

export interface StateTransition {
  from: string;
  to: string;
  condition?: (context: GameContext) => boolean;
  priority?: number;
}

export class StateMachine {
  private states = new Map<string, IState>();
  private transitions: StateTransition[] = [];
  private _currentState: IState | null = null;
  private _context: GameContext | null = null;
  protected logger = new Logger('StateMachine');

  get currentState(): IState | null {
    return this._currentState;
  }

  get currentStateId(): string | null {
    return this._currentState?.id ?? null;
  }

  setContext(context: GameContext): void {
    this._context = context;
  }

  addState(state: IState): void {
    this.states.set(state.id, state);
    this.logger.debug(`State added: ${state.id}`);
  }

  removeState(stateId: string): void {
    this.states.delete(stateId);
  }

  addTransition(transition: StateTransition): void {
    this.transitions.push(transition);
  }

  addTransitions(transitions: StateTransition[]): void {
    this.transitions.push(...transitions);
  }

  getState(stateId: string): IState | undefined {
    return this.states.get(stateId);
  }

  async transitionTo(stateId: string): Promise<void> {
    const context = this._context;
    if (!context) {
      throw new Error('StateMachine context not set');
    }

    const nextState = this.states.get(stateId);
    if (!nextState) {
      throw new Error(`State not found: ${stateId}`);
    }

    const prevId = this._currentState?.id ?? 'none';
    this.logger.info(`Transition: ${prevId} → ${stateId}`);

    if (this._currentState) {
      context.eventBus.emit('state:exited', { state: this._currentState.id });
      await this._currentState.exit(context);
    }

    this._currentState = nextState;
    context.eventBus.emit('state:changed', { from: prevId, to: stateId });
    context.eventBus.emit('state:entered', { state: stateId });
    await nextState.enter(context);
  }

  /** Evaluate registered transitions from current state and auto-transition */
  async evaluateTransitions(): Promise<boolean> {
    if (!this._currentState || !this._context) return false;

    const currentId = this._currentState.id;
    const candidates = this.transitions
      .filter((t) => t.from === currentId)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const t of candidates) {
      if (!t.condition || t.condition(this._context)) {
        await this.transitionTo(t.to);
        return true;
      }
    }

    return false;
  }

  update(delta: number): void {
    if (this._currentState?.update && this._context) {
      this._currentState.update(this._context, delta);
    }
  }
}
