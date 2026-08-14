import React, { useState } from 'react';
import { KenoRound, KenoTicket, UserProfile, PayoutTier, GameSettings } from '../../types';
import { KenoBoard } from '../KenoBoard';
import { LiveDraw } from '../LiveDraw';
import { TicketPanel } from '../TicketPanel';
import { PayoutTableModal } from '../PayoutTableModal';
import { Ticket, Sparkles, CheckCircle2, Clock } from 'lucide-react';

interface HomeTabProps {
  round: KenoRound | null;
  remainingSeconds: number;
  drawnSoFar: number[];
  user: UserProfile | null;
  myTickets: KenoTicket[];
  payoutTables: PayoutTier[];
  settings: GameSettings;
  onBuyTicket: (selectedNumbers: number[], stake: number) => Promise<boolean>;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  round,
  remainingSeconds,
  drawnSoFar,
  user,
  myTickets,
  payoutTables,
  settings,
  onBuyTicket,
}) => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(20);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Toggle single number on Keno board
  const handleToggleNumber = (num: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else {
        if (prev.length >= 10) return prev; // max 10
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Quick auto select random N numbers
  const handleQuickPick = (count: number) => {
    const nums = new Set<number>();
    while (nums.size < count) {
      nums.add(Math.floor(Math.random() * 80) + 1);
    }
    setSelectedNumbers(Array.from(nums).sort((a, b) => a - b));
  };

  const handleClear = () => {
    setSelectedNumbers([]);
  };

  const handleBuy = async () => {
    if (selectedNumbers.length === 0 || loading) return;
    setLoading(true);
    const success = await onBuyTicket(selectedNumbers, stake);
    if (success) {
      setSelectedNumbers([]);
    }
    setLoading(false);
  };

  const isSalesClosed = round?.status !== 'WAITING' || remainingSeconds <= 1;

  // Filter tickets for current round
  const currentRoundTickets = myTickets.filter((t) => t.roundId === round?.id);

  return (
    <div className="space-y-3 pb-20">
      {/* Live Timer & Drawn Numbers Carousel */}
      <LiveDraw
        round={round}
        remainingSeconds={remainingSeconds}
        drawnSoFar={drawnSoFar}
      />

      {/* 1-80 Keno Board */}
      <KenoBoard
        selectedNumbers={selectedNumbers}
        drawnNumbers={round?.status === 'WAITING' ? [] : (drawnSoFar.length > 0 ? drawnSoFar : round?.drawnNumbers || [])}
        onToggleNumber={handleToggleNumber}
        disabled={isSalesClosed}
      />

      {/* Ticket Purchase Controls Panel */}
      <TicketPanel
        selectedNumbers={selectedNumbers}
        stake={stake}
        onStakeChange={setStake}
        onQuickPick={handleQuickPick}
        onClear={handleClear}
        onBuyTicket={handleBuy}
        onOpenPayoutTable={() => setIsPayoutModalOpen(true)}
        userBalance={user?.balance || 0}
        disabled={isSalesClosed}
        loading={loading}
        minStake={settings.minStake || 5}
        maxStake={settings.maxStake || 1000}
      />

      {/* Active Tickets for current round */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Ticket className="w-4 h-4 text-yellow-500" />
            <span>My Active Tickets ({currentRoundTickets.length})</span>
          </div>
          {round && (
            <span className="text-[10px] font-mono text-gray-500 uppercase">Round #{round.roundNumber}</span>
          )}
        </div>

        {currentRoundTickets.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
            No tickets purchased for this round yet. Select your lucky numbers above!
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {currentRoundTickets.map((t, idx) => {
              const selected = Array.isArray(t.selectedNumbers)
                ? t.selectedNumbers
                : (typeof t.selectedNumbers === 'string' ? JSON.parse(t.selectedNumbers) : []);
              const matched = Array.isArray(t.matchedNumbers) ? t.matchedNumbers : [];
              const winETB = t.payout ?? t.winAmount ?? 0;

              return (
                <div
                  key={t.id ? `${t.id}_${idx}` : `ticket_${idx}`}
                  className="bg-[#121214] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-yellow-500">
                      <span className="font-mono">{t.stake} ETB</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 font-normal">{selected.length} Picks</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selected.map((n) => {
                        const isHit = matched.includes(n);
                        return (
                          <span
                            key={n}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isHit
                                ? 'bg-emerald-500 text-black font-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : 'bg-[#1c1c1e] text-yellow-500/80 border border-white/5'
                            }`}
                          >
                            {n}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    {t.status === 'WON' ? (
                      <div className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>+{winETB} ETB</span>
                      </div>
                    ) : t.status === 'LOST' ? (
                      <span className="text-gray-500 font-bold">Lost</span>
                    ) : (
                      <div className="text-yellow-500 font-bold flex items-center gap-1 text-[11px] animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payout Multipliers Modal */}
      <PayoutTableModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        payoutTables={payoutTables}
        selectedPickCount={selectedNumbers.length || 5}
      />
    </div>
  );
};
