// Helper for Telegram Mini App WebApp SDK integration
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
            is_premium?: boolean;
          };
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        platform?: string;
        version?: string;
        expand: () => void;
        close: () => void;
        ready: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export interface TelegramAuthPayload {
  initData: string;
  telegramId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  referralCode?: string;
}

/**
  Checks if Telegram WebApp SDK is available or Telegram launch parameters exist in URL
 */
export function isTelegramWebAppAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (window.Telegram?.WebApp?.initData || window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return true;
  }

  // Check URL query or hash params for Telegram Mini App signatures
  const search = window.location.search;
  const hash = window.location.hash;
  if (search.includes('tgWebAppData') || hash.includes('tgWebAppData') || search.includes('tgWebAppVersion') || hash.includes('tgWebAppVersion')) {
    return true;
  }

  return false;
}

/**
  Extracts raw initData string and parsed user object from Telegram WebApp
 */
export function getTelegramData(): {
  isAvailable: boolean;
  initData: string;
  user: {
    telegramId: string;
    username: string;
    firstName: string;
    lastName: string;
    photoUrl: string;
  } | null;
} {
  if (typeof window === 'undefined') {
    return { isAvailable: false, initData: '', user: null };
  }

  let initData = window.Telegram?.WebApp?.initData || '';
  let tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  // Fallback: Check hash or search params if initData wasn't attached directly to WebApp object
  if (!initData) {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const searchParams = new URLSearchParams(window.location.search);
    
    const rawTgData = hashParams.get('tgWebAppData') || searchParams.get('tgWebAppData') || hashParams.get('initData') || searchParams.get('initData');
    if (rawTgData) {
      initData = rawTgData;
    }
  }

  // If initData is present but initDataUnsafe.user is missing, attempt to parse user from initData query string
  if (initData && !tgUser) {
    try {
      const params = new URLSearchParams(initData);
      const userJson = params.get('user');
      if (userJson) {
        tgUser = JSON.parse(userJson);
      }
    } catch (err) {
      console.warn('[Telegram SDK] Failed to parse user JSON from initData string:', err);
    }
  }

  const isAvailable = Boolean(initData || tgUser || isTelegramWebAppAvailable());

  let user = null;
  if (tgUser) {
    user = {
      telegramId: String(tgUser.id),
      username: tgUser.username || `user_${tgUser.id}`,
      firstName: tgUser.first_name || 'Telegram User',
      lastName: tgUser.last_name || '',
      photoUrl: tgUser.photo_url || '',
    };
  }

  // Console debugging logs as requested in audit specification
  console.log('[Telegram Auth Audit Debug]', {
    isAvailable,
    initDataPresent: Boolean(initData),
    initDataLength: initData.length,
    telegramUserId: user?.telegramId || 'None',
    username: user?.username || 'None',
    firstName: user?.firstName || 'None',
    lastName: user?.lastName || 'None',
    hasPhoto: Boolean(user?.photoUrl),
    platform: window.Telegram?.WebApp?.platform || 'browser',
    version: window.Telegram?.WebApp?.version || 'unknown'
  });

  return {
    isAvailable,
    initData,
    user
  };
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  }
}

export function initTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      console.log('[Telegram SDK] WebApp expanded & ready call executed');
    } catch (e) {
      console.warn('[Telegram SDK] WebApp initialization warning:', e);
    }
  }
}

