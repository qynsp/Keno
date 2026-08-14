import React from 'react';
import { triggerHaptic } from '../lib/telegram';
import { Sparkles, Trash2, Zap, Info, Plus, Minus } from 'lucide-react';

interface TicketPanelProps {
  selectedNumbers: number[];
  stake: number;
  onStakeChange: (stake: number) => void;
  onQuickPick: (count: number) => void;
  onClear: () => void;
  onBuyTicket: () => void;
  onOpenPayoutTable: () => void;
  userBalance: number;
  disabled: boolean;
  loading: boolean;
  minStake: number;
  maxStake: number;
}

const STAKE_PRESETS = [5, 10, 20, 50, 100, 250, 500, 1000];

export const TicketPanel: React.FC<TicketPanelProps> = ({
  selectedNumbers,
  stake,
  onStakeChange,
  onQuickPick,
  onClear,
  onBuyTicket,
  onOpenPayoutTable,
  userBalance,
  disabled,
  loading,
  minStake,
  maxStake,
}) => {
  const pickCount = selectedNumbers.length;
  const canBuy = pickCount >= 1 && pickCount <= 10 && userBalance >= stake && !disabled && !loading;

  const handlePresetClick = (val: number) => {
    triggerHaptic('light');
    onStakeChange(val);
  };

  const handleAdjustStake = (delta: number) => {
    triggerHaptic('light');
    const newStake = Math.max(minStake, Math.min(maxStake, stake + delta));
    onStakeChange(newStake);
  };

  return (
    <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4">
      {/* Selection Summary & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Selection</span>
          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] rounded font-mono font-bold uppercase">
            {pickCount} / 10 Selected
          </span>
        </div>

        {/* Quick Pick & Clear Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onQuickPick(Math.min(10, Math.max(1, pickCount || 5)));
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1c1c1e] hover:bg-white/5 border border-white/5 rounded-lg text-yellow-500 text-xs font-bold transition-colors active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span>QUICK PICK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClear();
            }}
            disabled={pickCount === 0}
            className="px-3 py-1.5 bg-[#1c1c1e] hover:bg-white/5 disabled:opacity-40 border border-white/5 rounded-lg text-gray-400 hover:text-red-400 text-xs font-bold transition-colors active:scale-95 flex items-center gap-1"
            title="Clear Selection"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR</span>
          </button>

          <button
            type="button"
            onClick={onOpenPayoutTable}
            className="p-1.5 bg-[#1c1c1e] hover:bg-white/5 border border-white/5 rounded-lg text-yellow-500 transition-colors active:scale-95"
            title="View Payout Table"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stake Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Stake Preset</h3>
          <div className="flex items-center gap-1 bg-[#121214] border border-white/10 rounded-lg px-2 py-0.5">
            <button
              type="button"
              onClick={() => handleAdjustStake(-5)}
              className="text-yellow-500 hover:text-yellow-400 font-black px-1"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={stake}
              onChange={(e) => onStakeChange(Number(e.target.value))}
              min={minStake}
              max={maxStake}
              className="w-14 bg-transparent text-center font-mono font-bold text-yellow-500 focus:outline-none text-xs"
            />
            <button
              type="button"
              onClick={() => handleAdjustStake(5)}
              className="text-yellow-500 hover:text-yellow-400 font-black px-1"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-4 gap-2">
          {STAKE_PRESETS.map((val) => {
            const isSelected = stake === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => handlePresetClick(val)}
                className={`h-10 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-[#1c1c1e] border border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                    : 'bg-[#1c1c1e] border border-white/5 text-gray-400 hover:bg-white/5'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Buy Ticket Primary CTA Button */}
      <button
        type="button"
        disabled={!canBuy}
        onClick={() => {
          triggerHaptic('heavy');
          onBuyTicket();
        }}
        className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-tight transition-all duration-200 flex items-center justify-center gap-2 ${
          canBuy
            ? 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:brightness-110 active:scale-[0.98]'
            : 'bg-[#1c1c1e] text-gray-500 border border-white/5 cursor-not-allowed opacity-60'
        }`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : disabled ? (
          <span>Ticket Sales Closed</span>
        ) : pickCount === 0 ? (
          <span>Select Numbers to Bet</span>
        ) : userBalance < stake ? (
          <span>Insufficient Balance ({stake} ETB)</span>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Place Bet ({stake} ETB)</span>
          </>
        )}
      </button>
    </div>
  );
};
