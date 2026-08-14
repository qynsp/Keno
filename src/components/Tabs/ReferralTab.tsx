import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { triggerHaptic } from '../../lib/telegram';
import { Users, Copy, Check, Gift, Sparkles, Share2, Ticket } from 'lucide-react';

interface ReferralTabProps {
  user: UserProfile | null;
}

export const ReferralTab: React.FC<ReferralTabProps> = ({ user }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const rawCode = user?.referralCode || 'KENO777';
  const formattedRefCode = `REF-${rawCode.replace('KENO', '') || '8921'}`;
  const telegramInviteLink = `https://t.me/casinokenobot?start=${rawCode}`;

  const handleCopyCode = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(formattedRefCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(telegramInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Referral Hero Card */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-widest">
          <Gift className="w-4 h-4 text-yellow-500" />
          <span>Invite Friends & Earn</span>
        </div>

        <h2 className="text-xl font-black text-white">
          Get 5% Commission on All Friend Bets!
        </h2>

        <p className="text-xs text-gray-400 leading-relaxed">
          Share your unique Referral Code or Telegram Bot link with friends. Whenever your invited friends register and play Keno, you automatically earn 5% bonus credit directly into your wallet!
        </p>

        {/* Unique Referral Code Box */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Your Unique Referral Code</label>
          <div className="bg-[#121214] border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
            <div className="font-mono text-base text-yellow-400 font-extrabold tracking-widest px-1 select-all">
              {formattedRefCode}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(212,175,55,0.3)] active:scale-95 transition-transform shrink-0"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Telegram Referral Link Box */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Telegram Invite Link</label>
          <div className="bg-[#121214] border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="truncate font-mono text-xs text-gray-300 font-bold px-1 select-all">
              {telegramInviteLink}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-lg flex items-center gap-1 active:scale-95 transition-transform shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gray-300" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 text-center shadow-2xl space-y-1">
          <Users className="w-6 h-6 text-yellow-500 mx-auto" />
          <div className="text-2xl font-mono font-black text-white">{user?.referredUsersCount || 0}</div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Friends Invited</div>
        </div>

        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 text-center shadow-2xl space-y-1">
          <Sparkles className="w-6 h-6 text-yellow-500 mx-auto animate-pulse" />
          <div className="text-2xl font-mono font-black text-emerald-400">{user?.referralEarnings || 0} ETB</div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Earned</div>
        </div>
      </div>
    </div>
  );
};

