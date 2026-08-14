import React from 'react';
import { KenoRound } from '../types';
import { Timer, Dices, ShieldCheck, Trophy } from 'lucide-react';

interface LiveDrawProps {
  round: KenoRound | null;
  remainingSeconds: number;
  drawnSoFar: number[];
}

export const LiveDraw: React.FC<LiveDrawProps> = ({
  round,
  remainingSeconds,
  drawnSoFar,
}) => {
  if (!round) return null;

  const status = round.status;
  const isWaiting = status === 'WAITING';
  const isDrawing = status === 'DRAWING';
  const isResult = status === 'RESULT';

  const progressPercent = isWaiting ? Math.max(0, (remainingSeconds / 60) * 100) : 0;
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return (
    <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold block">
            Round #{round.roundNumber}
          </span>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
            <Dices className="w-4 h-4 text-yellow-500" />
            <span>Multiplayer Keno</span>
          </h2>
        </div>

        {/* Next Draw Countdown */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">
              {isDrawing ? 'Drawing' : isResult ? 'Complete' : 'Next Draw In'}
            </p>
            <p className="text-2xl font-mono font-black text-yellow-500">
              00:{formattedSeconds}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 flex items-center justify-center shrink-0">
            <div className={`w-2 h-2 bg-yellow-500 rounded-full ${isDrawing ? 'animate-ping' : 'animate-pulse'}`} />
          </div>
        </div>
      </div>

      {/* Countdown Progress Bar (During WAITING) */}
      {isWaiting && (
        <div className="w-full bg-[#121214] rounded-full h-1.5 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(212,175,55,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 20 Drawn Balls Tray Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          <span>Drawn Balls ({drawnSoFar.length}/20)</span>
          {round.provableSeed && (
            <div className="flex items-center gap-1 text-gray-500" title={`Provable Seed: ${round.provableSeed}`}>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[120px] font-mono">Provable Seed</span>
            </div>
          )}
        </div>

        {/* 20 slots tray */}
        <div className="grid grid-cols-10 gap-1.5 bg-[#121214] p-3 rounded-xl border border-white/5">
          {Array.from({ length: 20 }, (_, idx) => {
            const num = drawnSoFar[idx];
            const isLatest = idx === drawnSoFar.length - 1 && isDrawing;

            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                  num !== undefined
                    ? isLatest
                      ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 text-black shadow-[0_0_15px_rgba(212,175,55,0.6)] border-2 border-white scale-125 z-20 animate-bounce'
                      : 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(212,175,55,0.3)] border border-yellow-400 scale-100 font-black'
                    : 'bg-[#1c1c1e] text-gray-600 border border-white/5'
                }`}
              >
                {num !== undefined ? num : idx + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
