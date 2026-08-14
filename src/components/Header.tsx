import React from 'react';
import { UserProfile, Announcement } from '../types';
import { Wallet, ShieldAlert, Sparkles, PlusCircle, Volume2 } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  announcements: Announcement[];
  onOpenDeposit: () => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  announcements,
  onOpenDeposit,
  onSelectTab,
  activeTab,
}) => {
  const activeAnnouncement = announcements.length > 0 ? announcements[0] : null;

  return (
    <header className="sticky top-0 z-40 bg-[#121214]/95 backdrop-blur-md border-b border-white/10 shadow-2xl">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform shrink-0">
            K
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                CASINO <span className="text-yellow-500 italic">KENO</span>
              </h1>
              <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse shrink-0" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mt-0.5">
              Multiplayer Round
            </p>
          </div>
        </div>

        {/* User Profile & Balance */}
        <div className="flex items-center gap-2">
          {/* ETB Balance Pill */}
          <div className="flex items-center bg-[#1c1c1e] hover:bg-white/5 border border-white/10 rounded-full px-3 py-1 transition-all shadow-inner">
            <Wallet className="w-3.5 h-3.5 text-yellow-500 mr-1.5" />
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-yellow-500 tracking-wider">
                {(user?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-bold text-yellow-500/70 ml-1">ETB</span>
            </div>
            <button
              onClick={onOpenDeposit}
              className="ml-2 bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 text-black font-black p-1 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.3)] active:scale-95 transition-transform"
              title="Deposit Funds"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Admin Tag if Admin */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`p-1.5 rounded-full border transition-all ${
                activeTab === 'admin'
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'bg-[#1c1c1e] text-yellow-500 border-white/10 hover:bg-white/5'
              }`}
              title="Admin Panel"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ticker Announcement Banner */}
      {activeAnnouncement && (
        <div className="bg-yellow-500/5 border-t border-b border-yellow-500/10 py-1 px-4 overflow-hidden flex items-center gap-2 text-[11px] text-yellow-400/90">
          <Volume2 className="w-3.5 h-3.5 text-yellow-500 shrink-0 animate-bounce" />
          <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium">
            <span className="font-bold text-yellow-500 uppercase mr-1.5">[{activeAnnouncement.type}]:</span>
            {activeAnnouncement.content}
          </div>
        </div>
      )}
    </header>
  );
};
