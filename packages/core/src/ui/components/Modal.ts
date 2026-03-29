import { Container, Graphics, Text } from 'pixi.js';
import { Button } from './Button';

export interface ModalConfig {
  width: number;
  height: number;
  title?: string;
  bgColor?: number;
  bgAlpha?: number;
  overlayAlpha?: number;
  cornerRadius?: number;
  fontFamily?: string;
  closeButton?: boolean;
}

export class Modal extends Container {
  private overlay: Graphics;
  private panel: Container;
  private panelBg: Graphics;
  private titleText: Text | null = null;
  private closeBtn: Button | null = null;
  readonly contentContainer: Container;
  private config: Required<ModalConfig>;
  private onCloseCb: (() => void) | null = null;

  constructor(config: ModalConfig) {
    super();
    this.config = {
      width: config.width,
      height: config.height,
      title: config.title ?? '',
      bgColor: config.bgColor ?? 0x1a1a2e,
      bgAlpha: config.bgAlpha ?? 0.95,
      overlayAlpha: config.overlayAlpha ?? 0.7,
      cornerRadius: config.cornerRadius ?? 16,
      fontFamily: config.fontFamily ?? 'Roboto, Arial, sans-serif',
      closeButton: config.closeButton ?? true,
    };

    // Full-screen dark overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, 1920, 1080);
    this.overlay.fill({ color: 0x000000, alpha: this.config.overlayAlpha });
    this.overlay.eventMode = 'static';
    this.overlay.on('pointerdown', () => this.close());
    this.addChild(this.overlay);

    // Panel
    this.panel = new Container();
    this.panel.x = (1920 - config.width) / 2;
    this.panel.y = (1080 - config.height) / 2;
    this.addChild(this.panel);

    this.panelBg = new Graphics();
    this.panelBg.roundRect(0, 0, config.width, config.height, this.config.cornerRadius);
    this.panelBg.fill({ color: this.config.bgColor, alpha: this.config.bgAlpha });
    this.panelBg.stroke({ width: 2, color: 0x333366 });
    this.panelBg.eventMode = 'static'; // Block clicks through
    this.panel.addChild(this.panelBg);

    // Title
    if (this.config.title) {
      this.titleText = new Text({
        text: this.config.title,
        style: {
          fontFamily: this.config.fontFamily,
          fontSize: 28,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      this.titleText.anchor.set(0.5, 0);
      this.titleText.x = config.width / 2;
      this.titleText.y = 20;
      this.panel.addChild(this.titleText);
    }

    // Close button
    if (this.config.closeButton) {
      this.closeBtn = new Button({
        width: 40,
        height: 40,
        label: 'X',
        fontSize: 20,
        bgColor: 0x444444,
        cornerRadius: 20,
        borderWidth: 0,
      });
      this.closeBtn.x = config.width - 50;
      this.closeBtn.y = 10;
      this.closeBtn.onClick(() => this.close());
      this.panel.addChild(this.closeBtn);
    }

    // Content container
    this.contentContainer = new Container();
    this.contentContainer.y = this.config.title ? 60 : 20;
    this.contentContainer.x = 20;
    this.panel.addChild(this.contentContainer);

    this.visible = false;
  }

  onClose(cb: () => void): this {
    this.onCloseCb = cb;
    return this;
  }

  open(): void {
    this.visible = true;
    this.alpha = 0;
    // Simple fade in
    this.alpha = 1;
  }

  close(): void {
    this.visible = false;
    this.onCloseCb?.();
  }

  get isOpen(): boolean {
    return this.visible;
  }

  setTitle(title: string): void {
    if (this.titleText) {
      this.titleText.text = title;
    }
  }

  /** Resize overlay to cover actual screen */
  resizeOverlay(width: number, height: number): void {
    this.overlay.clear();
    this.overlay.rect(0, 0, width, height);
    this.overlay.fill({ color: 0x000000, alpha: this.config.overlayAlpha });

    // Re-center panel
    this.panel.x = (width - this.config.width) / 2;
    this.panel.y = (height - this.config.height) / 2;
  }
}
