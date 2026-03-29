import { Container, Text, type TextStyleOptions } from 'pixi.js';

export interface LabelConfig {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: number;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export class Label extends Container {
  private textObj: Text;
  private config: LabelConfig;

  constructor(config: LabelConfig = {}) {
    super();
    this.config = config;

    const style: TextStyleOptions = {
      fontFamily: config.fontFamily ?? 'Roboto, Arial, sans-serif',
      fontSize: config.fontSize ?? 16,
      fill: config.color ?? 0xffffff,
      fontWeight: (config.fontWeight as 'normal' | 'bold') ?? 'normal',
      align: config.align ?? 'center',
    };

    this.textObj = new Text({
      text: config.text ?? '',
      style,
    });

    if (config.align === 'center' || config.align === undefined) {
      this.textObj.anchor.set(0.5, 0.5);
    } else if (config.align === 'right') {
      this.textObj.anchor.set(1, 0.5);
    } else {
      this.textObj.anchor.set(0, 0.5);
    }

    this.addChild(this.textObj);
  }

  get text(): string {
    return this.textObj.text;
  }

  set text(value: string) {
    this.textObj.text = value;
  }

  setColor(color: number): void {
    this.textObj.style.fill = color;
  }

  setFontSize(size: number): void {
    this.textObj.style.fontSize = size;
  }
}
