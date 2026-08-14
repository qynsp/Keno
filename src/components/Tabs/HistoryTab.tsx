import React, { useEffect, useState } from 'react';
import { KenoRound, KenoTicket } from '../../types';
import { History, Ticket, Dices, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';

export const HistoryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'my_tickets' | 'recent_rounds'>('my_tickets');
  const [rounds, setRounds] = useState<KenoRound[]>([]);
  const [tickets, setTickets] = useState<KenoTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'my_tickets') {
        const token = localStorage.getItem('keno_jwt');
        const res = await fetch('/api/user/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTickets(data);
        }
      } else {
        const res = await fetch('/api/rounds/recent');
        if (res.ok) {
          const data = await res.json();
          setRounds(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Tab Switcher */}
      <div className="bg-[#121214] border border-white/10 rounded-2xl p-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('my_tickets')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase ${
            activeSubTab === 'my_tickets'
              ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>My Tickets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('recent_rounds')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase ${
            activeSubTab === 'recent_rounds'
              ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Recent Draws</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500 space-y-2">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading history records...</p>
        </div>
      ) : activeSubTab === 'my_tickets' ? (
        /* My Tickets History */
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-8 text-center text-xs text-gray-500">
              You haven't played any tickets yet.
            </div>
          ) : (
            tickets.map((t, idx) => {
              const selected = Array.isArray(t.selectedNumbers)
                ? t.selectedNumbers
                : (typeof t.selectedNumbers === 'string' ? JSON.parse(t.selectedNumbers) : []);
              const matched = Array.isArray(t.matchedNumbers) ? t.matchedNumbers : [];
              const winAmount = t.payout ?? t.winAmount ?? 0;

              return (
                <div
                  key={t.id ? `${t.id}_${idx}` : `ticket_${idx}`}
                  className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-yellow-500">
                      <Ticket className="w-4 h-4 text-yellow-500" />
                      <span className="font-mono">Round #{t.roundNumber || t.roundId}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {t.status === 'WON' ? (
                        <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          WON +{winAmount} ETB
                        </span>
                      ) : t.status === 'LOST' ? (
                        <span className="flex items-center gap-1 bg-[#1c1c1e] text-gray-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          LOST
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#121214] p-3 rounded-xl border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-400 font-mono text-[11px]">
                      <span>Stake: <strong className="text-yellow-500">{t.stake} ETB</strong></span>
                      <span>Matched: <strong className="text-emerald-400">{matched.length} / {selected.length}</strong></span>
                      <span>Status: <strong className="text-yellow-500">{t.status}</strong></span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {selected.map((num) => {
                        const isHit = matched.includes(num);
                        return (
                          <span
                            key={num}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                              isHit
                                ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : 'bg-[#1c1c1e] text-gray-400 border border-white/5'
                            }`}
                          >
                            {num}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 text-right font-mono">
                    {(t.createdAt || t.timestamp) ? new Date(t.createdAt || t.timestamp).toLocaleString() : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Recent Rounds History */
        <div className="space-y-2">
          {rounds.map((r) => {
            const drawn = Array.isArray(r.drawnNumbers)
              ? r.drawnNumbers
              : (typeof r.drawnNumbers === 'string' ? JSON.parse(r.drawnNumbers) : []);

            return (
              <div
                key={r.id}
                className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <Dices className="w-4 h-4 text-yellow-500" />
                    <span className="font-mono">Round #{r.roundNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Provable Seed</span>
                  </div>
                </div>

                {/* 20 Drawn numbers */}
                <div className="bg-[#121214] p-2.5 rounded-xl border border-white/5">
                  <div className="grid grid-cols-10 gap-1">
                    {drawn.map((num) => (
                      <div
                        key={num}
                        className="aspect-square bg-yellow-500 text-black rounded-md flex items-center justify-center font-mono font-black text-xs shadow-sm"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1">
                  <span>Bets: <strong className="text-yellow-500">{r.totalStakes ?? r.totalBets ?? 0} ETB</strong></span>
                  <span>Payouts: <strong className="text-emerald-400">{r.totalPayouts ?? 0} ETB</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
