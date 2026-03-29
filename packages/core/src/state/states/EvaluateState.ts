import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { Logger } from '../../utils/Logger';

export class EvaluateState implements IState {
  readonly id = 'evaluate';
  private logger = new Logger('EvaluateState');

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;
    if (!response) {
      await context.transitionTo('idle');
      return;
    }

    this.logger.debug(`Evaluating: ${response.wins.length} wins, total=${response.totalWin}`);
    context.totalWin = response.totalWin;

    context.eventBus.emit('win:evaluated', {
      wins: response.wins,
      totalWin: response.totalWin,
    });

    if (response.wins.length > 0 && response.totalWin > 0) {
      await context.transitionTo('winPresentation');
    } else {
      await context.transitionTo('featureCheck');
    }
  }

  async exit(): Promise<void> {}
}
