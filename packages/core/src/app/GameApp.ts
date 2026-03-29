import { Application, Container } from 'pixi.js';
import type { GameConfig } from './GameConfig';
import { ResponsiveManager } from './ResponsiveManager';
import type { LayoutTarget, ViewportInfo, LayoutMode } from './ResponsiveManager';
import { EventBus } from '../events/EventBus';
import { ReelSet } from '../reels/ReelSet';
import { SymbolRegistry } from '../symbols/SymbolRegistry';
import { SoundManager } from '../sound/SoundManager';
import { AssetLoader } from '../assets/AssetLoader';
import { UIManager } from '../ui/UIManager';
import { Preloader } from '../ui/Preloader';
import type { PreloaderConfig } from '../ui/Preloader';
import { GameStateMachine } from '../state/GameStateMachine';
import { FeatureRegistry } from '../features/FeatureRegistry';
import { TweenManager } from '../utils/Tween';
import type { GameContext, AutoPlayConfig } from '../state/StateMachine';
import type { SpinResponse, InitResponse } from '../server/ServerMessage';
import { Logger } from '../utils/Logger';

export class GameApp implements LayoutTarget {
  public app!: Application;
  public eventBus: EventBus;
  public reelSet!: ReelSet;
  public symbolRegistry!: SymbolRegistry;
  public soundManager!: SoundManager;
  public uiManager!: UIManager;
  public stateMachine!: GameStateMachine;
  public featureRegistry!: FeatureRegistry;
  public responsiveManager!: ResponsiveManager;

  private config: GameConfig;
  private gameContainer!: Container;
  private reelLayer!: Container;
  private uiLayer!: Container;
  private fxLayer!: Container;
  private logger = new Logger('GameApp');

  // Game state
  private _balance = 0;
  private _currentBet = 0;
  private _betLevels: number[] = [];
  private _currency = 'USD';
  private _anteBetEnabled = false;
  private _quickSpinEnabled = false;
  private _turboSpinEnabled = false;
  private _autoPlayRemaining = 0;
  private _autoPlayConfig: AutoPlayConfig | null = null;
  private _lastResponse: SpinResponse | null = null;
  private _totalWin = 0;
  private _featureState: Record<string, unknown> = {};

  /** Game-level layout callback — called on every resize/orientation change.
   *  Use this to reposition decorative elements (background, frame, characters). */
  private _onLayout: ((viewport: ViewportInfo, mode: LayoutMode) => void) | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.eventBus = new EventBus();
  }

  async boot(container: HTMLElement): Promise<void> {
    this.logger.info(`Booting game: ${this.config.name} v${this.config.version}`);

    // Initialize PixiJS Application
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      backgroundColor: this.config.backgroundColor ?? 0x000000,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    container.appendChild(this.app.canvas);

    // Initialize tween system
    TweenManager.init(this.app.ticker);

    // Create layer hierarchy (hidden until preloader finishes)
    this.gameContainer = new Container();
    this.reelLayer = new Container();
    this.uiLayer = new Container();
    this.fxLayer = new Container();
    this.gameContainer.visible = false;

    this.app.stage.addChild(this.gameContainer);
    this.gameContainer.addChild(this.reelLayer);
    this.gameContainer.addChild(this.fxLayer);
    this.gameContainer.addChild(this.uiLayer);

    // Show preloader on top of everything
    const preloader = new Preloader(this.app, this.config.preloader);
    this.app.stage.addChild(preloader);

    // Load assets with progress reporting to preloader
    if (this.config.assetBundles.length > 0) {
      await AssetLoader.init(this.config.assetBundles);
      const preloadBundle = this.config.assetBundles.find((b) => b.name === 'preload');
      if (preloadBundle) {
        await AssetLoader.loadBundle('preload', (p) => {
          preloader.progress = p * 0.3; // preload = 0-30%
        });
      }
      // Load main game bundle
      const gameBundle = this.config.assetBundles.find((b) => b.name === 'game');
      if (gameBundle) {
        await AssetLoader.loadBundle('game', (p) => {
          preloader.progress = 0.3 + p * 0.6; // game = 30-90%
        });
      }
    }
    preloader.progress = 0.95;

    // Initialize symbol registry
    this.symbolRegistry = new SymbolRegistry(this.config.symbols);
    this.symbolRegistry.resolveTextures();

    // Initialize sound
    this.soundManager = new SoundManager(this.config.sounds, this.eventBus);

    // Initialize reels
    this.reelSet = new ReelSet(this.config.reels, this.symbolRegistry, this.eventBus);
    this.reelLayer.addChild(this.reelSet);

    // Position reels according to layout
    const reelArea = this.config.layout.reelArea;
    this.reelSet.x = reelArea.x + (reelArea.width - this.reelSet.totalWidth) / 2;
    this.reelSet.y = reelArea.y + (reelArea.height - this.reelSet.totalHeight) / 2;

    // Initialize UI
    this.uiManager = new UIManager(this.config, this.eventBus, this.uiLayer);

    // Initialize features
    this.featureRegistry = new FeatureRegistry(this.eventBus);

    // Initialize state machine
    this.stateMachine = new GameStateMachine(this.createContext());

    // Register feature plugins
    for (const plugin of this.config.features) {
      this.featureRegistry.register(plugin, {
        eventBus: this.eventBus,
        stage: this.fxLayer,
        reelSet: this.reelSet,
        uiManager: this.uiManager,
        soundManager: this.soundManager,
        config: this.config,
      });
    }

    // Inject plugin states into FSM
    this.featureRegistry.injectStates(this.stateMachine);

    // Setup responsive manager
    this.responsiveManager = new ResponsiveManager(
      this.app,
      this.gameContainer,
      this.config.layout,
      this.eventBus,
    );

    // Register self and UI as layout targets
    this.responsiveManager.register(this);
    this.responsiveManager.register(this.uiManager);

    // Setup event listeners
    this.setupEventListeners();

    // Initialize game from server
    await this.initFromServer();

    // Start ticker update
    this.app.ticker.add(() => {
      const delta = this.app.ticker.deltaMS;
      this.reelSet.update(delta);
      this.stateMachine.update(delta);
    });

    // Show game behind preloader, then fade out preloader
    this.gameContainer.visible = true;
    preloader.progress = 1;
    await preloader.finish();

    this.eventBus.emit('game:ready', undefined as never);
    this.logger.info('Game ready');
  }

  private async initFromServer(): Promise<void> {
    try {
      const response: InitResponse = await this.config.server.init({
        gameId: this.config.id,
      });

      this._balance = response.balance;
      this._betLevels = response.betLevels;
      this._currentBet = response.defaultBet;
      this._currency = response.currency;

      // Set initial reels to random symbols
      const initialGrid: number[][] = [];
      const allIds = this.config.symbols.map((s) => s.id);
      for (let col = 0; col < this.config.reels.cols; col++) {
        const rows = this.config.reels.rowsPerCol?.[col] ?? this.config.reels.rows;
        initialGrid.push(
          Array.from({ length: rows }, () => allIds[Math.floor(Math.random() * allIds.length)]),
        );
      }
      this.reelSet.setInitialSymbols(initialGrid);

      // Update UI
      this.uiManager.updateBalance(this._balance, this._currency);
      this.uiManager.updateBet(this._currentBet, this._currency);
      this.uiManager.setBetLevels(this._betLevels);

      // Handle restored state
      if (response.restoredState) {
        this._lastResponse = response.restoredState;
        this.reelSet.setInitialSymbols(response.restoredState.reelResult);
      }

      // Handle gift spins
      if (response.giftSpins) {
        this.eventBus.emit('giftSpins:received', {
          spins: response.giftSpins.spins,
          bet: response.giftSpins.bet,
        });
      }

      // Start idle state
      await this.stateMachine.start();

      this.logger.info(`Init: balance=${this._balance}, bet=${this._currentBet}, currency=${this._currency}`);
    } catch (err) {
      this.logger.error('Failed to init from server:', err);
      this.eventBus.emit('error', {
        code: 'INIT_FAILED',
        message: 'Failed to initialize game',
      });
    }
  }

  private setupEventListeners(): void {
    this.eventBus.on('bet:changed', ({ bet }) => {
      this._currentBet = bet;
    });

    this.eventBus.on('balance:updated', ({ balance }) => {
      this._balance = balance;
      this.uiManager.updateBalance(balance, this._currency);
    });

    this.eventBus.on('ui:quickSpinToggled', ({ enabled }) => {
      this._quickSpinEnabled = enabled;
    });

    this.eventBus.on('ui:turboSpinToggled', ({ enabled }) => {
      this._turboSpinEnabled = enabled;
    });

    this.eventBus.on('ui:anteBetToggled', ({ enabled }) => {
      this._anteBetEnabled = enabled;
    });

    // Focus/blur handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.eventBus.emit('focus:lost', undefined as never);
      } else {
        this.eventBus.emit('focus:gained', undefined as never);
      }
    });
  }

  createContext(): GameContext {
    const self = this;
    return {
      get eventBus() { return self.eventBus; },
      get reelSet() { return self.reelSet; },
      get uiManager() { return self.uiManager; },
      get soundManager() { return self.soundManager; },
      get server() { return self.config.server; },
      get balance() { return self._balance; },
      set balance(v: number) { self._balance = v; },
      get currentBet() { return self._currentBet; },
      set currentBet(v: number) { self._currentBet = v; },
      get betLevels() { return self._betLevels; },
      get currency() { return self._currency; },
      get anteBetEnabled() { return self._anteBetEnabled; },
      set anteBetEnabled(v: boolean) { self._anteBetEnabled = v; },
      get anteBetMultiplier() { return self.config.anteBetMultiplier ?? 1.25; },
      get lastResponse() { return self._lastResponse; },
      set lastResponse(v: SpinResponse | null) { self._lastResponse = v; },
      get totalWin() { return self._totalWin; },
      set totalWin(v: number) { self._totalWin = v; },
      get quickSpinEnabled() { return self._quickSpinEnabled; },
      get turboSpinEnabled() { return self._turboSpinEnabled; },
      get autoPlayRemaining() { return self._autoPlayRemaining; },
      set autoPlayRemaining(v: number) { self._autoPlayRemaining = v; },
      get autoPlayConfig() { return self._autoPlayConfig; },
      set autoPlayConfig(v: AutoPlayConfig | null) { self._autoPlayConfig = v; },
      get featureState() { return self._featureState; },
      set featureState(v: Record<string, unknown>) { self._featureState = v; },
      transitionTo: (stateId: string) => self.stateMachine.transitionTo(stateId),
    };
  }

  /** Access game layers for custom content */
  get layers() {
    return {
      game: this.gameContainer,
      reels: this.reelLayer,
      ui: this.uiLayer,
      fx: this.fxLayer,
    };
  }

  /** Register a callback for layout changes (orientation, resize).
   *  Use this in main.ts to reposition decorative elements. */
  set onLayout(cb: (viewport: ViewportInfo, mode: LayoutMode) => void) {
    this._onLayout = cb;
  }

  /** LayoutTarget implementation — repositions reels on resize/orientation change */
  layout(viewport: ViewportInfo, mode: LayoutMode): void {
    const reelArea = viewport.reelArea;

    // Reposition reels to match current orientation's reel area
    this.reelSet.x = reelArea.x + (reelArea.width - this.reelSet.totalWidth) / 2;
    this.reelSet.y = reelArea.y + (reelArea.height - this.reelSet.totalHeight) / 2;

    // Scale reels if portrait reel area is smaller/larger than designed symbol size
    const reelFitScale = Math.min(
      reelArea.width / this.reelSet.totalWidth,
      reelArea.height / this.reelSet.totalHeight,
    );
    if (Math.abs(reelFitScale - 1) > 0.01) {
      this.reelSet.scale.set(reelFitScale);
      // Re-center after scaling
      const scaledW = this.reelSet.totalWidth * reelFitScale;
      const scaledH = this.reelSet.totalHeight * reelFitScale;
      this.reelSet.x = reelArea.x + (reelArea.width - scaledW) / 2;
      this.reelSet.y = reelArea.y + (reelArea.height - scaledH) / 2;
    } else {
      this.reelSet.scale.set(1);
    }

    // Call game-level layout callback
    this._onLayout?.(viewport, mode);
  }

  destroy(): void {
    this.eventBus.emit('game:destroyed', undefined as never);
    this.soundManager.destroy();
    TweenManager.killAll();
    this.eventBus.removeAll();
    this.app.destroy(true);
  }
}
