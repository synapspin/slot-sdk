export interface PreloaderConfig {
  /** Brand text to animate (e.g. "LAB9191") */
  brandText: string;
  /** Tagline below brand */
  tagline?: string;
  /** Background color */
  bgColor: string;
  /** Brand text color */
  brandColor: string;
  /** Accent color for progress bar */
  accentColor: string;
  /** Font family */
  fontFamily: string;
  /** Minimum display time (ms) */
  minDisplayTime: number;
}

const DEFAULT_CONFIG: PreloaderConfig = {
  brandText: 'LAB9191',
  tagline: 'G A M E S',
  bgColor: '#0a0a14',
  brandColor: '#ffffff',
  accentColor: '#22cc66',
  fontFamily: 'Roboto, Arial, sans-serif',
  minDisplayTime: 2500,
};

/**
 * HTML-based preloader overlay — renders OVER the canvas element.
 * Does not interfere with PixiJS rendering pipeline.
 */
export class Preloader {
  private config: PreloaderConfig;
  private overlay: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private percentText: HTMLDivElement;
  private _progress = 0;
  private startTime: number;

  constructor(container: HTMLElement, config?: Partial<PreloaderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = performance.now();

    // Create overlay div
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 1000;
      background: ${this.config.bgColor};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: ${this.config.fontFamily};
      transition: opacity 0.4s ease-out;
      overflow: hidden;
    `;

    // Brand letters
    const brandRow = document.createElement('div');
    brandRow.style.cssText = 'display: flex; gap: 4px; margin-bottom: 12px;';

    const chars = this.config.brandText.split('');
    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = `
        font-size: 72px; font-weight: 900;
        color: ${this.config.brandColor};
        opacity: 0; transform: translateY(30px) scale(0.5);
        transition: opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: inline-block;
      `;
      // Stagger animation
      setTimeout(() => {
        span.style.opacity = '1';
        span.style.transform = 'translateY(0) scale(1)';
      }, 150 + i * 100);
      brandRow.appendChild(span);
    });
    this.overlay.appendChild(brandRow);

    // Tagline
    if (this.config.tagline) {
      const tagline = document.createElement('div');
      tagline.textContent = this.config.tagline;
      tagline.style.cssText = `
        font-size: 16px; letter-spacing: 8px; font-weight: 300;
        color: ${this.config.brandColor}; opacity: 0;
        transition: opacity 0.6s ease-out 0.8s;
        margin-bottom: 40px;
      `;
      setTimeout(() => { tagline.style.opacity = '0.8'; }, 100);
      this.overlay.appendChild(tagline);
    }

    // Progress bar container
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      width: 260px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.12); overflow: hidden;
      margin-bottom: 8px;
    `;

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 0%; height: 100%; border-radius: 2px;
      background: ${this.config.accentColor};
      transition: width 0.3s ease-out;
    `;
    barContainer.appendChild(this.progressBar);
    this.overlay.appendChild(barContainer);

    // Percent text
    this.percentText = document.createElement('div');
    this.percentText.textContent = '0%';
    this.percentText.style.cssText = `
      font-size: 12px; color: #666;
    `;
    this.overlay.appendChild(this.percentText);

    // Make container relative for absolute positioning
    const origPosition = container.style.position;
    if (!origPosition || origPosition === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(this.overlay);
  }

  set progress(value: number) {
    this._progress = Math.max(0, Math.min(1, value));
    this.progressBar.style.width = `${this._progress * 100}%`;
    this.percentText.textContent = `${Math.round(this._progress * 100)}%`;
  }

  get progress(): number {
    return this._progress;
  }

  /** Wait for minimum display time, then fade out and remove */
  async finish(): Promise<void> {
    this._progress = 1;
    this.progressBar.style.width = '100%';
    this.percentText.textContent = '100%';

    // Ensure minimum display time
    const elapsed = performance.now() - this.startTime;
    const remaining = this.config.minDisplayTime - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }

    // Fade out
    this.overlay.style.opacity = '0';
    await new Promise((r) => setTimeout(r, 450));

    // Remove from DOM
    this.overlay.remove();
  }
}
