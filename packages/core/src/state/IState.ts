import type { GameContext } from './StateMachine';

export interface IState {
  readonly id: string;
  enter(context: GameContext): Promise<void>;
  exit(context: GameContext): Promise<void>;
  update?(context: GameContext, delta: number): void;
}
