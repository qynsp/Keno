import React, { useEffect, useState } from 'react';
import { AdminStats, GameSettings, PayoutTier, DepositRequest, WithdrawalRequest, AuditLog, PaymentSettings, Voucher, UserProfile } from '../../types';
import { triggerHaptic } from '../../lib/telegram';
import { ShieldAlert, Users, Ticket, Wallet, TrendingUp, Sliders, CheckCircle2, XCircle, Megaphone, FastForward, Save, CreditCard, Tag, Search, DollarSign, UserCheck, X, LogOut } from 'lucide-react';

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'controls' | 'payouts' | 'finance' | 'payment-settings' | 'vouchers' | 'users' | 'announcements' | 'logs'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [payouts, setPayouts] = useState<PayoutTier[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Search filter
  const [userSearch, setUserSearch] = useState('');

  // Voucher creation form
  const [vCode, setVCode] = useState('');
  const [vAmount, setVAmount] = useState<number>(50);
  const [vLimit, setVLimit] = useState<number>(100);

  // Payouts pick filter
  const [selectedPayoutPick, setSelectedPayoutPick] = useState<number | 'ALL'>('ALL');

  // User balance adjustment modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjDelta, setAdjDelta] = useState<number>(100);
  const [adjReason, setAdjReason] = useState('');

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ id: string; type: 'deposit' | 'withdrawal' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'INFO' | 'PROMO' | 'SYSTEM'>('PROMO');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchAllAdminData();
  }, [activeTab]);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('keno_jwt');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/stats', { headers });
        if (res.ok) setStats(await res.json());
      } else if (activeTab === 'controls') {
        const res = await fetch('/api/admin/settings', { headers });
        if (res.ok) setSettings(await res.json());
      } else if (activeTab === 'payouts') {
        const res = await fetch('/api/admin/payouts', { headers });
        if (res.ok) setPayouts(await res.json());
      } else if (activeTab === 'finance') {
        const [depRes, wdRes] = await Promise.all([
          fetch('/api/admin/deposits', { headers }),
          fetch('/api/admin/withdrawals', { headers }),
        ]);
        if (depRes.ok) setDeposits(await depRes.json());
        if (wdRes.ok) setWithdrawals(await wdRes.json());
      } else if (activeTab === 'payment-settings') {
        const res = await fetch('/api/admin/payment-settings', { headers });
        if (res.ok) setPaymentSettings(await res.json());
      } else if (activeTab === 'vouchers') {
        const res = await fetch('/api/admin/vouchers', { headers });
        if (res.ok) setVouchers(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsers(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/audit-logs', { headers });
        if (res.ok) setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        triggerHaptic('success');
        setMessage({ text: 'Game settings saved successfully!', type: 'success' });
      }
    } catch (e) {
      setMessage({ text: 'Failed to save settings', type: 'error' });
    }
  };

  const handleSavePaymentSettings = async () => {
    if (!paymentSettings) return;
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(paymentSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.paymentSettings) {
          setPaymentSettings(data.paymentSettings);
        }
        triggerHaptic('success');
        setMessage({ text: 'Payment settings saved to database successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to save payment settings', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'Failed to save payment settings', type: 'error' });
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCode.trim() || vAmount <= 0) return;
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: vCode, amount: vAmount, usageLimit: vLimit }),
      });
      if (res.ok) {
        triggerHaptic('success');
        setVCode('');
        setMessage({ text: 'Voucher code created!', type: 'success' });
        fetchAllAdminData();
      }
    } catch (e) {
      setMessage({ text: 'Failed to create voucher', type: 'error' });
    }
  };

  const handleToggleVoucher = async (id: string, active: boolean) => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/vouchers/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, active }),
      });
      if (res.ok) {
        triggerHaptic('success');
        fetchAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser.id, delta: adjDelta, reason: adjReason }),
      });
      if (res.ok) {
        triggerHaptic('success');
        setMessage({ text: `Balance updated for ${selectedUser.username}`, type: 'success' });
        setSelectedUser(null);
        setAdjReason('');
        fetchAllAdminData();
      }
    } catch (e) {
      setMessage({ text: 'Failed to adjust balance', type: 'error' });
    }
  };

  const handleUserRoleChange = async (userId: string, role: 'USER' | 'ADMIN') => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        triggerHaptic('success');
        fetchAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceNextRound = async () => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/force-next-round', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        triggerHaptic('success');
        setMessage({ text: 'Immediate next round triggered!', type: 'success' });
      }
    } catch (e) {
      setMessage({ text: 'Failed to force round', type: 'error' });
    }
  };

  const handleSavePayouts = async () => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payouts),
      });
      if (res.ok) {
        triggerHaptic('success');
        setMessage({ text: 'Payout tables updated!', type: 'success' });
      }
    } catch (e) {
      setMessage({ text: 'Failed to save payout tables', type: 'error' });
    }
  };

  const handleDepositAction = async (id: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, rejectionReason: reason }),
      });
      if (res.ok) {
        triggerHaptic('success');
        setRejectModal(null);
        setRejectionReason('');
        fetchAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawalAction = async (id: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/withdrawals/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, rejectionReason: reason }),
      });
      if (res.ok) {
        triggerHaptic('success');
        setRejectModal(null);
        setRejectionReason('');
        fetchAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, content: annContent, type: annType }),
      });
      if (res.ok) {
        triggerHaptic('success');
        setAnnTitle('');
        setAnnContent('');
        setMessage({ text: 'Announcement broadcasted live to all players!', type: 'success' });
      }
    } catch (e) {
      setMessage({ text: 'Failed to post announcement', type: 'error' });
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.telegramId && u.telegramId.includes(userSearch))
  );

  return (
    <div className="space-y-3 pb-20">
      {/* Header */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">ADMIN CONTROL CENTER</h2>
            <p className="text-[10px] text-gray-400 uppercase font-mono font-bold tracking-widest">
              Server Authoritative Manager
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onLogout();
            }}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        )}
      </div>

      {/* Nav Tabs */}
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-1 flex overflow-x-auto gap-1 text-xs">
        {(['overview', 'finance', 'payment-settings', 'vouchers', 'users', 'controls', 'payouts', 'announcements', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-3 rounded-xl font-bold whitespace-nowrap capitalize transition-all ${
              activeTab === tab
                ? 'bg-yellow-500 text-black font-black shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-center text-xs font-bold font-mono ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-500">Loading admin metrics...</div>
      ) : activeTab === 'overview' && stats ? (
        /* Overview Dashboard Stats */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 shadow-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-mono font-bold">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-xl font-mono font-black text-white">{stats.totalUsers}</div>
              <div className="text-[9px] font-mono text-emerald-400">{stats.onlineUsers} Active Online</div>
            </div>

            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 shadow-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-mono font-bold">
                <span>Total Bets</span>
                <Ticket className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-xl font-mono font-black text-white">{(stats.totalBets ?? 0).toLocaleString()} ETB</div>
              <div className="text-[9px] font-mono text-gray-400">{stats.activeTickets ?? 0} Active Tickets</div>
            </div>

            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 shadow-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-mono font-bold">
                <span>Total Payouts</span>
                <Wallet className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-xl font-mono font-black text-yellow-500">{(stats.totalPayouts ?? 0).toLocaleString()} ETB</div>
            </div>

            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 shadow-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-mono font-bold">
                <span>House Profit</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-mono font-black text-emerald-400">{(stats.houseProfit ?? 0).toLocaleString()} ETB</div>
            </div>
          </div>

          {/* Force Next Round trigger */}
          <button
            type="button"
            onClick={handleForceNextRound}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            <FastForward className="w-4 h-4" />
            <span>Force Immediate Next Round</span>
          </button>
        </div>
      ) : activeTab === 'controls' && settings ? (
        /* Controls & Timing Settings */
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4">
          <h3 className="font-bold text-sm text-yellow-500 flex items-center gap-2 uppercase tracking-widest text-xs">
            <Sliders className="w-4 h-4" />
            <span>Game Timing & Limits</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 font-bold mb-1">Round Betting Duration (Seconds)</label>
              <input
                type="number"
                value={settings.roundDurationSeconds}
                onChange={(e) => setSettings({ ...settings, roundDurationSeconds: Number(e.target.value) })}
                className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-bold mb-1">Draw Speed (ms per number ball)</label>
              <input
                type="number"
                min={100}
                step={50}
                value={settings.drawSpeedMs || 1000}
                onChange={(e) => setSettings({ ...settings, drawSpeedMs: Number(e.target.value) })}
                className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-500 font-mono font-bold"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Controls how fast balls are revealed (e.g. 500ms = fast, 1000ms = standard).</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Min Stake (ETB)</label>
                <input
                  type="number"
                  value={settings.minStake}
                  onChange={(e) => setSettings({ ...settings, minStake: Number(e.target.value) })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Max Stake (ETB)</label>
                <input
                  type="number"
                  value={settings.maxStake}
                  onChange={(e) => setSettings({ ...settings, maxStake: Number(e.target.value) })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">House Edge (%)</label>
                <input
                  type="number"
                  value={settings.houseEdgePercent}
                  onChange={(e) => setSettings({ ...settings, houseEdgePercent: Number(e.target.value) })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Telegram Bot Username</label>
                <input
                  type="text"
                  value={settings.botUsername}
                  onChange={(e) => setSettings({ ...settings, botUsername: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-gray-200 font-mono"
                />
              </div>
            </div>

            <div className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-200">Maintenance Mode</div>
                <div className="text-[10px] text-gray-500">Temporarily pause new bets and deposits</div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 accent-yellow-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              <Save className="w-4 h-4" />
              <span>Save Game Settings</span>
            </button>
          </div>
        </div>
      ) : activeTab === 'payouts' ? (
        /* Payout Tables Editor */
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest">Configure Multiplier Payouts</h3>
              <p className="text-[11px] text-gray-400">Set the winning multiplier for each hit count on ticket picks.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaults: PayoutTier[] = [
                    { picks: 1, hits: 1, multiplier: 3.5 },
                    { picks: 2, hits: 2, multiplier: 12 },
                    { picks: 2, hits: 1, multiplier: 1 },
                    { picks: 3, hits: 3, multiplier: 45 },
                    { picks: 3, hits: 2, multiplier: 2.5 },
                    { picks: 4, hits: 4, multiplier: 140 },
                    { picks: 4, hits: 3, multiplier: 5 },
                    { picks: 4, hits: 2, multiplier: 1 },
                    { picks: 5, hits: 5, multiplier: 500 },
                    { picks: 5, hits: 4, multiplier: 18 },
                    { picks: 5, hits: 3, multiplier: 3 },
                    { picks: 6, hits: 6, multiplier: 1600 },
                    { picks: 6, hits: 5, multiplier: 60 },
                    { picks: 6, hits: 4, multiplier: 6 },
                    { picks: 6, hits: 3, multiplier: 1 },
                    { picks: 7, hits: 7, multiplier: 5000 },
                    { picks: 7, hits: 6, multiplier: 180 },
                    { picks: 7, hits: 5, multiplier: 25 },
                    { picks: 7, hits: 4, multiplier: 3 },
                    { picks: 7, hits: 3, multiplier: 1 },
                    { picks: 8, hits: 8, multiplier: 15000 },
                    { picks: 8, hits: 7, multiplier: 500 },
                    { picks: 8, hits: 6, multiplier: 60 },
                    { picks: 8, hits: 5, multiplier: 12 },
                    { picks: 8, hits: 4, multiplier: 2 },
                    { picks: 9, hits: 9, multiplier: 35000 },
                    { picks: 9, hits: 8, multiplier: 1200 },
                    { picks: 9, hits: 7, multiplier: 120 },
                    { picks: 9, hits: 6, multiplier: 30 },
                    { picks: 9, hits: 5, multiplier: 5 },
                    { picks: 9, hits: 4, multiplier: 1 },
                    { picks: 10, hits: 10, multiplier: 100000 },
                    { picks: 10, hits: 9, multiplier: 4000 },
                    { picks: 10, hits: 8, multiplier: 500 },
                    { picks: 10, hits: 7, multiplier: 80 },
                    { picks: 10, hits: 6, multiplier: 20 },
                    { picks: 10, hits: 5, multiplier: 4 },
                    { picks: 10, hits: 0, multiplier: 2 },
                  ];
                  setPayouts(defaults);
                  setMessage({ text: 'Loaded standard default multipliers. Click "Save Changes" to apply.', type: 'success' });
                }}
                className="px-2.5 py-1.5 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-gray-300 font-bold rounded-lg text-xs border border-white/10"
              >
                Reset Standard Odds
              </button>
              <button
                type="button"
                onClick={handleSavePayouts}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg text-xs shadow-[0_0_10px_rgba(212,175,55,0.3)] flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Pick Tabs Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedPayoutPick('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedPayoutPick === 'ALL'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-[#121214] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              All Tiers ({payouts.length})
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pick) => {
              const count = payouts.filter((t) => t.picks === pick).length;
              return (
                <button
                  key={pick}
                  type="button"
                  onClick={() => setSelectedPayoutPick(pick)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedPayoutPick === pick
                      ? 'bg-yellow-500 text-black'
                      : 'bg-[#121214] text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  Pick {pick} {count > 0 && <span className="opacity-60 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-6 space-y-2 bg-[#121214] rounded-xl border border-white/5">
              <p className="text-gray-400 text-xs">No payout tiers configured yet.</p>
              <button
                type="button"
                onClick={() => {
                  const defaults: PayoutTier[] = [
                    { picks: 1, hits: 1, multiplier: 3.5 },
                    { picks: 2, hits: 2, multiplier: 12 },
                    { picks: 2, hits: 1, multiplier: 1 },
                    { picks: 3, hits: 3, multiplier: 45 },
                    { picks: 3, hits: 2, multiplier: 2.5 },
                    { picks: 4, hits: 4, multiplier: 140 },
                    { picks: 4, hits: 3, multiplier: 5 },
                    { picks: 4, hits: 2, multiplier: 1 },
                    { picks: 5, hits: 5, multiplier: 500 },
                    { picks: 5, hits: 4, multiplier: 18 },
                    { picks: 5, hits: 3, multiplier: 3 },
                    { picks: 6, hits: 6, multiplier: 1600 },
                    { picks: 6, hits: 5, multiplier: 60 },
                    { picks: 6, hits: 4, multiplier: 6 },
                    { picks: 6, hits: 3, multiplier: 1 },
                    { picks: 7, hits: 7, multiplier: 5000 },
                    { picks: 7, hits: 6, multiplier: 180 },
                    { picks: 7, hits: 5, multiplier: 25 },
                    { picks: 7, hits: 4, multiplier: 3 },
                    { picks: 7, hits: 3, multiplier: 1 },
                    { picks: 8, hits: 8, multiplier: 15000 },
                    { picks: 8, hits: 7, multiplier: 500 },
                    { picks: 8, hits: 6, multiplier: 60 },
                    { picks: 8, hits: 5, multiplier: 12 },
                    { picks: 8, hits: 4, multiplier: 2 },
                    { picks: 9, hits: 9, multiplier: 35000 },
                    { picks: 9, hits: 8, multiplier: 1200 },
                    { picks: 9, hits: 7, multiplier: 120 },
                    { picks: 9, hits: 6, multiplier: 30 },
                    { picks: 9, hits: 5, multiplier: 5 },
                    { picks: 9, hits: 4, multiplier: 1 },
                    { picks: 10, hits: 10, multiplier: 100000 },
                    { picks: 10, hits: 9, multiplier: 4000 },
                    { picks: 10, hits: 8, multiplier: 500 },
                    { picks: 10, hits: 7, multiplier: 80 },
                    { picks: 10, hits: 6, multiplier: 20 },
                    { picks: 10, hits: 5, multiplier: 4 },
                    { picks: 10, hits: 0, multiplier: 2 },
                  ];
                  setPayouts(defaults);
                }}
                className="px-3 py-1.5 bg-yellow-500 text-black font-bold text-xs rounded-lg"
              >
                Load Standard Multipliers
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {payouts
                .filter((tier) => selectedPayoutPick === 'ALL' || tier.picks === selectedPayoutPick)
                .map((tier, idx) => {
                  const actualIndex = payouts.findIndex(
                    (p) => p.picks === tier.picks && p.hits === tier.hits
                  );
                  return (
                    <div
                      key={`${tier.picks}_${tier.hits}_${idx}`}
                      className="bg-[#121214] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs hover:border-yellow-500/20 transition-all"
                    >
                      <div>
                        <span className="font-mono font-bold text-gray-200 text-sm">
                          Pick {tier.picks} - {tier.hits === 0 ? '0 Hits (Catch Zero)' : `${tier.hits} Hits`}
                        </span>
                        <div className="text-[10px] text-gray-500">
                          10 ETB bet pays: <span className="text-yellow-400 font-bold">{(10 * tier.multiplier).toLocaleString()} ETB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={tier.multiplier >= 100 ? 10 : 0.5}
                          value={tier.multiplier}
                          onChange={(e) => {
                            const updated = [...payouts];
                            const targetIdx = actualIndex >= 0 ? actualIndex : idx;
                            updated[targetIdx].multiplier = Number(e.target.value);
                            setPayouts(updated);
                          }}
                          className="w-24 bg-[#1c1c1e] border border-white/10 rounded-lg p-1.5 text-center font-mono font-black text-yellow-500 focus:outline-none focus:border-yellow-500"
                        />
                        <span className="text-gray-400 font-mono font-bold">x</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : activeTab === 'finance' ? (
        /* Deposits & Withdrawals Approvals */
        <div className="space-y-4">
          {/* Deposits Approval Section */}
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-2">
            <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest">
              Pending Deposits ({deposits.filter((d) => d.status === 'PENDING').length})
            </h3>
            {deposits.filter((d) => d.status === 'PENDING').length === 0 ? (
              <p className="text-xs text-gray-500 p-3 text-center">No pending deposit requests.</p>
            ) : (
              deposits
                .filter((d) => d.status === 'PENDING')
                .map((d) => (
                  <div
                    key={d.id}
                    className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-white">
                        {d.username} — {d.amount} ETB ({d.method})
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        Ref: {d.transactionRef} • {new Date(d.createdAt).toLocaleTimeString()}
                      </div>
                      {d.screenshotUrl && (
                        <a
                          href={d.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-yellow-400 hover:underline"
                        >
                          View Receipt Screenshot
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDepositAction(d.id, 'APPROVED')}
                        className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: d.id, type: 'deposit' })}
                        className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Withdrawals Approval Section */}
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-2">
            <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest">
              Pending Withdrawals ({withdrawals.filter((w) => w.status === 'PENDING').length})
            </h3>
            {withdrawals.filter((w) => w.status === 'PENDING').length === 0 ? (
              <p className="text-xs text-gray-500 p-3 text-center">No pending withdrawal requests.</p>
            ) : (
              withdrawals
                .filter((w) => w.status === 'PENDING')
                .map((w) => (
                  <div
                    key={w.id}
                    className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-white">
                        {w.username} — {w.amount} ETB ({w.method})
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        Holder: {w.accountName} • Account: {w.accountNumber}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleWithdrawalAction(w.id, 'APPROVED')}
                        className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: w.id, type: 'withdrawal' })}
                        className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : activeTab === 'payment-settings' && paymentSettings ? (
        /* Manual Payment Settings Editor */
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4 text-xs">
          <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>Manual Payment Settings (Telebirr & CBE Birr)</span>
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Telebirr Phone Number</label>
                <input
                  type="text"
                  value={paymentSettings.telebirrPhone || paymentSettings.telebirr || ''}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, telebirrPhone: e.target.value, telebirr: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-yellow-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">Telebirr Holder Name</label>
                <input
                  type="text"
                  value={paymentSettings.telebirrHolder || paymentSettings.telebirrName || ''}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, telebirrHolder: e.target.value, telebirrName: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">CBE Birr Phone Number</label>
                <input
                  type="text"
                  value={paymentSettings.cbePhone || paymentSettings.cbeAccount || paymentSettings.cbeBirr || ''}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, cbePhone: e.target.value, cbeAccount: e.target.value, cbeBirr: e.target.value })
                  }
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-blue-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">CBE Holder Name</label>
                <input
                  type="text"
                  value={paymentSettings.cbeHolder || paymentSettings.cbeName || ''}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, cbeHolder: e.target.value, cbeName: e.target.value })
                  }
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Min / Max Deposit (ETB)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={paymentSettings.minDeposit}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, minDeposit: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                  <input
                    type="number"
                    value={paymentSettings.maxDeposit}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, maxDeposit: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Min / Max Bank/Telebirr Withdrawal (ETB)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={paymentSettings.minWithdrawal}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, minWithdrawal: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                  <input
                    type="number"
                    value={paymentSettings.maxWithdrawal}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, maxWithdrawal: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Min / Max Voucher Withdrawal (ETB)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={paymentSettings.minVoucherWithdrawal || 10}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, minVoucherWithdrawal: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                  <input
                    type="number"
                    value={paymentSettings.maxVoucherWithdrawal || 5000}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, maxVoucherWithdrawal: Number(e.target.value) })}
                    className="w-1/2 bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-[#121214] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-200 text-xs">Enable Vouchers</div>
                  <div className="text-[10px] text-gray-500">Allow users to withdraw / redeem vouchers</div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentSettings.vouchersEnabled !== false}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, vouchersEnabled: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
              </div>
            </div>

            <div className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-200">Require Screenshot for Deposits</div>
                <div className="text-[10px] text-gray-500">Force users to upload proof of payment url</div>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.screenshotRequired}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, screenshotRequired: e.target.checked })}
                className="w-4 h-4 accent-yellow-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSavePaymentSettings}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Save Payment Settings</span>
            </button>
          </div>
        </div>
      ) : activeTab === 'vouchers' ? (
        /* Voucher Generator & List */
        <div className="space-y-4 text-xs">
          <form onSubmit={handleCreateVoucher} className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>Create Voucher Code</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KENO100"
                  value={vCode}
                  onChange={(e) => setVCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Amount (ETB)</label>
                <input
                  type="number"
                  min={1}
                  value={vAmount}
                  onChange={(e) => setVAmount(Number(e.target.value))}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2 text-yellow-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Usage Limit</label>
                <input
                  type="number"
                  min={1}
                  value={vLimit}
                  onChange={(e) => setVLimit(Number(e.target.value))}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl p-2 text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl uppercase tracking-wider"
            >
              Generate Voucher Code
            </button>
          </form>

          {/* Existing Vouchers List */}
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 space-y-2">
            <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest">Active & Past Vouchers</h3>
            {vouchers.length === 0 ? (
              <p className="text-xs text-gray-500 p-2 text-center">No vouchers generated yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {vouchers.map((v) => (
                  <div key={v.id} className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-extrabold text-amber-400 text-sm">{v.code}</div>
                      <div className="text-[10px] text-gray-400">
                        Value: <span className="text-yellow-300 font-bold">{v.amount} ETB</span> | Used: {v.timesUsed}/{v.usageLimit || '∞'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleVoucher(v.id, !v.active)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                        v.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {v.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* User Management Tab */
        <div className="space-y-3 text-xs">
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Registered Players ({users.length})</span>
              </h3>
              <div className="relative w-40">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl pl-8 pr-2 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      {u.firstName} ({u.username})
                      {u.role === 'ADMIN' && (
                        <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Bal: <span className="text-yellow-400 font-bold">{(u.balance ?? 0).toLocaleString()} ETB</span> | TG: {u.telegramId || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setAdjDelta(100);
                      }}
                      className="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      <DollarSign className="w-3 h-3" /> Adjust Bal
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUserRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                      className="px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-lg text-[10px] font-bold"
                    >
                      {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'announcements' ? (
        /* Announcement Broadcaster */
        <form onSubmit={handlePostAnnouncement} className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3 text-xs">
          <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span>Broadcast Live Announcement</span>
          </h3>

          <div>
            <label className="block text-gray-400 font-bold mb-1">Announcement Title</label>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="e.g. Weekend Special 100% Bonus!"
              className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">Message Content</label>
            <textarea
              required
              rows={3}
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              placeholder="Type announcement message..."
              className="w-full bg-[#121214] border border-white/10 rounded-xl p-2.5 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            Broadcast Announcement
          </button>
        </form>
      ) : activeTab === 'logs' ? (
        /* Audit Logs List */
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3 text-xs">
          <h3 className="font-bold text-xs text-yellow-500 uppercase tracking-widest">Admin Audit Trail Logs</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="bg-[#121214] p-3 rounded-xl border border-white/5">
                <div className="flex justify-between font-mono font-bold text-white">
                  <span>{l.action}</span>
                  <span className="text-gray-500 text-[10px]">{new Date(l.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{l.details}</div>
                <div className="text-[9px] text-yellow-500 font-mono mt-0.5">Admin: {l.adminUsername}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Adjust Balance Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn text-xs">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-extrabold text-sm text-yellow-300">
                Adjust Balance for {selectedUser.username}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-3">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Delta Amount (ETB, use negative for deduction)</label>
                <input
                  type="number"
                  required
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-yellow-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Tournament reward bonus"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-yellow-500 text-black font-black rounded-xl uppercase tracking-wider"
              >
                Confirm Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn text-xs">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-extrabold text-sm text-red-400">
                Reject {rejectModal.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request
              </h3>
              <button onClick={() => setRejectModal(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Reason for Rejection</label>
                <input
                  type="text"
                  placeholder="e.g. Invalid reference ID / Name mismatch"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (rejectModal.type === 'deposit') {
                    handleDepositAction(rejectModal.id, 'REJECTED', rejectionReason);
                  } else {
                    handleWithdrawalAction(rejectModal.id, 'REJECTED', rejectionReason);
                  }
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl uppercase tracking-wider"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
