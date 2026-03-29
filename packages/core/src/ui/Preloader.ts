export interface PreloaderConfig {
  brandText: string;
  tagline?: string;
  bgColor: string;
  brandColor: string;
  accentColor: string;
  fontFamily: string;
  /** Minimum time to show the preloader (ms) */
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
 * HTML-based preloader overlay.
 * Sits on top of the canvas as a simple div, removed when done.
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

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 1000;
      background: ${this.config.bgColor};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: ${this.config.fontFamily};
      transition: opacity 0.5s ease-out;
    `;

    // Brand letters with staggered pop-in
    const brandRow = document.createElement('div');
    brandRow.style.cssText = 'display: flex; gap: 4px; margin-bottom: 12px;';
    this.config.brandText.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = `
        font-size: 72px; font-weight: 900; color: ${this.config.brandColor};
        opacity: 0; transform: translateY(30px) scale(0.5);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: inline-block;
      `;
      setTimeout(() => {
        span.style.opacity = '1';
        span.style.transform = 'translateY(0) scale(1)';
      }, 150 + i * 100);
      brandRow.appendChild(span);
    });
    this.overlay.appendChild(brandRow);

    // Tagline
    if (this.config.tagline) {
      const tag = document.createElement('div');
      tag.textContent = this.config.tagline;
      tag.style.cssText = `
        font-size: 16px; letter-spacing: 8px; font-weight: 300;
        color: ${this.config.brandColor}; opacity: 0;
        transition: opacity 0.6s ease-out 0.8s; margin-bottom: 40px;
      `;
      setTimeout(() => { tag.style.opacity = '0.8'; }, 100);
      this.overlay.appendChild(tag);
    }

    // Progress bar
    const barWrap = document.createElement('div');
    barWrap.style.cssText = `width:260px;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);margin-bottom:8px;`;
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `width:0%;height:100%;border-radius:2px;background:${this.config.accentColor};transition:width 0.3s ease-out;`;
    barWrap.appendChild(this.progressBar);
    this.overlay.appendChild(barWrap);

    this.percentText = document.createElement('div');
    this.percentText.textContent = '0%';
    this.percentText.style.cssText = 'font-size:12px;color:#666;';
    this.overlay.appendChild(this.percentText);

    const orig = container.style.position;
    if (!orig || orig === 'static') container.style.position = 'relative';
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

  /** Fade out and remove. Call AFTER the scene underneath is fully built. */
  async finish(): Promise<void> {
    this.progress = 1;

    // Honour minimum display time
    const remaining = this.config.minDisplayTime - (performance.now() - this.startTime);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

    // Fade out
    this.overlay.style.opacity = '0';
    await new Promise((r) => setTimeout(r, 550));
    this.overlay.remove();
  }
}
