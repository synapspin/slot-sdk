import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { EventBus } from '../../events/EventBus';
import { Logger } from '../../utils/Logger';

export interface AnteBetConfig {
  /** Cost multiplier (e.g. 1.25 = 25% more) */
  multiplier: number;
  /** Description shown in UI */
  description: string;
}

export class AnteBetFeature implements IFeaturePlugin {
  readonly id = 'anteBet';
  readonly name = 'Ante Bet';
  readonly priority = 25;

  private config: AnteBetConfig;
  private logger = new Logger('AnteBetFeature');

  constructor(config: AnteBetConfig) {
    this.config = config;
  }

  install(context: FeatureContext): void {
    context.eventBus.on('ui:anteBetToggled', ({ enabled }) => {
      this.logger.info(`Ante bet ${enabled ? 'enabled' : 'disabled'} (${this.config.multiplier}x)`);
    });

    this.logger.info('Ante Bet feature installed');
  }

  uninstall(): void {}

  getStates() {
    return new Map();
  }

  getTransitions() {
    return [];
  }
}
