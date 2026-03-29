import type { Application, Container } from 'pixi.js';
import type { LayoutConfig } from './GameConfig';
import type { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';

export type LayoutMode = 'desktop' | 'mobile';

export interface LayoutTarget {
  layout(viewport: ViewportInfo, mode: LayoutMode): void;
}

export interface ViewportInfo {
  width: number;
  height: number;
  scale: number;
  mode: LayoutMode;
  designWidth: number;
  designHeight: number;
}

export class ResponsiveManager {
  private app: Application;
  private config: LayoutConfig;
  private eventBus: EventBus;
  private targets: LayoutTarget[] = [];
  private _viewport: ViewportInfo;
  private _gameContainer: Container;
  private logger = new Logger('ResponsiveManager');

  constructor(
    app: Application,
    gameContainer: Container,
    config: LayoutConfig,
    eventBus: EventBus,
  ) {
    this.app = app;
    this._gameContainer = gameContainer;
    this.config = config;
    this.eventBus = eventBus;

    this._viewport = {
      width: config.designWidth,
      height: config.designHeight,
      scale: 1,
      mode: 'desktop',
      designWidth: config.designWidth,
      designHeight: config.designHeight,
    };

    this.onResize();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onResize(), 100);
    });
  }

  register(target: LayoutTarget): void {
    this.targets.push(target);
    target.layout(this._viewport, this._viewport.mode);
  }

  unregister(target: LayoutTarget): void {
    const idx = this.targets.indexOf(target);
    if (idx >= 0) this.targets.splice(idx, 1);
  }

  get viewport(): ViewportInfo {
    return this._viewport;
  }

  get mode(): LayoutMode {
    return this._viewport.mode;
  }

  private onResize(): void {
    const screenWidth = this.app.canvas.parentElement?.clientWidth ?? window.innerWidth;
    const screenHeight = this.app.canvas.parentElement?.clientHeight ?? window.innerHeight;

    const mode: LayoutMode = screenWidth < screenHeight ? 'mobile' : 'desktop';

    const designW = this.config.designWidth;
    const designH = this.config.designHeight;
    const scale = Math.min(screenWidth / designW, screenHeight / designH);

    this._viewport = {
      width: screenWidth,
      height: screenHeight,
      scale,
      mode,
      designWidth: designW,
      designHeight: designH,
    };

    // Scale and center the game container
    this._gameContainer.scale.set(scale);
    this._gameContainer.x = (screenWidth - designW * scale) / 2;
    this._gameContainer.y = (screenHeight - designH * scale) / 2;

    // Notify all layout targets
    for (const target of this.targets) {
      target.layout(this._viewport, mode);
    }

    this.logger.debug(`Resize: ${screenWidth}x${screenHeight}, scale=${scale.toFixed(3)}, mode=${mode}`);
  }
}
