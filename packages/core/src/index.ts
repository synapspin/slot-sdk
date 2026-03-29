// App
export { GameApp } from './app/GameApp';
export type { GameConfig, LayoutConfig, UIConfig, InfoPageConfig, AssetBundleConfig, BuyBonusOption } from './app/GameConfig';
export { ResponsiveManager } from './app/ResponsiveManager';
export type { LayoutMode, LayoutTarget, ViewportInfo, SafeAreaInsets } from './app/ResponsiveManager';
export { loadRuntimeConfig } from './app/GameConfigLoader';
export type { RuntimeConfig } from './app/GameConfigLoader';

// State Machine
export { StateMachine } from './state/StateMachine';
export type { GameContext, AutoPlayConfig, StateTransition } from './state/StateMachine';
export { GameStateMachine } from './state/GameStateMachine';
export type { IState } from './state/IState';
export { IdleState } from './state/states/IdleState';
export { SpinRequestState } from './state/states/SpinRequestState';
export { SpinningState } from './state/states/SpinningState';
export { EvaluateState } from './state/states/EvaluateState';
export { WinPresentationState } from './state/states/WinPresentationState';
export { FeatureCheckState } from './state/states/FeatureCheckState';

// Events
export { EventBus } from './events/EventBus';
export type { GameEventMap } from './events/GameEvents';

// Reels
export { ReelSet } from './reels/ReelSet';
export { Reel } from './reels/Reel';
export { SlotSymbol } from './reels/Symbol';
export type { ReelSetConfig } from './reels/ReelConfig';
export type { IReelAnimation } from './reels/animations/IReelAnimation';
export { ReelPhase } from './reels/animations/IReelAnimation';
export { StandardSpinAnimation } from './reels/animations/StandardSpinAnimation';
export type { StandardSpinConfig } from './reels/animations/StandardSpinAnimation';

// Symbols
export { SymbolRegistry } from './symbols/SymbolRegistry';
export type { SymbolDefinition, SymbolType, WildConfig, PaytableEntry, PaylineDefinition } from './symbols/SymbolDefinition';

// Wins
export { WinPresenter } from './wins/WinPresenter';
export type { WinPresentationConfig } from './wins/WinPresenter';
export { WinLine } from './wins/WinLine';
export { BigWinCelebration } from './wins/BigWinCelebration';
export type { BigWinTier, BigWinConfig } from './wins/BigWinCelebration';

// Features
export type { IFeaturePlugin, FeatureContext } from './features/IFeaturePlugin';
export { FeatureRegistry } from './features/FeatureRegistry';
export { FreeSpinsFeature } from './features/free-spins/FreeSpinsFeature';
export type { FreeSpinsConfig } from './features/free-spins/FreeSpinsFeature';
export { HoldAndWinFeature } from './features/hold-and-win/HoldAndWinFeature';
export type { HoldAndWinConfig } from './features/hold-and-win/HoldAndWinFeature';
export { CascadeFeature } from './features/cascade/CascadeFeature';
export type { CascadeConfig } from './features/cascade/CascadeFeature';
export { CollectFeature } from './features/collect/CollectFeature';
export type { CollectConfig } from './features/collect/CollectFeature';
export { BuyBonusFeature } from './features/buy-bonus/BuyBonusFeature';
export { AnteBetFeature } from './features/ante-bet/AnteBetFeature';
export type { AnteBetConfig } from './features/ante-bet/AnteBetFeature';
export { GiftSpinsFeature } from './features/gift-spins/GiftSpinsFeature';

// UI
export { UIManager } from './ui/UIManager';
export { BottomBar } from './ui/BottomBar';
export { SpinButton } from './ui/SpinButton';
export type { SpinButtonState } from './ui/SpinButton';
export { BetSelector } from './ui/BetSelector';
export { AutoPlayPanel } from './ui/AutoPlayPanel';
export { SettingsPanel } from './ui/SettingsPanel';
export { InfoMenu } from './ui/InfoMenu';
export { HistoryPanel } from './ui/HistoryPanel';
export { Preloader } from './ui/Preloader';
export type { PreloaderConfig } from './ui/Preloader';
export { Button } from './ui/components/Button';
export type { ButtonConfig } from './ui/components/Button';
export { Label } from './ui/components/Label';
export type { LabelConfig } from './ui/components/Label';
export { Modal } from './ui/components/Modal';
export type { ModalConfig } from './ui/components/Modal';
export { ToggleSwitch } from './ui/components/ToggleSwitch';
export type { ToggleSwitchConfig } from './ui/components/ToggleSwitch';

// Sound
export { SoundManager } from './sound/SoundManager';
export type { SoundConfig } from './sound/SoundConfig';

// Server
export type { IServerAdapter } from './server/IServerAdapter';
export type {
  InitRequest, InitResponse, SpinRequest, SpinResponse,
  BuyBonusRequest, WinResult, FeatureResult, StickySymbol,
  CascadeStep, GiftSpinsOffer,
} from './server/ServerMessage';
export { MockServerAdapter } from './server/MockServerAdapter';
export type { MockServerConfig } from './server/MockServerAdapter';

// Assets
export { AssetLoader } from './assets/AssetLoader';

// Math
export { formatCurrency, formatNumber } from './math/Currency';

// Utils
export { TweenManager, Easing } from './utils/Tween';
export type { EasingFunction } from './utils/Tween';
export { Pool } from './utils/Pool';
export { Logger, LogLevel } from './utils/Logger';
export { Telemetry } from './utils/Telemetry';
export type { TelemetryConfig, TelemetryEvent } from './utils/Telemetry';
export { DevTools } from './utils/DevTools';

// Replay
export { RoundRecorder } from './replay/RoundRecorder';
export type { RoundRecord } from './replay/RoundRecorder';
export { ReplayServerAdapter } from './replay/ReplayPlayer';

// FX
export { CoinShower } from './fx/CoinShower';
export type { CoinShowerConfig } from './fx/CoinShower';
