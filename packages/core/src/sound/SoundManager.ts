import { Howl, Howler } from 'howler';
import type { SoundConfig } from './SoundConfig';
import type { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';

export class SoundManager {
  private sounds = new Map<string, Howl>();
  private music: Howl | null = null;
  private musicKey: string | null = null;
  private _muted = false;
  private _volume = 1;
  private _musicVolume = 0.5;
  private logger = new Logger('SoundManager');

  constructor(
    private config: SoundConfig,
    private eventBus: EventBus,
  ) {
    this._volume = config.defaultVolume ?? 1;
    this._musicVolume = config.musicVolume ?? 0.5;
    this.loadAll();
    this.setupListeners();
  }

  private loadAll(): void {
    for (const [key, src] of Object.entries(this.config.sounds)) {
      const sources = Array.isArray(src) ? src : [src];
      try {
        const howl = new Howl({
          src: sources,
          volume: this._volume,
          preload: true,
          onloaderror: (_id: number, err: unknown) => {
            this.logger.warn(`Failed to load sound "${key}": ${err}`);
          },
        });
        this.sounds.set(key, howl);
      } catch (err) {
        this.logger.warn(`Failed to create sound "${key}": ${err}`);
      }
    }

    if (this.config.musicKey && this.sounds.has(this.config.musicKey)) {
      this.musicKey = this.config.musicKey;
      this.music = this.sounds.get(this.musicKey)!;
      this.music.loop(true);
      this.music.volume(this._musicVolume);
    }

    this.logger.info(`Loaded ${this.sounds.size} sounds`);
  }

  private setupListeners(): void {
    this.eventBus.on('ui:soundToggled', ({ enabled }) => {
      if (enabled) {
        this.unmute();
      } else {
        this.mute();
      }
    });
  }

  play(key: string, volume?: number): number | undefined {
    const howl = this.sounds.get(key);
    if (!howl) {
      return undefined;
    }
    try {
      const id = howl.play();
      if (volume !== undefined) {
        howl.volume(volume, id);
      }
      return id;
    } catch {
      return undefined;
    }
  }

  stop(key: string): void {
    this.sounds.get(key)?.stop();
  }

  stopAll(): void {
    for (const howl of this.sounds.values()) {
      howl.stop();
    }
  }

  playMusic(): void {
    if (this.music && !this.music.playing()) {
      this.music.play();
    }
  }

  stopMusic(): void {
    this.music?.stop();
  }

  fadeMusic(to: number, duration: number = 1000): void {
    if (this.music) {
      const current = this.music.volume() as number;
      this.music.fade(current, to, duration);
    }
  }

  mute(): void {
    this._muted = true;
    Howler.mute(true);
    this.logger.info('Sound muted');
  }

  unmute(): void {
    this._muted = false;
    Howler.mute(false);
    this.logger.info('Sound unmuted');
  }

  get isMuted(): boolean {
    return this._muted;
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this._volume);
  }

  get volume(): number {
    return this._volume;
  }

  destroy(): void {
    this.stopAll();
    for (const howl of this.sounds.values()) {
      howl.unload();
    }
    this.sounds.clear();
    this.music = null;
  }
}
