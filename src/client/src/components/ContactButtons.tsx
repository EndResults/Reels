import React, { useEffect, useState } from 'react';
import { ChatBubbleBottomCenterTextIcon, ChatBubbleOvalLeftIcon, PhoneIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

const ENV = import.meta.env;
const phone = (ENV.VITE_CONTACT_PHONE as string) || '+31852129806';
const phoneDisplay = (ENV.VITE_CONTACT_PHONE_DISPLAY as string) || '+31 85 212 9806';
const whatsappUrl = (ENV.VITE_CONTACT_WHATSAPP_URL as string) ||
  'https://api.whatsapp.com/send?phone=31852129806&text=Hoi%20EndResults,%20ik%20heb%20een%20vraag%20over%20FiT%20by%20BrendR.io';

/**
 * Globale contactknoppen rechtsonder: Chat, WhatsApp, Bel
 * - Chat opent de embedded Brendr-chat via window.BrendrChat.open()
 * - WhatsApp opent nieuwe tab met vooringevulde tekst
 * - Bel start belactie op mobiel via tel:
 * 
 * UI-kenmerken:
 * - Klein, verfijnd, vergelijkbaar met privacyvoorkeuren knop
 * - Subtiele shadow, ring en hover-scale
 * - Icons in gevraagde kleuren
 * - Verbergt zichzelf in iframes en op zeer kleine viewports (< 480px)
 */
export default function ContactButtons() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState<boolean>(true);

  useEffect(() => {
    const evaluate = () => {
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      const tinyViewport = typeof window !== 'undefined' && (window.innerWidth < 320 || window.innerHeight < 360);
      // Toon altijd buiten iframes (ook mobiel). In iframes alleen verbergen als het iframe echt klein is.
      setVisible(!inIframe || !tinyViewport);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  // Default: uitgeklapt op desktop (md+), ingeklapt op mobiel
  useEffect(() => {
    const sync = () => {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768; // md
      setExpanded(isDesktop);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  if (!visible) return null;

  const openChat = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      (window as any).BrendrChat?.open?.();
    } catch (_) {}
  };

  const baseBtn =
    'group relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white ring-1 ring-black/10 shadow-md hover:shadow-lg transition-transform hover:scale-105 flex items-center justify-center';

  const tooltip =
    'pointer-events-none select-none absolute -top-9 right-0 bg-black text-white text-[10px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 transition-opacity md:group-hover:opacity-100';

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[2147483603] flex flex-row items-end gap-2">
      {/* Actieknoppen: verborgen op mobiel als niet expanded */}
      <div id="contact-actions" className={(expanded ? 'flex' : 'hidden') + ' flex-row items-end gap-2'}>
        {/* Chat knop (oranje) */}
        <a
          href="#chat"
          onClick={openChat}
          className={baseBtn}
          aria-label={t('contactButtons.chat', 'Chat met ons')}
          title={t('contactButtons.chat', 'Chat met ons')}
        >
          <ChatBubbleBottomCenterTextIcon className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#f97316' }} />
          <span className={tooltip}>{t('contactButtons.chat', 'Chat met ons')}</span>
        </a>

        {/* WhatsApp knop (groen) */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={baseBtn}
          aria-label={t('contactButtons.whatsapp', 'WhatsApp ons')}
          title={t('contactButtons.whatsapp', 'WhatsApp ons')}
        >
          <ChatBubbleOvalLeftIcon className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#22c55e' }} />
          <span className={tooltip}>{t('contactButtons.whatsapp', 'WhatsApp ons')}</span>
        </a>

        {/* Bel-knop (donker slate) */}
        <a
          href={`tel:${phone}`}
          className={baseBtn}
          aria-label={`${t('contactButtons.call', 'Bel ons')}: ${phoneDisplay}`}
          title={`${t('contactButtons.call', 'Bel ons')}: ${phoneDisplay}`}
        >
          <PhoneIcon className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#0f172a' }} />
          <span className={tooltip}>{t('contactButtons.call', 'Bel ons')}</span>
        </a>
      </div>

      {/* Toggle-knop (alleen tonen op mobiel). Ingeklapt uiterlijk: #0f172a, chat-bubble icoon. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="contact-actions"
        className="md:hidden w-10 h-10 rounded-full bg-[#0f172a] text-white ring-1 ring-black/10 shadow-md hover:shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        title={expanded ? t('common.close', 'Sluiten') : t('contactButtons.chat', 'Chat met ons')}
        aria-label={expanded ? t('common.close', 'Sluiten') : t('contactButtons.chat', 'Chat met ons')}
      >
        <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
