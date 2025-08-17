declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { start_param?: string } & Record<string, unknown>;
        ready?: () => void;
      };
    };
  }
}
export {}
