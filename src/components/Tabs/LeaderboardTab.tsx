import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Award, Medal } from 'lucide-react';

interface LeaderboardItem {
  userId: string;
  username: string;
  winAmount: number;
  totalBets: number;
  balance?: number;
  totalWins?: number;
}

export const LeaderboardTab: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Header Banner */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-xs uppercase tracking-widest">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span>Keno Hall of Fame</span>
          </div>
          <h2 className="text-xl font-black text-white mt-0.5">
            Top Winners
          </h2>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-yellow-500" />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading rankings...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No leaderboard entries yet.</div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((item, index) => {
              const rank = index + 1;
              let rankBadge = null;

              if (rank === 1) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-yellow-500 text-black font-black flex items-center justify-center text-xs shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                    <Crown className="w-4 h-4" />
                  </div>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-xs shadow-md">
                    <Medal className="w-4 h-4" />
                  </div>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-xs shadow-md">
                    <Award className="w-4 h-4" />
                  </div>
                );
              } else {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-[#1c1c1e] text-gray-400 font-mono font-bold flex items-center justify-center text-xs border border-white/5">
                    {rank}
                  </div>
                );
              }

              return (
                <div
                  key={item.userId ? `${item.userId}_${index}` : `leader_${index}`}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    rank === 1
                      ? 'bg-[#121214] border-yellow-500/40 shadow-lg'
                      : 'bg-[#121214] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {rankBadge}
                    <div>
                      <div className="font-bold text-gray-200">{item.username}</div>
                      <div className="text-[10px] font-mono text-gray-500">{item.totalBets} Bets Played</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-yellow-500 text-sm">
                      +{((item.winAmount || item.balance) ?? 0).toLocaleString()} ETB
                    </div>
                    <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">Total Winnings</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
