const LUXISOFT_WHATSAPP_NUMBER = "19295636472";

export const LUXISOFT_QUOTE_EMAIL = "quote@luxisoft.com";

export function getLuxisoftWhatsAppLink(message: string) {
  return `https://wa.me/${LUXISOFT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

