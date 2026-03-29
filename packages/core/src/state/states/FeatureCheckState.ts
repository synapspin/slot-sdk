import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { Logger } from '../../utils/Logger';

export class FeatureCheckState implements IState {
  readonly id = 'featureCheck';
  private logger = new Logger('FeatureCheckState');

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;

    if (response?.feature) {
      this.logger.info(`Feature triggered: ${response.feature.type}`);
      context.eventBus.emit('feature:triggered', response.feature);

      // Transition to appropriate feature state (injected by plugin)
      const featureStateId = `${response.feature.type}:intro`;
      try {
        await context.transitionTo(featureStateId);
        return;
      } catch (err) {
        this.logger.warn(`Feature state "${featureStateId}" not found, skipping feature`);
      }
    }

    // No feature — go back to idle
    await context.transitionTo('idle');
  }

  async exit(): Promise<void> {}
}
