import type { ReelSetConfig } from '../reels/ReelConfig';
import type { SymbolDefinition, PaytableEntry, PaylineDefinition } from '../symbols/SymbolDefinition';
import type { SoundConfig } from '../sound/SoundConfig';
import type { IServerAdapter } from '../server/IServerAdapter';
import type { IFeaturePlugin } from '../features/IFeaturePlugin';
import type { PreloaderConfig } from '../ui/Preloader';

export interface GameConfig {
  /** Unique game identifier */
  id: string;
  /** Display name */
  name: string;
  /** Game version */
  version: string;
  /** Canvas background color */
  backgroundColor?: number;

  /** Layout and responsive settings */
  layout: LayoutConfig;
  /** Reel configuration */
  reels: ReelSetConfig;
  /** Symbol definitions */
  symbols: SymbolDefinition[];
  /** Paytable entries */
  paytable: PaytableEntry[];
  /** Payline definitions (if line-based game) */
  paylines?: PaylineDefinition[];
  /** Sound configuration */
  sounds: SoundConfig;
  /** UI theme settings */
  ui: UIConfig;
  /** Feature plugins to activate */
  features: IFeaturePlugin[];
  /** Server adapter */
  server: IServerAdapter;
  /** Asset manifest bundles */
  assetBundles: AssetBundleConfig[];

  /** Preloader/splash screen config */
  preloader?: Partial<PreloaderConfig>;
  /** Ante bet multiplier (e.g. 1.25) */
  anteBetMultiplier?: number;
  /** Buy bonus options */
  buyBonusOptions?: BuyBonusOption[];
  /** Auto play presets */
  autoPlayPresets?: number[];
}

export interface LayoutConfig {
  /** Design width in pixels (landscape) */
  designWidth: number;
  /** Design height in pixels (landscape) */
  designHeight: number;
  /** Safe area within design */
  safeArea?: { x: number; y: number; width: number; height: number };
  /** Supported orientations */
  orientation: 'landscape' | 'portrait' | 'both';
  /** Reel area position/size within design (landscape) */
  reelArea: { x: number; y: number; width: number; height: number };

  /** Portrait mode overrides — if not set, auto-calculated from landscape */
  portrait?: {
    /** Design dimensions for portrait (default: swap landscape w/h) */
    designWidth?: number;
    designHeight?: number;
    /** Reel area in portrait coordinates */
    reelArea?: { x: number; y: number; width: number; height: number };
    /** Safe area for portrait */
    safeArea?: { x: number; y: number; width: number; height: number };
  };
}

export interface UIConfig {
  /** Font family for all text */
  fontFamily: string;
  /** Primary color for buttons/accents */
  primaryColor: number;
  /** Background color for UI panels */
  panelColor: number;
  /** Text color */
  textColor: number;
  /** Win text color */
  winColor: number;
  /** Spin button textures */
  spinButtonTextures?: {
    idle: string;
    hover: string;
    pressed: string;
    disabled: string;
    stop: string;
  };
  /** Custom bottom bar height */
  bottomBarHeight?: number;
  /** Info/rules pages content */
  infoPages?: InfoPageConfig[];
}

export interface InfoPageConfig {
  title: string;
  /** Content type: image texture key or html string */
  type: 'image' | 'text';
  content: string;
}

export interface AssetBundleConfig {
  name: string;
  assets: { alias: string; src: string }[];
}

export interface BuyBonusOption {
  id: string;
  label: string;
  /** Cost multiplier relative to current bet */
  costMultiplier: number;
  /** Feature type triggered */
  featureType: string;
}
