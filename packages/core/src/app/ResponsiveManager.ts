import type { Application, Container } from 'pixi.js';
import type { LayoutConfig } from './GameConfig';
import type { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';

export type LayoutMode = 'desktop' | 'mobile';

export interface LayoutTarget {
  layout(viewport: ViewportInfo, mode: LayoutMode): void;
}

/** Insets in real screen pixels */
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
  designWidth: number;
  designHeight: number;
  /** Safe area insets in screen pixels (accounts for notches, system bars, rounded corners) */
  safeInsets: SafeAreaInsets;
  /** Safe area rect in design coordinates — UI elements should stay within this */
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

  /** Read CSS env(safe-area-inset-*) values from the browser */
  private getDeviceSafeInsets(): SafeAreaInsets {
    const style = getComputedStyle(document.documentElement);
    const parse = (prop: string): number => {
      const val = style.getPropertyValue(prop);
      return parseFloat(val) || 0;
    };
    return {
      top: parse('--sai-top') || parse('env(safe-area-inset-top)') || 0,
      right: parse('--sai-right') || parse('env(safe-area-inset-right)') || 0,
      bottom: parse('--sai-bottom') || parse('env(safe-area-inset-bottom)') || 0,
      left: parse('--sai-left') || parse('env(safe-area-inset-left)') || 0,
    };
  }

  /** Read safe area insets using a measurement element (more reliable cross-browser) */
  private measureSafeInsets(): SafeAreaInsets {
    // Create a hidden element that uses env() values
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

    const mode: LayoutMode = screenWidth < screenHeight ? 'mobile' : 'desktop';

    const designW = this.config.designWidth;
    const designH = this.config.designHeight;
    const scale = Math.min(screenWidth / designW, screenHeight / designH);

    // Get device safe area insets (notches, system bars, rounded corners)
    const deviceInsets = this.measureSafeInsets();

    // Convert screen-pixel insets to design-coordinate insets
    const insetInDesign = {
      top: deviceInsets.top / scale,
      right: deviceInsets.right / scale,
      bottom: deviceInsets.bottom / scale,
      left: deviceInsets.left / scale,
    };

    // Merge with config safe area (if defined, it sets minimum insets)
    const configSafe = this.config.safeArea;
    let safeX: number, safeY: number, safeW: number, safeH: number;

    if (configSafe) {
      // Config safe area defines absolute rect in design coords
      // Merge with device insets — take the more restrictive
      safeX = Math.max(configSafe.x, insetInDesign.left);
      safeY = Math.max(configSafe.y, insetInDesign.top);
      safeW = Math.min(configSafe.x + configSafe.width, designW - insetInDesign.right) - safeX;
      safeH = Math.min(configSafe.y + configSafe.height, designH - insetInDesign.bottom) - safeY;
    } else {
      // No config — use device insets only
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
      safeInsets: deviceInsets,
      safeArea: { x: safeX, y: safeY, width: safeW, height: safeH },
    };

    // Scale and center the game container
    this._gameContainer.scale.set(scale);
    this._gameContainer.x = (screenWidth - designW * scale) / 2;
    this._gameContainer.y = (screenHeight - designH * scale) / 2;

    // Notify all layout targets
    for (const target of this.targets) {
      target.layout(this._viewport, mode);
    }

    this.logger.debug(
      `Resize: ${screenWidth}x${screenHeight}, scale=${scale.toFixed(3)}, mode=${mode}, ` +
      `safe=[${safeX.toFixed(0)},${safeY.toFixed(0)} ${safeW.toFixed(0)}x${safeH.toFixed(0)}], ` +
      `deviceInsets=[T:${deviceInsets.top} R:${deviceInsets.right} B:${deviceInsets.bottom} L:${deviceInsets.left}]`,
    );
  }
}
