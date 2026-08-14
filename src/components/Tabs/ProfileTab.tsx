import React from 'react';
import { UserProfile } from '../../types';
import { triggerHaptic } from '../../lib/telegram';
import { User, ShieldAlert, Headphones, HelpCircle, Trophy, Dices, Wallet, ChevronRight } from 'lucide-react';

interface ProfileTabProps {
  user: UserProfile | null;
  onSelectTab: (tab: string) => void;
  onSwitchRole: (targetRole: 'USER' | 'ADMIN') => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  onSelectTab,
  onSwitchRole,
}) => {
  if (!user) {
    return (
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 shadow-2xl text-center space-y-3 animate-pulse">
        <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto" />
        <div className="h-4 bg-white/10 rounded w-1/2 mx-auto" />
        <div className="h-3 bg-white/5 rounded w-1/3 mx-auto" />
        <p className="text-xs text-yellow-500/80 font-medium pt-2">Loading Telegram user profile...</p>
      </div>
    );
  }

  const winRate = user.totalBets > 0 ? Math.round((user.totalWins / user.totalBets) * 100) : 0;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

  return (
    <div className="space-y-3 pb-20">
      {/* Profile Card */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500 p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <img
                src={user.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                alt={user.username}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            {user.role === 'ADMIN' && (
              <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-1 rounded-full text-[9px] font-black shadow-md">
                <ShieldAlert className="w-3 h-3" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{fullName}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                {user.role}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">@{user.username}</p>
            <p className="text-[11px] font-mono text-yellow-500/80 mt-0.5">TG ID: {user.telegramId || 'Not connected'}</p>
            <p className="text-[10px] text-gray-500">Joined {new Date(user.joinedAt).toLocaleDateString()}</p>
          </div>
        </div>


        {/* Admin Dashboard Access (Only shown if user is actually an admin) */}
        {user.role === 'ADMIN' && (
          <div className="pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onSelectTab('admin');
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-between shadow-lg transition-all"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-black" />
                <span className="uppercase tracking-wider">Open Admin Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        )}
      </div>

      {/* Gameplay Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 text-center shadow-2xl space-y-1">
          <Dices className="w-5 h-5 text-yellow-500 mx-auto" />
          <div className="text-lg font-mono font-black text-white">{user?.totalBets ?? 0}</div>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Bets</div>
        </div>

        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 text-center shadow-2xl space-y-1">
          <Trophy className="w-5 h-5 text-emerald-400 mx-auto" />
          <div className="text-lg font-mono font-black text-emerald-400">{user?.totalWins ?? 0}</div>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Wins ({winRate}%)</div>
        </div>

        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-3 text-center shadow-2xl space-y-1">
          <Wallet className="w-5 h-5 text-yellow-500 mx-auto" />
          <div className="text-lg font-mono font-black text-yellow-500">{(user?.totalPayout ?? 0).toLocaleString()}</div>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Payout</div>
        </div>
      </div>


      {/* Support & FAQ */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center gap-1.5 text-yellow-500 text-xs font-bold uppercase tracking-widest">
          <HelpCircle className="w-4 h-4 text-yellow-500" />
          <span>Help & Support</span>
        </div>

        <div className="space-y-2 text-xs text-gray-300">
          <div className="p-3 bg-[#121214] rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-yellow-500 block">How to play Casino Keno?</span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Pick 1 to 10 numbers from 1–80, choose your stake (5–1000 ETB), and click Buy Ticket before the timer ends. When drawing starts, the server draws 20 unique winning numbers.
            </p>
          </div>

          <div className="p-3 bg-[#121214] rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-yellow-500 block">Are draws fair and reproducible?</span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Yes! All draws use cryptographically secure random number generation. Every round generates a provable seed stored permanently in the database.
            </p>
          </div>

          <a
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl flex items-center justify-between text-yellow-500 font-bold"
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-yellow-500" />
              <span>Contact 24/7 Live Support</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
