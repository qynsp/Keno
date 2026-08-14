import React from 'react';
import { triggerHaptic } from '../lib/telegram';

interface KenoBoardProps {
  selectedNumbers: number[];
  drawnNumbers: number[];
  onToggleNumber: (num: number) => void;
  disabled: boolean;
}

export const KenoBoard: React.FC<KenoBoardProps> = ({
  selectedNumbers,
  drawnNumbers,
  onToggleNumber,
  disabled,
}) => {
  const drawnSet = new Set(drawnNumbers);
  const selectedSet = new Set(selectedNumbers);

  const handleCellClick = (num: number) => {
    if (disabled) return;
    triggerHaptic('light');
    onToggleNumber(num);
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-2xl p-3 shadow-2xl relative">
      {/* Board Grid 1 to 80 */}
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
          const isSelected = selectedSet.has(num);
          const isDrawn = drawnSet.has(num);
          const isHit = isSelected && isDrawn;

          let cellClass =
            'relative aspect-square flex items-center justify-center rounded-md text-xs font-bold transition-all duration-150 select-none cursor-pointer ';

          if (isHit) {
            // MATCHED WINNING NUMBER
            cellClass +=
              'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-black font-black border border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105 z-10 animate-bounce';
          } else if (isSelected) {
            // USER SELECTED NUMBER
            cellClass +=
              'bg-yellow-500 text-black font-black border border-yellow-400 shadow-[0_0_10px_rgba(212,175,55,0.4)] scale-105 z-10';
          } else if (isDrawn) {
            // DRAWN BY SERVER (NOT SELECTED BY USER)
            cellClass +=
              'bg-[#1c1c1e] text-yellow-400 border border-yellow-500/60 font-bold shadow-sm shadow-yellow-500/10';
          } else {
            // DEFAULT CELL
            cellClass += disabled
              ? 'bg-[#1c1c1e]/40 text-gray-600 border border-white/5 cursor-not-allowed opacity-60'
              : 'bg-[#1c1c1e] text-gray-400 border border-white/5 hover:border-yellow-500/50 hover:text-white active:scale-95';
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled && !isSelected}
              onClick={() => handleCellClick(num)}
              className={cellClass}
            >
              <span>{num}</span>
              {(isHit || isSelected) && (
                <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/70 blur-[0.3px]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
