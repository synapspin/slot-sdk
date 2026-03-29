import { Container, Graphics, Text } from 'pixi.js';

export interface ToggleSwitchConfig {
  width?: number;
  height?: number;
  label?: string;
  fontFamily?: string;
  fontSize?: number;
  onColor?: number;
  offColor?: number;
  defaultValue?: boolean;
}

export class ToggleSwitch extends Container {
  private track: Graphics;
  private thumb: Graphics;
  private labelText: Text | null = null;
  private _value: boolean;
  private onChangeCb: ((value: boolean) => void) | null = null;
  private trackWidth: number;
  private trackHeight: number;

  constructor(config: ToggleSwitchConfig = {}) {
    super();
    this.trackWidth = config.width ?? 50;
    this.trackHeight = config.height ?? 26;
    this._value = config.defaultValue ?? false;

    const onColor = config.onColor ?? 0x4caf50;
    const offColor = config.offColor ?? 0x666666;

    // Label
    if (config.label) {
      this.labelText = new Text({
        text: config.label,
        style: {
          fontFamily: config.fontFamily ?? 'Roboto, Arial, sans-serif',
          fontSize: config.fontSize ?? 16,
          fill: 0xcccccc,
        },
      });
      this.labelText.anchor.set(0, 0.5);
      this.labelText.x = this.trackWidth + 10;
      this.labelText.y = this.trackHeight / 2;
      this.addChild(this.labelText);
    }

    // Track
    this.track = new Graphics();
    this.addChild(this.track);

    // Thumb
    this.thumb = new Graphics();
    this.addChild(this.thumb);

    this.draw();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
      this._value = !this._value;
      this.draw();
      this.onChangeCb?.(this._value);
    });
  }

  private draw(): void {
    const r = this.trackHeight / 2;
    const thumbR = r - 3;

    this.track.clear();
    this.track.roundRect(0, 0, this.trackWidth, this.trackHeight, r);
    this.track.fill(this._value ? 0x4caf50 : 0x666666);

    this.thumb.clear();
    this.thumb.circle(0, 0, thumbR);
    this.thumb.fill(0xffffff);
    this.thumb.x = this._value ? this.trackWidth - r : r;
    this.thumb.y = r;
  }

  onChange(cb: (value: boolean) => void): this {
    this.onChangeCb = cb;
    return this;
  }

  get value(): boolean {
    return this._value;
  }

  set value(v: boolean) {
    this._value = v;
    this.draw();
  }
}
