import React, { useState } from 'react';
import { PayoutTier } from '../types';
import { X, Trophy, Award } from 'lucide-react';

interface PayoutTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  payoutTables: PayoutTier[];
  selectedPickCount: number;
}

export const PayoutTableModal: React.FC<PayoutTableModalProps> = ({
  isOpen,
  onClose,
  payoutTables,
  selectedPickCount,
}) => {
  const [activeTabPick, setActiveTabPick] = useState<number>(selectedPickCount || 5);

  if (!isOpen) return null;

  const currentPick = activeTabPick || 1;
  const tiersForPick = payoutTables
    .filter((t) => t.picks === currentPick)
    .sort((a, b) => b.hits - a.hits);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0d0d0f] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl space-y-3">
        {/* Modal Header */}
        <div className="bg-[#121214] p-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-sm text-white">Keno Payout Multipliers</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg bg-[#1c1c1e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Picks Selector Tabs (1 to 10) */}
        <div className="px-3.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 block">
            Select Number of Picks (1 - 10)
          </label>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => {
              const isActive = p === currentPick;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActiveTabPick(p)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black scale-105'
                      : 'bg-[#1c1c1e] text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  Pick {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multipliers List Table */}
        <div className="px-3.5 pb-4 space-y-2">
          <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 bg-[#1c1c1e] px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
              <span>Matched Hits</span>
              <span className="text-right">Win Multiplier</span>
            </div>

            <div className="divide-y divide-white/5">
              {tiersForPick.length > 0 ? (
                tiersForPick.map((tier) => (
                  <div
                    key={tier.hits}
                    className="grid grid-cols-2 px-3 py-2 text-xs font-bold items-center hover:bg-white/5"
                  >
                    <div className="flex items-center gap-1.5 text-gray-200">
                      <Award className="w-3.5 h-3.5 text-yellow-500" />
                      <span>
                        {tier.hits} {tier.hits === 1 ? 'Hit' : 'Hits'}
                      </span>
                    </div>
                    <span className="text-right font-mono font-black text-yellow-500 text-sm">
                      {tier.multiplier}x
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">
                  No payout configured for Pick {currentPick}
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-gray-500 text-center leading-tight">
            Payouts are calculated as Stake × Multiplier based on server drawn numbers.
          </p>
        </div>
      </div>
    </div>
  );
};
