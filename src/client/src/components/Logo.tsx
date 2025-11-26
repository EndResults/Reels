import React from 'react';

interface LogoProps {
  className?: string;
  title?: string;
  variant?: 'light' | 'dark'; // light = for light backgrounds, dark = for dark backgrounds
}

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const VITE_SUPABASE_ASSETS_BASE = import.meta.env.VITE_SUPABASE_ASSETS_BASE as string | undefined;
const ASSETS_BASE = VITE_SUPABASE_ASSETS_BASE || (VITE_SUPABASE_URL ? `${VITE_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public` : '');
if (!ASSETS_BASE) { throw new Error('[Assets] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ASSETS_BASE'); }
const LOGO_LIGHT = `${ASSETS_BASE}/logos/main_site.svg`; // Black text for light backgrounds
const LOGO_DARK = `${ASSETS_BASE}/logos/main_site_black.svg`; // White text for dark backgrounds

const Logo: React.FC<LogoProps> = ({ 
  className = 'h-8 w-auto', 
  title = 'FiT by BrendR',
  variant = 'light' // Default to light variant (black text)
}) => {
  const logoSrc = variant === 'dark' ? LOGO_DARK : LOGO_LIGHT;
  
  return (
    <img
      src={logoSrc}
      alt={title}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
};

export default Logo;
