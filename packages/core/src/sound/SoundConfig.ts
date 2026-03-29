export interface SoundConfig {
  /** Map of sound key -> file path or array of paths (for variants) */
  sounds: Record<string, string | string[]>;
  /** Default volume 0-1 */
  defaultVolume?: number;
  /** Background music key */
  musicKey?: string;
  /** Music volume 0-1 */
  musicVolume?: number;
}
