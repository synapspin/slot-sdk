import { StateMachine, type GameContext } from './StateMachine';
import { IdleState } from './states/IdleState';
import { SpinRequestState } from './states/SpinRequestState';
import { SpinningState } from './states/SpinningState';
import { EvaluateState } from './states/EvaluateState';
import { WinPresentationState } from './states/WinPresentationState';
import { FeatureCheckState } from './states/FeatureCheckState';
import type { IState } from './IState';
import type { StateTransition } from './StateMachine';
import { Logger } from '../utils/Logger';

export class GameStateMachine extends StateMachine {
  protected override logger = new Logger('GameStateMachine');

  constructor(context: GameContext) {
    super();
    this.setContext(context);
    this.registerCoreStates();
  }

  private registerCoreStates(): void {
    this.addState(new IdleState());
    this.addState(new SpinRequestState());
    this.addState(new SpinningState());
    this.addState(new EvaluateState());
    this.addState(new WinPresentationState());
    this.addState(new FeatureCheckState());

    this.logger.info('Core states registered');
  }

  /** Inject states from feature plugins */
  injectState(state: IState): void {
    this.addState(state);
    this.logger.debug(`Plugin state injected: ${state.id}`);
  }

  /** Inject transitions from feature plugins */
  injectTransitions(transitions: StateTransition[]): void {
    this.addTransitions(transitions);
    this.logger.debug(`Plugin transitions injected: ${transitions.length}`);
  }

  /** Start the state machine in idle state */
  async start(): Promise<void> {
    this.logger.info('Starting game state machine');
    await this.transitionTo('idle');
  }
}
