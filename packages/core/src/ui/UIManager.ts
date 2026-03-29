import { Container } from 'pixi.js';
import type { GameConfig } from '../app/GameConfig';
import type { EventBus } from '../events/EventBus';
import { BottomBar } from './BottomBar';
import { SpinButton } from './SpinButton';
import { AutoPlayPanel } from './AutoPlayPanel';
import { SettingsPanel } from './SettingsPanel';
import { InfoMenu } from './InfoMenu';
import { formatCurrency } from '../math/Currency';
import type { SpinButtonState } from './SpinButton';
import type { LayoutTarget, ViewportInfo, LayoutMode } from '../app/ResponsiveManager';
import { Logger } from '../utils/Logger';

export class UIManager implements LayoutTarget {
  private config: GameConfig;
  private eventBus: EventBus;
  private layer: Container;
  private logger = new Logger('UIManager');

  readonly bottomBar: BottomBar;
  /** Large spin button positioned to the right of reels (landscape) */
  readonly sideSpinButton: SpinButton;
  readonly autoPlayPanel: AutoPlayPanel;
  readonly settingsPanel: SettingsPanel;
  readonly infoMenu: InfoMenu;

  constructor(config: GameConfig, eventBus: EventBus, layer: Container) {
    this.config = config;
    this.eventBus = eventBus;
    this.layer = layer;

    const designWidth = config.layout.designWidth;
    const barHeight = config.ui.bottomBarHeight ?? 70;

    // Bottom bar
    this.bottomBar = new BottomBar(designWidth, barHeight, eventBus);
    this.bottomBar.y = config.layout.designHeight - barHeight;
    this.layer.addChild(this.bottomBar);

    // Large side spin button — right of reels, with keyboard support
    const reelArea = config.layout.reelArea;
    const spinRadius = 65;
    this.sideSpinButton = new SpinButton(spinRadius, eventBus, true);
    this.sideSpinButton.x = reelArea.x + reelArea.width + 35 + 80;
    this.sideSpinButton.y = reelArea.y + reelArea.height / 2;
    this.layer.addChild(this.sideSpinButton);

    // Auto play panel
    this.autoPlayPanel = new AutoPlayPanel(
      eventBus,
      config.autoPlayPresets ?? [10, 25, 50, 100, 250, 500],
    );
    this.layer.addChild(this.autoPlayPanel);

    // Settings panel
    this.settingsPanel = new SettingsPanel(eventBus);
    this.layer.addChild(this.settingsPanel);

    // Info menu
    this.infoMenu = new InfoMenu(config.ui.infoPages ?? []);
    this.layer.addChild(this.infoMenu);

    // Wire menu button
    this.bottomBar.onMenu(() => this.openMenu());
    this.bottomBar.onAutoPlay(() => this.autoPlayPanel.open());

    this.setupListeners();
  }

  private setupListeners(): void {
    this.eventBus.on('ui:autoPlayStarted', ({ spins }) => {
      this.setSpinState('autoplay');
      this.logger.info(`Auto play started: ${spins} spins`);
    });

    this.eventBus.on('ui:autoPlayStopped', () => {
      this.setSpinState('idle');
    });

    this.eventBus.on('win:countUp', ({ current }) => {
      this.bottomBar.updateWin(current, this.config.id);
    });
  }

  openMenu(): void {
    this.infoMenu.open();
    this.eventBus.emit('ui:menuOpened', undefined as never);
  }

  openSettings(): void {
    this.settingsPanel.open();
  }

  updateBalance(amount: number, currency: string): void {
    this.bottomBar.updateBalance(amount, currency);
  }

  updateBet(amount: number, currency: string): void {
    this.bottomBar.updateBet(amount, currency);
  }

  updateWin(amount: number, currency: string): void {
    this.bottomBar.updateWin(amount, currency);
  }

  setBetLevels(levels: number[]): void {
    this.bottomBar.setBetLevels(levels, 'USD');
  }

  setSpinState(state: SpinButtonState): void {
    this.sideSpinButton.state = state;
    this.bottomBar.setSpinState(state);
  }

  /** Lock/unlock controls during spin */
  setInteractive(enabled: boolean): void {
    this.bottomBar.setInteractive(enabled);
  }

  /**
   * Layout callback — positions all UI within the safe area.
   * Background/reels can bleed outside safe area, but interactive elements stay inside.
   */
  layout(viewport: ViewportInfo, mode: LayoutMode): void {
    const barHeight = this.config.ui.bottomBarHeight ?? 70;
    const reelArea = viewport.reelArea;
    const safe = viewport.safeArea;
    const dw = viewport.designWidth;
    const dh = viewport.designHeight;

    // Bottom bar — at bottom of current design, within safe area
    const barY = Math.min(dh - barHeight, safe.y + safe.height - barHeight);
    this.bottomBar.y = barY;
    this.bottomBar.layoutMode(mode, dw, barHeight);
    this.bottomBar.setSafeMargins(safe.x, dw - safe.x - safe.width);

    if (mode === 'desktop') {
      // Landscape: side spin button right of reels
      this.sideSpinButton.visible = true;
      const spinX = reelArea.x + reelArea.width + 35 + 80;
      const maxX = safe.x + safe.width - 70;
      this.sideSpinButton.x = Math.min(spinX, maxX);
      this.sideSpinButton.y = reelArea.y + reelArea.height / 2;
      this.bottomBar.spinButton.visible = false;
    } else {
      // Portrait: large spin button centered below reels
      this.sideSpinButton.visible = true;
      this.sideSpinButton.x = dw / 2;
      // Place spin button between bottom of reel area and bottom bar
      const reelBottom = reelArea.y + reelArea.height + 50;
      this.sideSpinButton.y = reelBottom + (barY - reelBottom) / 2;
      this.bottomBar.spinButton.visible = false;
    }
  }
}
