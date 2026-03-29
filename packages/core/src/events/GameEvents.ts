import type { SpinResponse, WinResult, FeatureResult } from '../server/ServerMessage';

export interface GameEventMap {
  // Core flow
  'spin:requested': { bet: number; anteBet: boolean };
  'spin:responseReceived': SpinResponse;
  'spin:completed': void;

  // Reels
  'reels:startSpin': void;
  'reels:stopped': { grid: number[][] };
  'reel:stopped': { reelIndex: number };
  'reels:anticipation': { reelIndex: number };
  'reels:quickStop': void;

  // Wins
  'win:evaluated': { wins: WinResult[]; totalWin: number };
  'win:linePresented': { win: WinResult };
  'win:presentationComplete': void;
  'win:big': { tier: 'big' | 'mega' | 'epic'; amount: number };
  'win:countUp': { current: number; total: number };

  // Balance
  'balance:updated': { balance: number };
  'bet:changed': { bet: number };

  // Features
  'feature:triggered': FeatureResult;
  'feature:spinComplete': { remainingSpins: number; totalWin: number };
  'feature:ended': { type: string; totalWin: number };

  // UI
  'ui:spinButtonPressed': void;
  'ui:stopButtonPressed': void;
  'ui:autoPlayStarted': { spins: number; lossLimit?: number; winLimit?: number; stopOnFeature?: boolean };
  'ui:autoPlayStopped': void;
  'ui:autoPlaySpinDone': { remaining: number };
  'ui:menuOpened': void;
  'ui:menuClosed': void;
  'ui:quickSpinToggled': { enabled: boolean };
  'ui:turboSpinToggled': { enabled: boolean };
  'ui:soundToggled': { enabled: boolean };
  'ui:buyBonusRequested': { cost: number };
  'ui:anteBetToggled': { enabled: boolean };

  // State
  'state:changed': { from: string; to: string };
  'state:entered': { state: string };
  'state:exited': { state: string };

  // Gift Spins
  'giftSpins:received': { spins: number; bet: number };
  'giftSpins:started': { remaining: number };
  'giftSpins:ended': { totalWin: number };

  // System
  'error': { code: string; message: string };
  'focus:lost': void;
  'focus:gained': void;
  'game:ready': void;
  'game:destroyed': void;
}
