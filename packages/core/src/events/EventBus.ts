import type { GameEventMap } from './GameEvents';
import { Logger } from '../utils/Logger';

type EventCallback<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<never>>>();
  private logger = new Logger('EventBus');

  on<K extends keyof GameEventMap>(event: K, cb: EventCallback<GameEventMap[K]>): this {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(cb as EventCallback<never>);
    return this;
  }

  off<K extends keyof GameEventMap>(event: K, cb: EventCallback<GameEventMap[K]>): this {
    this.listeners.get(event as string)?.delete(cb as EventCallback<never>);
    return this;
  }

  once<K extends keyof GameEventMap>(event: K, cb: EventCallback<GameEventMap[K]>): this {
    const wrapper = ((payload: GameEventMap[K]) => {
      this.off(event, wrapper);
      cb(payload);
    }) as EventCallback<GameEventMap[K]>;
    this.on(event, wrapper);
    return this;
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): this {
    const set = this.listeners.get(event as string);
    if (set) {
      this.logger.debug(`emit: ${String(event)}`, payload);
      for (const cb of set) {
        try {
          (cb as EventCallback<GameEventMap[K]>)(payload);
        } catch (err) {
          this.logger.error(`Error in listener for ${String(event)}:`, err);
        }
      }
    }
    return this;
  }

  removeAll(event?: keyof GameEventMap): this {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /** Wait for an event to fire (Promise-based) */
  waitFor<K extends keyof GameEventMap>(event: K): Promise<GameEventMap[K]> {
    return new Promise((resolve) => {
      this.once(event, resolve);
    });
  }
}
