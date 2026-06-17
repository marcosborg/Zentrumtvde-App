import { Capacitor, registerPlugin } from '@capacitor/core';

type WhatsappBusinessPlugin = {
  open(options: { phone: string; text: string }): Promise<{ opened: boolean }>;
};

export const WhatsappBusiness = registerPlugin<WhatsappBusinessPlugin>('WhatsappBusiness');

export function isWhatsappBusinessSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
