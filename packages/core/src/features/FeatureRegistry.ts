import type { IFeaturePlugin, FeatureContext } from './IFeaturePlugin';
import type { EventBus } from '../events/EventBus';
import type { GameStateMachine } from '../state/GameStateMachine';
import { Logger } from '../utils/Logger';

export class FeatureRegistry {
  private plugins = new Map<string, IFeaturePlugin>();
  private eventBus: EventBus;
  private logger = new Logger('FeatureRegistry');

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Register and install a feature plugin */
  register(plugin: IFeaturePlugin, context: FeatureContext): void {
    if (this.plugins.has(plugin.id)) {
      this.logger.warn(`Plugin already registered: ${plugin.id}`);
      return;
    }

    plugin.install(context);
    this.plugins.set(plugin.id, plugin);
    this.logger.info(`Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  /** Inject all plugin states and transitions into the state machine */
  injectStates(stateMachine: GameStateMachine): void {
    const sortedPlugins = [...this.plugins.values()].sort((a, b) => a.priority - b.priority);

    for (const plugin of sortedPlugins) {
      const states = plugin.getStates?.();
      if (states) {
        for (const [, state] of states) {
          stateMachine.injectState(state);
        }
      }

      const transitions = plugin.getTransitions?.();
      if (transitions) {
        stateMachine.injectTransitions(transitions);
      }
    }
  }

  /** Get a registered plugin by ID */
  get(id: string): IFeaturePlugin | undefined {
    return this.plugins.get(id);
  }

  /** Uninstall and remove all plugins */
  uninstallAll(): void {
    for (const plugin of this.plugins.values()) {
      plugin.uninstall();
    }
    this.plugins.clear();
  }

  get count(): number {
    return this.plugins.size;
  }
}
