import { Container, Graphics, Text, type TextStyle } from 'pixi.js';

export interface ButtonConfig {
  width: number;
  height: number;
  label?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: number;
  bgColor?: number;
  bgColorHover?: number;
  bgColorPressed?: number;
  bgColorDisabled?: number;
  cornerRadius?: number;
  borderColor?: number;
  borderWidth?: number;
}

export class Button extends Container {
  private bg: Graphics;
  private labelText: Text | null = null;
  private config: Required<ButtonConfig>;
  private _enabled = true;
  private _pressed = false;
  private onClickCb: (() => void) | null = null;

  constructor(config: ButtonConfig) {
    super();
    this.config = {
      width: config.width,
      height: config.height,
      label: config.label ?? '',
      fontSize: config.fontSize ?? 18,
      fontFamily: config.fontFamily ?? 'Roboto, Arial, sans-serif',
      textColor: config.textColor ?? 0xffffff,
      bgColor: config.bgColor ?? 0x333333,
      bgColorHover: config.bgColorHover ?? 0x444444,
      bgColorPressed: config.bgColorPressed ?? 0x222222,
      bgColorDisabled: config.bgColorDisabled ?? 0x1a1a1a,
      cornerRadius: config.cornerRadius ?? 8,
      borderColor: config.borderColor ?? 0x555555,
      borderWidth: config.borderWidth ?? 1,
    };

    this.bg = new Graphics();
    this.addChild(this.bg);
    this.drawState('idle');

    if (this.config.label) {
      this.labelText = new Text({
        text: this.config.label,
        style: {
          fontFamily: this.config.fontFamily,
          fontSize: this.config.fontSize,
          fill: this.config.textColor,
          fontWeight: 'bold',
        },
      });
      this.labelText.anchor.set(0.5);
      this.labelText.x = this.config.width / 2;
      this.labelText.y = this.config.height / 2;
      this.addChild(this.labelText);
    }

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
    this.on('pointerupoutside', this.onPointerUpOutside, this);
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
  }

  private drawState(state: 'idle' | 'hover' | 'pressed' | 'disabled'): void {
    const { width, height, cornerRadius, borderColor, borderWidth } = this.config;
    let bgColor: number;

    switch (state) {
      case 'hover':
        bgColor = this.config.bgColorHover;
        break;
      case 'pressed':
        bgColor = this.config.bgColorPressed;
        break;
      case 'disabled':
        bgColor = this.config.bgColorDisabled;
        break;
      default:
        bgColor = this.config.bgColor;
    }

    this.bg.clear();
    if (borderWidth > 0) {
      this.bg.roundRect(0, 0, width, height, cornerRadius);
      this.bg.fill(bgColor);
      this.bg.stroke({ width: borderWidth, color: borderColor });
    } else {
      this.bg.roundRect(0, 0, width, height, cornerRadius);
      this.bg.fill(bgColor);
    }
  }

  onClick(cb: () => void): this {
    this.onClickCb = cb;
    return this;
  }

  setLabel(text: string): void {
    if (this.labelText) {
      this.labelText.text = text;
    }
  }

  set enabled(value: boolean) {
    this._enabled = value;
    this.eventMode = value ? 'static' : 'none';
    this.cursor = value ? 'pointer' : 'default';
    this.alpha = value ? 1 : 0.5;
    this.drawState(value ? 'idle' : 'disabled');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  private onPointerDown(): void {
    if (!this._enabled) return;
    this._pressed = true;
    this.drawState('pressed');
    this.scale.set(0.95);
  }

  private onPointerUp(): void {
    if (!this._enabled) return;
    if (this._pressed) {
      this._pressed = false;
      this.drawState('hover');
      this.scale.set(1);
      this.onClickCb?.();
    }
  }

  private onPointerUpOutside(): void {
    this._pressed = false;
    this.drawState('idle');
    this.scale.set(1);
  }

  private onPointerOver(): void {
    if (!this._enabled) return;
    this.drawState('hover');
  }

  private onPointerOut(): void {
    if (!this._enabled) return;
    this._pressed = false;
    this.drawState('idle');
    this.scale.set(1);
  }
}
