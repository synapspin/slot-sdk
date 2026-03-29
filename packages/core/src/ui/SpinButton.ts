import { Container, Graphics, Text } from 'pixi.js';
import type { EventBus } from '../events/EventBus';

export type SpinButtonState = 'idle' | 'spinning' | 'stopping' | 'disabled' | 'autoplay';

export class SpinButton extends Container {
  private bg: Graphics;
  private icon: Graphics;
  private labelText: Text;
  private _state: SpinButtonState = 'idle';
  private eventBus: EventBus;
  private radius: number;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Hold-to-quick-spin: fires when button is held down */
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private _holding = false;
  private static HOLD_THRESHOLD = 300; // ms before hold triggers quick spin

  constructor(radius: number, eventBus: EventBus, listenKeyboard: boolean = false) {
    super();
    this.radius = radius;
    this.eventBus = eventBus;

    this.bg = new Graphics();
    this.icon = new Graphics();
    this.labelText = new Text({
      text: '',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.labelText.anchor.set(0.5);

    this.addChild(this.bg);
    this.addChild(this.icon);
    this.addChild(this.labelText);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Pointer events — support hold
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
    this.on('pointerupoutside', this.onPointerUp, this);
    this.on('pointerover', () => {
      if (this._state === 'idle') this.bg.alpha = 0.85;
    });
    this.on('pointerout', () => {
      this.bg.alpha = 1;
    });

    if (listenKeyboard) {
      this.enableKeyboard();
    }

    this.drawState('idle');
  }

  enableKeyboard(): void {
    if (this.keyDownHandler) return;

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) {
          this.onPointerDown();
        }
      }
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.onPointerUp();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  disableKeyboard(): void {
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }
  }

  private drawState(state: SpinButtonState): void {
    const r = this.radius;
    this.bg.clear();
    this.icon.clear();
    this.labelText.text = '';

    let color: number;
    switch (state) {
      case 'spinning':
        color = 0xcc3333;
        break;
      case 'autoplay':
        color = 0xcc8800;
        break;
      case 'disabled':
        color = 0x333333;
        break;
      default:
        color = 0x22aa44;
    }

    // Outer glow
    this.bg.circle(0, 0, r + 5);
    this.bg.fill({ color, alpha: 0.2 });

    // Main circle
    this.bg.circle(0, 0, r);
    this.bg.fill(color);

    // Inner highlight ring
    this.bg.circle(0, 0, r - 5);
    this.bg.stroke({ width: 2.5, color: 0xffffff, alpha: 0.25 });

    // Top gloss
    this.bg.ellipse(0, -r * 0.3, r * 0.6, r * 0.25);
    this.bg.fill({ color: 0xffffff, alpha: 0.12 });

    // Icon
    if (state === 'idle') {
      // Play triangle
      const s = r * 0.35;
      this.icon.moveTo(-s * 0.55, -s);
      this.icon.lineTo(s * 0.9, 0);
      this.icon.lineTo(-s * 0.55, s);
      this.icon.closePath();
      this.icon.fill(0xffffff);
    } else if (state === 'spinning' || state === 'stopping') {
      // Stop square
      const s = r * 0.25;
      this.icon.roundRect(-s, -s, s * 2, s * 2, 3);
      this.icon.fill(0xffffff);
    } else if (state === 'autoplay') {
      this.labelText.text = 'AUTO';
      this.labelText.style.fontSize = r * 0.3;
    }
  }

  private onPointerDown(): void {
    if (this._state === 'disabled') return;

    // Press visual feedback
    this.scale.set(0.93);

    // Start hold timer — if held long enough, enable quick spin
    this._holding = false;
    this.holdTimer = setTimeout(() => {
      this._holding = true;
      // Enable turbo while holding
      this.eventBus.emit('ui:turboSpinToggled', { enabled: true });
    }, SpinButton.HOLD_THRESHOLD);

    // Immediate action
    this.fireAction();
  }

  private onPointerUp(): void {
    this.scale.set(1);

    // Clear hold timer
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }

    // If was holding, disable turbo
    if (this._holding) {
      this._holding = false;
      this.eventBus.emit('ui:turboSpinToggled', { enabled: false });
    }
  }

  private fireAction(): void {
    switch (this._state) {
      case 'idle':
        this.eventBus.emit('ui:spinButtonPressed', undefined as never);
        break;
      case 'spinning':
        this.eventBus.emit('ui:stopButtonPressed', undefined as never);
        break;
      case 'autoplay':
        this.eventBus.emit('ui:autoPlayStopped', undefined as never);
        break;
    }
  }

  set state(value: SpinButtonState) {
    this._state = value;
    this.drawState(value);
    this.eventMode = value === 'disabled' ? 'none' : 'static';
    this.cursor = value === 'disabled' ? 'default' : 'pointer';
    this.alpha = value === 'disabled' ? 0.5 : 1;
  }

  get state(): SpinButtonState {
    return this._state;
  }

  destroy(): void {
    this.disableKeyboard();
    if (this.holdTimer) clearTimeout(this.holdTimer);
    super.destroy();
  }
}
