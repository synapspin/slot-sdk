import type { Application, Container } from 'pixi.js';
import type { LayoutConfig } from './GameConfig';
import type { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';

export type LayoutMode = 'desktop' | 'mobile';

export interface LayoutTarget {
  layout(viewport: ViewportInfo, mode: LayoutMode): void;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportInfo {
  /** Actual screen width in CSS pixels */
  width: number;
  /** Actual screen height in CSS pixels */
  height: number;
  /** Scale factor applied to the design canvas */
  scale: number;
  mode: LayoutMode;
  /** Active design dimensions (changes between landscape/portrait) */
  designWidth: number;
  designHeight: number;
  /** Active reel area for current orientation */
  reelArea: { x: number; y: number; width: number; height: number };
  /** Safe area insets in screen pixels */
  safeInsets: SafeAreaInsets;
  /** Safe area rect in design coordinates */
  safeArea: { x: number; y: number; width: number; height: number };
}

export class ResponsiveManager {
  private app: Application;
  private config: LayoutConfig;
  private eventBus: EventBus;
  private targets: LayoutTarget[] = [];
  private _viewport!: ViewportInfo;
  private _gameContainer: Container;
  private logger = new Logger('ResponsiveManager');
  private _prevMode: LayoutMode | null = null;

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

    this.onResize();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onResize(), 150);
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

  private measureSafeInsets(): SafeAreaInsets {
    let probe = document.getElementById('__safe-area-probe') as HTMLDivElement | null;
    if (!probe) {
      probe = document.createElement('div');
      probe.id = '__safe-area-probe';
      probe.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        padding-top: env(safe-area-inset-top, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        pointer-events: none; visibility: hidden; z-index: -1;
      `;
      document.body.appendChild(probe);
    }
    const cs = getComputedStyle(probe);
    return {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0,
    };
  }

  private onResize(): void {
    const screenWidth = this.app.canvas.parentElement?.clientWidth ?? window.innerWidth;
    const screenHeight = this.app.canvas.parentElement?.clientHeight ?? window.innerHeight;

    const isPortrait = screenHeight > screenWidth;
    const mode: LayoutMode = isPortrait ? 'mobile' : 'desktop';

    // Pick design dimensions based on orientation
    let designW: number;
    let designH: number;
    let reelArea: { x: number; y: number; width: number; height: number };
    let configSafe: { x: number; y: number; width: number; height: number } | undefined;

    if (isPortrait && this.config.portrait) {
      // Use explicit portrait config
      designW = this.config.portrait.designWidth ?? this.config.designHeight;
      designH = this.config.portrait.designHeight ?? this.config.designWidth;
      reelArea = this.config.portrait.reelArea ?? this.autoPortraitReelArea(designW, designH);
      configSafe = this.config.portrait.safeArea ?? this.config.safeArea;
    } else if (isPortrait) {
      // Auto-generate portrait layout: swap dimensions, recalculate reel area
      designW = this.config.designHeight;
      designH = this.config.designWidth;
      reelArea = this.autoPortraitReelArea(designW, designH);
      configSafe = this.config.safeArea
        ? { x: 20, y: 20, width: designW - 40, height: designH - 40 }
        : undefined;
    } else {
      // Landscape (default)
      designW = this.config.designWidth;
      designH = this.config.designHeight;
      reelArea = this.config.reelArea;
      configSafe = this.config.safeArea;
    }

    const scale = Math.min(screenWidth / designW, screenHeight / designH);

    // Device safe insets
    const deviceInsets = this.measureSafeInsets();
    const insetInDesign = {
      top: deviceInsets.top / scale,
      right: deviceInsets.right / scale,
      bottom: deviceInsets.bottom / scale,
      left: deviceInsets.left / scale,
    };

    // Compute safe area in design coords
    let safeX: number, safeY: number, safeW: number, safeH: number;
    if (configSafe) {
      safeX = Math.max(configSafe.x, insetInDesign.left);
      safeY = Math.max(configSafe.y, insetInDesign.top);
      safeW = Math.min(configSafe.x + configSafe.width, designW - insetInDesign.right) - safeX;
      safeH = Math.min(configSafe.y + configSafe.height, designH - insetInDesign.bottom) - safeY;
    } else {
      safeX = insetInDesign.left;
      safeY = insetInDesign.top;
      safeW = designW - insetInDesign.left - insetInDesign.right;
      safeH = designH - insetInDesign.top - insetInDesign.bottom;
    }

    this._viewport = {
      width: screenWidth,
      height: screenHeight,
      scale,
      mode,
      designWidth: designW,
      designHeight: designH,
      reelArea,
      safeInsets: deviceInsets,
      safeArea: { x: safeX, y: safeY, width: safeW, height: safeH },
    };

    // Scale and center
    this._gameContainer.scale.set(scale);
    this._gameContainer.x = (screenWidth - designW * scale) / 2;
    this._gameContainer.y = (screenHeight - designH * scale) / 2;

    // Notify all targets
    for (const target of this.targets) {
      target.layout(this._viewport, mode);
    }

    if (this._prevMode !== mode) {
      this.logger.info(`Orientation: ${mode} (${designW}x${designH})`);
      this._prevMode = mode;
    }
    this.logger.debug(
      `Resize: ${screenWidth}x${screenHeight}, scale=${scale.toFixed(3)}, ` +
      `reelArea=[${reelArea.x},${reelArea.y} ${reelArea.width}x${reelArea.height}]`,
    );
  }

  /** Auto-calculate portrait reel area: reels fill width, centered vertically */
  private autoPortraitReelArea(
    designW: number,
    designH: number,
  ): { x: number; y: number; width: number; height: number } {
    const landscapeReels = this.config.reelArea;
    const reelAspect = landscapeReels.width / landscapeReels.height;

    // In portrait, reels take ~90% of width
    const reelW = designW * 0.9;
    const reelH = reelW / reelAspect;
    const reelX = (designW - reelW) / 2;
    // Place reels in upper-center area, leaving room for UI below
    const reelY = designH * 0.12;

    return { x: reelX, y: reelY, width: reelW, height: reelH };
  }
}
