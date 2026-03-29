import type { Container } from 'pixi.js';
import type { IState } from '../state/IState';
import type { StateTransition } from '../state/StateMachine';
import type { EventBus } from '../events/EventBus';
import type { ReelSet } from '../reels/ReelSet';
import type { UIManager } from '../ui/UIManager';
import type { SoundManager } from '../sound/SoundManager';
import type { GameConfig } from '../app/GameConfig';

export interface FeatureContext {
  eventBus: EventBus;
  stage: Container;
  reelSet: ReelSet;
  uiManager: UIManager;
  soundManager: SoundManager;
  config: GameConfig;
}

export interface IFeaturePlugin {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Priority for ordering (lower = earlier) */
  readonly priority: number;

  /** Called once when registered */
  install(context: FeatureContext): void;
  /** Called when game shuts down */
  uninstall(): void;

  /** Provide additional states to inject into the FSM */
  getStates?(): Map<string, IState>;
  /** Provide transitions to add to the FSM */
  getTransitions?(): StateTransition[];
}
