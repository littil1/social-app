export {};

declare global {
  interface Window {
    __APP_PAUSE_AUTO_REFRESH__?: boolean;
  }
}