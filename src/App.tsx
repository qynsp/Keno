import React, { useEffect, useState } from 'react';
import { getSocket } from './lib/socket';
import { getTelegramData, initTelegramWebApp, triggerHaptic, isTelegramWebAppAvailable } from './lib/telegram';
import { KenoRound, KenoTicket, UserProfile, PayoutTier, GameSettings, Announcement } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/Tabs/HomeTab';
import { HistoryTab } from './components/Tabs/HistoryTab';
import { WalletTab } from './components/Tabs/WalletTab';
import { LeaderboardTab } from './components/Tabs/LeaderboardTab';
import { ReferralTab } from './components/Tabs/ReferralTab';
import { ProfileTab } from './components/Tabs/ProfileTab';
import { AnnouncementsTab } from './components/Tabs/AnnouncementsTab';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminLoginPage } from './components/Admin/AdminLoginPage';
import { WinCelebration } from './components/WinCelebration';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertCircle, RefreshCw, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('keno_jwt'));
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [ticketBuyError, setTicketBuyError] = useState<string | null>(null);

  // Helper to normalize tickets from server responses/sockets
  const normalizeTicket = (t: any): KenoTicket => {
    if (!t) return t;
    const selected = Array.isArray(t.selectedNumbers)
      ? t.selectedNumbers
      : (typeof t.selectedNumbers === 'string' ? JSON.parse(t.selectedNumbers) : []);
    const matched = Array.isArray(t.matchedNumbers) ? t.matchedNumbers : [];
    return {
      ...t,
      selectedNumbers: selected,
      matchedNumbers: matched,
      matchedCount: t.matchedCount ?? matched.length,
      payout: t.payout ?? t.winAmount ?? 0,
      winAmount: t.winAmount ?? t.payout ?? 0,
    };
  };

  // Initialize active tab from URL path (e.g., /admin)
  const initialTab = typeof window !== 'undefined' && window.location.pathname === '/admin' ? 'admin' : 'home';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'admin') {
        if (window.location.pathname !== '/admin') {
          window.history.pushState({}, '', '/admin');
        }
      } else {
        if (window.location.pathname === '/admin') {
          window.history.pushState({}, '', '/');
        }
      }
    }
  };

  // Game Engine state
  const [round, setRound] = useState<KenoRound | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [drawnSoFar, setDrawnSoFar] = useState<number[]>([]);
  const [myTickets, setMyTickets] = useState<KenoTicket[]>([]);
  const [payoutTables, setPayoutTables] = useState<PayoutTier[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<GameSettings>({
    roundDurationSeconds: 60,
    drawSpeedMs: 1000,
    resultDurationSeconds: 15,
    minStake: 5,
    maxStake: 1000,
    maintenanceMode: false,
    paused: false,
    houseMarginPercent: 5.0,
  });

  // Win celebration popup state
  const [winModalData, setWinModalData] = useState<{
    hitCount: number;
    pickCount: number;
    multiplier: number;
    payout: number;
    roundNumber: number;
  } | null>(null);

  // Initialize Telegram & Authenticate
  useEffect(() => {
    initTelegramWebApp();
    authenticateUser();

    // Listen for browser navigation (e.g., /admin)
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('home');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const joinSocketRoom = (u: UserProfile) => {
    const socket = getSocket();
    socket.emit('join_game', {
      telegramId: u.telegramId,
      username: u.username,
    });
  };

  const authenticateUser = async () => {
    setAuthLoading(true);
    setAuthError(null);

    const tgData = getTelegramData();

    // Log complete debugging information as specified in requirements
    console.log('[Telegram Auth Audit] App init debug params:', {
      isTelegramAvailable: tgData.isAvailable,
      initDataPresent: Boolean(tgData.initData),
      initDataLength: tgData.initData.length,
      telegramUserId: tgData.user?.telegramId || 'None',
      username: tgData.user?.username || 'None',
      firstName: tgData.user?.firstName || 'None',
    });

    try {
      // 1. Session token validation if available
      const existingToken = localStorage.getItem('keno_jwt');
      if (existingToken) {
        try {
          const profileRes = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${existingToken}` },
          });
          if (profileRes.ok) {
            const restoredUser: UserProfile = await profileRes.json();
            // Verify restored user matches current Telegram user if inside Telegram
            if (!tgData.user || restoredUser.telegramId === tgData.user.telegramId) {
              setUser(restoredUser);
              setToken(existingToken);
              joinSocketRoom(restoredUser);
              fetchUserTickets(existingToken);
              setAuthLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('[Session Restore Warning] Stale token, re-authenticating...');
          localStorage.removeItem('keno_jwt');
        }
      }

      // 2. If running outside Telegram Mini App without user data, fallback to demo user directly
      if (!tgData.user) {
        console.log('[Telegram Auth] Running outside Telegram Mini App, authenticating default player...');
        await createFallbackDemoUser();
        setAuthLoading(false);
        return;
      }

      // 3. Prepare payload for Telegram auth endpoint
      const authPayload = {
        initData: tgData.initData,
        telegramId: tgData.user.telegramId,
        username: tgData.user.username,
        firstName: tgData.user.firstName,
        lastName: tgData.user.lastName,
        photoUrl: tgData.user.photoUrl,
      };

      console.log('[Auth Payload Debug] Sending to /api/auth/telegram:', {
        initDataLength: authPayload.initData.length,
        telegramId: authPayload.telegramId,
        username: authPayload.username,
      });

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('keno_jwt', data.token);

        joinSocketRoom(data.user);
        fetchUserTickets(data.token);
        setAuthError(null);
      } else {
        const errorMsg = data?.error || `Server authentication failed (HTTP ${res.status})`;
        console.error('[Telegram Auth Error]', errorMsg);

        if (tgData.isAvailable || tgData.user) {
          // Inside Telegram: Display error banner instead of silent guest fallback
          setAuthError(errorMsg);
        } else {
          // Standard web browser preview fallback
          await createFallbackDemoUser();
        }
      }
    } catch (e: any) {
      console.error('[Telegram Auth Network Exception]', e);
      if (tgData.isAvailable || tgData.user) {
        setAuthError('Connection error: Unable to reach Casino Keno servers.');
      } else {
        await createFallbackDemoUser();
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const createFallbackDemoUser = async () => {
    try {
      const demoPayload = {
        telegramId: '888888',
        username: 'lucky_keno_player',
        firstName: 'Lucky',
        lastName: 'Player',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      };
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('keno_jwt', data.token);
        joinSocketRoom(data.user);
      }
    } catch (e) {
      console.error('Failed to initialize demo player profile:', e);
    }
  };

  const fetchUserTickets = async (authToken?: string) => {
    const jwt = authToken || token || localStorage.getItem('keno_jwt');
    if (!jwt) return;
    try {
      const res = await fetch('/api/user/tickets', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const rawTickets: any[] = await res.json();
        const map = new Map<string, KenoTicket>();
        rawTickets.forEach((raw) => {
          const t = normalizeTicket(raw);
          map.set(t.id, t);
        });
        setMyTickets(Array.from(map.values()));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserProfil = async () => {
    const jwt = token || localStorage.getItem('keno_jwt');
    if (!jwt) return;
    try {
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Socket Event Subscriptions
  useEffect(() => {
    const socket = getSocket();

    // Initial state request
    socket.emit('get_current_state', (state) => {
      setRound(state.round);
      if (state.settings) setSettings(state.settings);
      if (state.drawnSoFar && state.drawnSoFar.length > 0) {
        setDrawnSoFar(state.drawnSoFar);
      } else if (state.round?.drawnNumbers && state.round.drawnNumbers.length > 0) {
        setDrawnSoFar(state.round.drawnNumbers);
      }
      if (state.userBalance !== undefined && user) {
        setUser((prev) => (prev ? { ...prev, balance: state.userBalance! } : null));
      }
    });

    // Payout tables & announcements fetch
    fetch('/api/payouts')
      .then((res) => res.json())
      .then(setPayoutTables)
      .catch(console.error);

    fetch('/api/announcements')
      .then((res) => res.json())
      .then(setAnnouncements)
      .catch(console.error);

    // Socket Event Listeners
    socket.on('round_started', (newRound) => {
      setRound(newRound);
      setDrawnSoFar([]);
      setRemainingSeconds(settings.roundDurationSeconds || 60);
    });

    socket.on('draw_started', () => {
      setRound((prev) => (prev ? { ...prev, status: 'DRAWING' } : null));
      setDrawnSoFar([]);
    });

    socket.on('timer_update', (data) => {
      setRemainingSeconds(data.remainingSeconds);
      setRound((prev) => (prev ? { ...prev, status: data.status } : null));
    });

    socket.on('number_drawn', (data) => {
      setRound((prev) => (prev ? { ...prev, status: 'DRAWING' } : null));
      setDrawnSoFar(data.drawnSoFar);
    });

    socket.on('draw_finished', (data) => {
      setRound((prev) => (prev ? { ...prev, status: 'RESULT', drawnNumbers: data.drawnNumbers } : null));
      setDrawnSoFar(data.drawnNumbers);
    });

    socket.on('round_finished', () => {
      // Refresh user balance & tickets history after round finishes
      fetchUserProfil();
      fetchUserTickets();
    });

    socket.on('balance_updated', (data) => {
      if (user && data.userId === user.id) {
        setUser((prev) => (prev ? { ...prev, balance: data.balance } : null));
      }
    });

    socket.on('ticket_created', (ticket) => {
      if (user && ticket.userId === user.id) {
        const norm = normalizeTicket(ticket);
        setMyTickets((prev) => {
          if (prev.some((t) => t.id === norm.id)) {
            return prev.map((t) => (t.id === norm.id ? norm : t));
          }
          return [norm, ...prev];
        });
      }
    });

    return () => {
      socket.off('round_started');
      socket.off('draw_started');
      socket.off('timer_update');
      socket.off('number_drawn');
      socket.off('draw_finished');
      socket.off('round_finished');
      socket.off('balance_updated');
      socket.off('ticket_created');
    };
  }, [user?.id]);

  // Handle Ticket Purchase via socket
  const handleBuyTicket = (selectedNumbers: number[], stake: number): Promise<boolean> => {
    setTicketBuyError(null);
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit('buy_ticket', { selectedNumbers, stake }, (res) => {
        if (res.success && res.ticket) {
          const norm = normalizeTicket(res.ticket);
          setMyTickets((prev) => {
            if (prev.some((t) => t.id === norm.id)) {
              return prev.map((t) => (t.id === norm.id ? norm : t));
            }
            return [norm, ...prev];
          });
          if (res.balance !== undefined && user) {
            setUser((prev) => (prev ? { ...prev, balance: res.balance! } : null));
          }
          triggerHaptic('success');
          resolve(true);
        } else {
          const err = res.error || 'Failed to buy ticket';
          triggerHaptic('error');
          setTicketBuyError(err);
          setTimeout(() => setTicketBuyError(null), 6000);
          resolve(false);
        }
      });
    });
  };

  // Switch role between USER and ADMIN for live preview testing
  const handleSwitchRole = async (targetRole: 'USER' | 'ADMIN') => {
    const targetUsername = targetRole === 'ADMIN' ? 'admin' : user?.username || 'lucky_keno_player';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('keno_jwt', data.token);
        fetchUserTickets(data.token);
        if (targetRole === 'ADMIN') {
          setActiveTab('admin');
        } else {
          setActiveTab('home');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Admin Logout
  const handleAdminLogout = async () => {
    localStorage.removeItem('keno_jwt');
    setToken(null);
    await authenticateUser();
    handleSelectTab('home');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-yellow-500 selection:text-gray-950 antialiased">
      {/* Header with Balance & Telegram User Info */}
      <Header
        user={user}
        announcements={announcements}
        onOpenDeposit={() => handleSelectTab('wallet')}
        onSelectTab={handleSelectTab}
        activeTab={activeTab}
      />

      {/* Main View Area */}
      <main className="max-w-md mx-auto px-3 pt-3">
        {authError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-3 text-center space-y-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Telegram Authorization Notice</span>
            </div>
            <p className="text-[11px] text-gray-300">{authError}</p>
            <button
              type="button"
              onClick={() => authenticateUser()}
              className="mt-1 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {ticketBuyError && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-3 flex items-center justify-between text-xs text-red-300 shadow-xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{ticketBuyError}</span>
            </div>
            <button
              type="button"
              onClick={() => setTicketBuyError(null)}
              className="text-red-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <ErrorBoundary>
          {activeTab === 'home' && (
            <HomeTab
              round={round}
              remainingSeconds={remainingSeconds}
              drawnSoFar={drawnSoFar}
              user={user}
              myTickets={myTickets}
              payoutTables={payoutTables}
              settings={settings}
              onBuyTicket={handleBuyTicket}
            />
          )}

          {activeTab === 'history' && <HistoryTab />}

          {activeTab === 'wallet' && (
            <WalletTab user={user} onRefreshUser={fetchUserProfil} />
          )}

          {activeTab === 'leaderboard' && <LeaderboardTab />}

          {activeTab === 'referral' && <ReferralTab user={user} />}

          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              onSelectTab={handleSelectTab}
              onSwitchRole={handleSwitchRole}
            />
          )}

          {activeTab === 'announcements' && <AnnouncementsTab />}

          {activeTab === 'admin' && (
            user && user.role?.toUpperCase() === 'ADMIN' ? (
              <AdminDashboard onLogout={handleAdminLogout} />
            ) : (
              <AdminLoginPage
                onLoginSuccess={(loggedUser, jwtToken) => {
                  setUser(loggedUser);
                  setToken(jwtToken);
                  handleSelectTab('admin');
                }}
                onBackToGame={() => handleSelectTab('home')}
              />
            )
          )}
        </ErrorBoundary>
      </main>

      {/* Mobile Telegram Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Win Celebration Popup Modal */}
      <WinCelebration
        isOpen={winModalData !== null}
        onClose={() => setWinModalData(null)}
        winData={winModalData}
      />
    </div>
  );
}
