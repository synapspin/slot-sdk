import { Logger } from '../utils/Logger';

/** Runtime game config loaded from external JSON */
export interface RuntimeConfig {
  game: {
    id: string;
    name: string;
    version: string;
  };

  rtp?: number;
  volatility?: string;
  maxWin?: number;

  bet: {
    levels: number[];
    default: number;
    currency: string;
  };

  bigWin?: {
    thresholds?: { big?: number; mega?: number; epic?: number };
    durations?: { big?: number; mega?: number; epic?: number };
  };

  autoPlay?: {
    presets?: number[];
    maxSpins?: number;
    stopOnFeature?: boolean;
  };

  anteBet?: {
    enabled?: boolean;
    multiplier?: number;
    description?: string;
  };

  buyBonus?: Array<{
    id: string;
    label: string;
    costMultiplier: number;
    featureType: string;
  }>;

  features?: Record<string, unknown>;

  preloader?: {
    brandText?: string;
    tagline?: string;
    bgColor?: string;
    brandColor?: string;
    accentColor?: string;
    minDisplayTime?: number;
  };

  server?: {
    type: 'mock' | 'remote';
    url?: string;
    initialBalance?: number;
    rtp?: number;
  };

  /** Any game-specific custom fields */
  [key: string]: unknown;
}

const logger = new Logger('ConfigLoader');

/**
 * Load runtime config from external JSON file.
 * This is the standard way providers configure games — a single JSON
 * that the operator/platform can override per deployment.
 */
export async function loadRuntimeConfig(url: string = '/config.json'): Promise<RuntimeConfig> {
  logger.info(`Loading config from ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const config = await response.json() as RuntimeConfig;
    logger.info(`Config loaded: ${config.game.name} v${config.game.version}`);
    return config;
  } catch (err) {
    logger.error('Failed to load config:', err);
    throw new Error(`Failed to load game config from ${url}: ${err}`);
  }
}
