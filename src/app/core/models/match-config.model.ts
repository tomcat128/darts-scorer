export type CheckoutMode = 'normal' | 'double' | 'master';
export type CheckinMode = 'normal' | 'double' | 'master';

export interface X01Config {
  mode: 'x01';
  startingScore: number;
  checkoutMode: CheckoutMode;
  checkinMode: CheckinMode;
}

export interface CricketConfig {
  mode: 'cricket';
}

export interface AtcConfig {
  mode: 'atc';
}

export type GameModeConfig = X01Config | CricketConfig | AtcConfig;

/** Both derived from "best of M" setup inputs: Math.floor(M / 2) + 1. Use setsToWinMatch=1 for "no sets". */
export interface MatchFormat {
  legsToWinSet: number;
  setsToWinMatch: number;
}
