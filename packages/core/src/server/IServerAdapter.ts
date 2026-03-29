import type {
  InitRequest,
  InitResponse,
  SpinRequest,
  SpinResponse,
  BuyBonusRequest,
  GiftSpinsOffer,
} from './ServerMessage';

export interface IServerAdapter {
  /** Initialize game session */
  init(request: InitRequest): Promise<InitResponse>;

  /** Execute a spin */
  spin(request: SpinRequest): Promise<SpinResponse>;

  /** Buy bonus directly */
  buyBonus(request: BuyBonusRequest): Promise<SpinResponse>;

  /** Accept gift spins offer */
  acceptGiftSpins?(offer: GiftSpinsOffer): Promise<SpinResponse>;

  /** Notify server of round completion (for session tracking) */
  roundComplete?(): Promise<void>;
}
