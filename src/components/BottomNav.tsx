import React from 'react';
import { triggerHaptic } from '../lib/telegram';
import { Dices, History, Wallet, Trophy, Gift, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'Game', icon: Dices },
    { id: 'history', label: 'History', icon: History },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'referral', label: 'Referral', icon: Gift },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-md border-t border-white/10 shadow-2xl">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onSelectTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-yellow-500 font-bold bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_10px_rgba(212,175,55,0.15)] scale-105'
                  : 'text-gray-400 hover:text-white font-medium border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'text-yellow-500' : ''}`} />
              <span className="text-[10px] tracking-tight uppercase font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
