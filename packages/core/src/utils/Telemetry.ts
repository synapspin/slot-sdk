import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import { Logger } from './Logger';

export interface TelemetryEvent {
  /** Monotonic timestamp (ms since session start) */
  t: number;
  /** Event name */
  e: string;
  /** Payload (serialized) */
  d: unknown;
  /** Current FSM state at time of event */
  s: string | null;
}

export interface TelemetryConfig {
  /** Max events in circular buffer (default 2000) */
  bufferSize: number;
  /** Auto-flush to external endpoint every N ms (0 = disabled) */
  flushInterval: number;
  /** External flush endpoint URL */
  flushUrl?: string;
  /** Include event payloads in log (default true, disable for privacy) */
  includePayloads: boolean;
  /** Events to exclude from logging (e.g. high-frequency ones) */
  excludeEvents: string[];
  /** Session metadata attached to every flush */
  sessionMeta?: Record<string, string>;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  bufferSize: 2000,
  flushInterval: 0,
  includePayloads: true,
  excludeEvents: [],
};

/**
 * Transparent telemetry — auto-logs every EventBus event without
 * any developer action. Wraps EventBus.emit() via monkey-patch.
 *
 * Usage:
 *   const telemetry = new Telemetry(eventBus, config);
 *   // That's it — everything is logged automatically.
 *   // On crash: telemetry.dump() returns full event history.
 */
export class Telemetry {
  private buffer: TelemetryEvent[];
  private writeIndex = 0;
  private count = 0;
  private config: TelemetryConfig;
  private sessionStart: number;
  private logger = new Logger('Telemetry');
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private getState: () => string | null;
  private eventBus: EventBus;

  constructor(
    eventBus: EventBus,
    getStateFn: () => string | null,
    config?: Partial<TelemetryConfig>,
  ) {
    this.eventBus = eventBus;
    this.getState = getStateFn;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buffer = new Array(this.config.bufferSize);
    this.sessionStart = performance.now();

    // Monkey-patch EventBus.emit to intercept ALL events transparently
    const originalEmit = eventBus.emit.bind(eventBus);
    const self = this;

    eventBus.emit = function <K extends keyof GameEventMap>(
      event: K,
      payload: GameEventMap[K],
    ) {
      // Record to telemetry buffer
      self.record(event as string, payload);
      // Call original emit
      return originalEmit(event, payload);
    };

    // Auto-flush if configured
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }

    // Capture unhandled errors
    window.addEventListener('error', (e) => {
      this.record('__error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.record('__unhandledRejection', {
        reason: String(e.reason),
      });
    });

    this.logger.info(`Telemetry active (buffer: ${this.config.bufferSize} events)`);
  }

  private record(event: string, payload: unknown): void {
    if (this.config.excludeEvents.includes(event)) return;

    const entry: TelemetryEvent = {
      t: Math.round(performance.now() - this.sessionStart),
      e: event,
      d: this.config.includePayloads ? this.safeSerialize(payload) : undefined,
      s: this.getState(),
    };

    // Circular buffer write
    this.buffer[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.config.bufferSize;
    if (this.count < this.config.bufferSize) this.count++;
  }

  /** Safe serialization — handles circular refs, huge objects */
  private safeSerialize(obj: unknown): unknown {
    if (obj === undefined || obj === null) return obj;
    if (typeof obj !== 'object') return obj;
    try {
      const str = JSON.stringify(obj);
      // Cap payload size to avoid memory bloat
      if (str.length > 2048) {
        return { __truncated: true, keys: Object.keys(obj as Record<string, unknown>) };
      }
      return JSON.parse(str);
    } catch {
      return { __type: typeof obj, __toString: String(obj) };
    }
  }

  /** Get all recorded events in chronological order */
  dump(): TelemetryEvent[] {
    if (this.count < this.config.bufferSize) {
      return this.buffer.slice(0, this.count);
    }
    // Circular buffer: readIndex..end + 0..readIndex
    return [
      ...this.buffer.slice(this.writeIndex),
      ...this.buffer.slice(0, this.writeIndex),
    ];
  }

  /** Get recent N events */
  recent(n: number = 50): TelemetryEvent[] {
    const all = this.dump();
    return all.slice(-n);
  }

  /** Get events matching a filter */
  query(filter: { event?: string; since?: number; state?: string }): TelemetryEvent[] {
    return this.dump().filter((e) => {
      if (filter.event && e.e !== filter.event) return false;
      if (filter.since !== undefined && e.t < filter.since) return false;
      if (filter.state && e.s !== filter.state) return false;
      return true;
    });
  }

  /** Export as JSON string (for crash reports, sharing) */
  exportJSON(): string {
    return JSON.stringify({
      session: {
        startedAt: new Date(Date.now() - (performance.now() - this.sessionStart)).toISOString(),
        duration: Math.round(performance.now() - this.sessionStart),
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        ...this.config.sessionMeta,
      },
      events: this.dump(),
    });
  }

  /** Flush buffer to external endpoint */
  async flush(): Promise<void> {
    if (!this.config.flushUrl || this.count === 0) return;

    const data = this.exportJSON();
    try {
      await fetch(this.config.flushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true, // survives page unload
      });
      this.logger.debug(`Flushed ${this.count} events`);
    } catch (err) {
      this.logger.warn('Telemetry flush failed:', err);
    }
  }

  /** Total events recorded (may exceed buffer size) */
  get totalEvents(): number {
    return this.count;
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }
}
