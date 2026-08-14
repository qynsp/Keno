import React, { useEffect } from 'react';
import { triggerHaptic } from '../lib/telegram';
import { Trophy, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface WinCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  winData: {
    hitCount: number;
    pickCount: number;
    multiplier: number;
    payout: number;
    roundNumber: number;
  } | null;
}

export const WinCelebration: React.FC<WinCelebrationProps> = ({
  isOpen,
  onClose,
  winData,
}) => {
  useEffect(() => {
    if (isOpen && winData) {
      triggerHaptic('success');
    }
  }, [isOpen, winData]);

  if (!isOpen || !winData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0d0d0f] border border-yellow-500/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-full bg-[#1c1c1e] border border-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown / Trophy Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-yellow-500 p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-bounce">
          <div className="w-full h-full bg-[#0d0d0f] rounded-xl flex items-center justify-center">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        {/* Win Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-yellow-500 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>YOU WON!</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-3xl font-mono font-black text-white tracking-tight">
            +{((winData?.payout) ?? 0).toLocaleString()} ETB
          </h2>
          <p className="text-xs font-mono text-gray-400">
            Round #{winData.roundNumber} Result
          </p>
        </div>

        {/* Hits Breakdown */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="bg-[#1c1c1e] p-2 rounded-lg border border-white/5">
            <span className="text-gray-500 block text-[10px] uppercase font-mono">Matched</span>
            <span className="text-emerald-400 font-mono font-black text-sm">
              {winData.hitCount} / {winData.pickCount} Hits
            </span>
          </div>

          <div className="bg-[#1c1c1e] p-2 rounded-lg border border-white/5">
            <span className="text-gray-500 block text-[10px] uppercase font-mono">Multiplier</span>
            <span className="text-yellow-500 font-mono font-black text-sm">
              {winData.multiplier}x
            </span>
          </div>
        </div>

        {/* Action Collect Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-sm rounded-xl uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Collect Winnings</span>
        </button>
      </div>
    </div>
  );
};
