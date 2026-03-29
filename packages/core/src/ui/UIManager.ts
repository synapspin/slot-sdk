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
    const reelArea = this.config.layout.reelArea;
    const safe = viewport.safeArea;

    // Bottom bar — sits at bottom of design but respects safe area bottom inset
    const barY = Math.min(
      this.config.layout.designHeight - barHeight,
      safe.y + safe.height - barHeight,
    );
    this.bottomBar.y = barY;
    this.bottomBar.layoutMode(mode, this.config.layout.designWidth, barHeight);

    // Ensure bottom bar controls are within safe area horizontally
    this.bottomBar.setSafeMargins(safe.x, this.config.layout.designWidth - safe.x - safe.width);

    if (mode === 'desktop') {
      // Side spin button — right of reels but within safe area
      this.sideSpinButton.visible = true;
      const spinX = reelArea.x + reelArea.width + 35 + 80;
      const maxX = safe.x + safe.width - 70; // 70px from safe right edge
      this.sideSpinButton.x = Math.min(spinX, maxX);
      this.sideSpinButton.y = reelArea.y + reelArea.height / 2;
      this.bottomBar.spinButton.visible = false;
    } else {
      // Mobile: hide side button, show in bottom bar
      this.sideSpinButton.visible = false;
      this.bottomBar.spinButton.visible = true;
    }
  }
}
