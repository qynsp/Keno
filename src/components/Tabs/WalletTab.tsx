import React, { useEffect, useState } from 'react';
import { UserProfile, Transaction, PaymentSettings } from '../../types';
import { triggerHaptic } from '../../lib/telegram';
import { Wallet, ArrowDownLeft, ArrowUpRight, History, Ticket, X, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface WalletTabProps {
  user: UserProfile | null;
  onRefreshUser: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({ user, onRefreshUser }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [depositMethod, setDepositMethod] = useState<'Telebirr' | 'CBE Birr'>('Telebirr');
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawMethod, setWithdrawMethod] = useState<'Telebirr' | 'CBE Birr' | 'Voucher'>('Telebirr');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherTabMode, setVoucherTabMode] = useState<'redeem' | 'withdraw'>('redeem');
  const [generatedVoucher, setGeneratedVoucher] = useState<{ code: string; amount: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/payment-settings');
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/user/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('light');
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('keno_jwt');
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: depositAmount,
          method: depositMethod,
          transactionRef,
          screenshotUrl,
          instant: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerHaptic('success');
        setMessage({
          text: data.instant
            ? 'Instant deposit successful!'
            : 'Deposit request submitted! Pending admin review.',
          type: 'success',
        });
        onRefreshUser();
        fetchTransactions();
        setTransactionRef('');
        setScreenshotUrl('');
        setTimeout(() => setDepositOpen(false), 2000);
      } else {
        setMessage({ text: data.error || 'Failed to process deposit', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('keno_jwt');

      if (withdrawMethod === 'Voucher') {
        const res = await fetch('/api/user/withdraw-voucher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: withdrawAmount }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerHaptic('success');
          setGeneratedVoucher({ code: data.voucherCode, amount: data.amount });
          setMessage({ text: `Withdrawal successful! Voucher Code: ${data.voucherCode}`, type: 'success' });
          onRefreshUser();
          fetchTransactions();
        } else {
          setMessage({ text: data.error || 'Failed to generate voucher', type: 'error' });
        }
      } else {
        const res = await fetch('/api/user/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: withdrawAmount,
            method: withdrawMethod,
            accountName,
            accountNumber,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerHaptic('success');
          setMessage({ text: 'Withdrawal request submitted! Pending admin review.', type: 'success' });
          onRefreshUser();
          fetchTransactions();
          setTimeout(() => setWithdrawOpen(false), 2000);
        } else {
          setMessage({ text: data.error || 'Failed to submit withdrawal', type: 'error' });
        }
      }
    } catch (err: any) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('keno_jwt');

      if (voucherTabMode === 'withdraw') {
        const res = await fetch('/api/user/withdraw-voucher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: withdrawAmount }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerHaptic('success');
          setGeneratedVoucher({ code: data.voucherCode, amount: data.amount });
          setMessage({ text: `Voucher generated successfully!`, type: 'success' });
          onRefreshUser();
          fetchTransactions();
        } else {
          setMessage({ text: data.error || 'Failed to generate voucher', type: 'error' });
        }
      } else {
        if (!voucherCode.trim()) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/user/redeem-voucher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: voucherCode }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          triggerHaptic('success');
          setMessage({ text: `Voucher redeemed! +${data.amount} ETB added to wallet.`, type: 'success' });
          onRefreshUser();
          fetchTransactions();
          setVoucherCode('');
          setTimeout(() => setVoucherOpen(false), 2000);
        } else {
          setMessage({ text: data.error || 'Invalid or expired voucher', type: 'error' });
        }
      }
    } catch (err) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Wallet Balance Hero Card */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-widest">
            <Wallet className="w-4 h-4" />
            <span>Available Balance</span>
          </div>
          <div className="text-3xl font-mono font-black text-white tracking-tight">
            {user ? user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}{' '}
            <span className="text-yellow-500 text-2xl font-sans font-bold">ETB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-4">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setMessage(null);
              fetchPaymentSettings();
              setDepositOpen(true);
            }}
            className="py-3 px-2 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 shadow-[0_4px_15px_rgba(212,175,55,0.2)] active:scale-95 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setMessage(null);
              fetchPaymentSettings();
              setWithdrawOpen(true);
            }}
            className="py-3 px-2 bg-[#1c1c1e] hover:bg-white/5 border border-white/5 text-yellow-500 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setMessage(null);
              setVoucherOpen(true);
            }}
            className="py-3 px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>Voucher</span>
          </button>
        </div>
      </div>

      {/* Manual Payment Information Card */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Manual Transfer Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Telebirr Box */}
          <div className="bg-[#121214] border border-amber-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-400">Telebirr</span>
              <button
                type="button"
                onClick={() => copyToClipboard(paymentSettings?.telebirrPhone || '0911223344', 'telebirr')}
                className="text-[10px] text-gray-400 hover:text-yellow-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg"
              >
                {copiedField === 'telebirr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'telebirr' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="text-gray-300 font-mono text-sm font-bold">
              {paymentSettings?.telebirrPhone || '0911223344'}
            </div>
            <div className="text-[10px] text-gray-500">
              Holder: {paymentSettings?.telebirrHolder || paymentSettings?.telebirrName || 'Casino Keno Admin'}
            </div>
          </div>

          {/* CBE Birr Box */}
          <div className="bg-[#121214] border border-blue-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-400">CBE Birr (Phone)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(paymentSettings?.cbePhone || paymentSettings?.cbeAccount || '0911223355', 'cbe')}
                className="text-[10px] text-gray-400 hover:text-yellow-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg"
              >
                {copiedField === 'cbe' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'cbe' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="text-gray-300 font-mono text-sm font-bold">
              {paymentSettings?.cbePhone || paymentSettings?.cbeAccount || '0911223355'}
            </div>
            <div className="text-[10px] text-gray-500">
              Holder: {paymentSettings?.cbeHolder || paymentSettings?.cbeName || 'Casino Keno Admin'}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Log */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-yellow-500">
            <History className="w-4 h-4 text-yellow-500" />
            <span>Transaction History</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
            No transaction records yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="bg-[#121214] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-gray-200">{tx.description}</div>
                    <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                      {(tx.createdAt || tx.timestamp) ? new Date(tx.createdAt || tx.timestamp).toLocaleString() : ''}
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <span className={isPositive ? 'text-emerald-400' : 'text-yellow-500'}>
                      {isPositive ? '+' : ''}
                      {(tx.amount ?? 0).toLocaleString()} ETB
                    </span>
                    <div className="text-[9px] text-gray-500 font-normal">
                      Bal: {(tx.balanceAfter ?? 0).toLocaleString()} ETB
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-extrabold text-sm text-yellow-300">Deposit via Manual Transfer</h3>
              <button onClick={() => setDepositOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-300 mb-1">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Telebirr', 'CBE Birr'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMethod(m)}
                      className={`p-2.5 rounded-xl font-bold text-center border transition-all ${
                        depositMethod === m
                          ? 'bg-amber-500/20 text-yellow-300 border-yellow-400'
                          : 'bg-gray-950 text-gray-400 border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions box */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-[11px] text-gray-300 space-y-1">
                <div className="font-bold text-yellow-400">Transfer Instructions:</div>
                <div>
                  Send payment via {depositMethod} to{' '}
                  <span className="font-mono text-white font-bold">
                    {depositMethod === 'Telebirr'
                      ? paymentSettings?.telebirrPhone || '0911223344'
                      : paymentSettings?.cbePhone || paymentSettings?.cbeAccount || '0911223355'}
                  </span>{' '}
                  ({depositMethod === 'Telebirr' ? paymentSettings?.telebirrHolder || paymentSettings?.telebirrName : paymentSettings?.cbeHolder || paymentSettings?.cbeName})
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Deposit Amount (ETB)</label>
                <input
                  type="number"
                  min={paymentSettings?.minDeposit || 10}
                  max={paymentSettings?.maxDeposit || 100000}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-yellow-300 font-extrabold text-sm focus:outline-none focus:border-yellow-400"
                />
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Min: {paymentSettings?.minDeposit || 10} ETB | Max: {paymentSettings?.maxDeposit || 100000} ETB
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Transaction Ref / SMS Text</label>
                <input
                  type="text"
                  placeholder="e.g. TXN98765432"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {paymentSettings?.screenshotRequired && (
                <div>
                  <label className="block font-bold text-gray-300 mb-1">Screenshot / Receipt URL (Required)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              )}

              {message && (
                <div
                  className={`p-2 rounded-xl text-center text-xs font-bold ${
                    message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black rounded-xl uppercase tracking-wider shadow-lg"
              >
                {loading ? 'Processing...' : 'Submit Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-extrabold text-sm text-yellow-300">Withdraw Funds</h3>
              <button onClick={() => { setWithdrawOpen(false); setGeneratedVoucher(null); setMessage(null); }} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-300 mb-1">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Telebirr', 'CBE Birr', 'Voucher'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setWithdrawMethod(m);
                        setGeneratedVoucher(null);
                        setMessage(null);
                      }}
                      className={`p-2 rounded-xl font-bold text-center text-xs border transition-all ${
                        withdrawMethod === m
                          ? 'bg-amber-500/20 text-yellow-300 border-yellow-400'
                          : 'bg-gray-950 text-gray-400 border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      {m === 'Voucher' ? '🎟️ Voucher' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Withdrawal Amount (ETB)</label>
                <input
                  type="number"
                  min={
                    withdrawMethod === 'Voucher'
                      ? paymentSettings?.minVoucherWithdrawal || 10
                      : paymentSettings?.minWithdrawal || 50
                  }
                  max={
                    withdrawMethod === 'Voucher'
                      ? paymentSettings?.maxVoucherWithdrawal || 5000
                      : paymentSettings?.maxWithdrawal || 50000
                  }
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-yellow-300 font-extrabold text-sm focus:outline-none focus:border-yellow-400"
                />
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Min:{' '}
                  {withdrawMethod === 'Voucher'
                    ? paymentSettings?.minVoucherWithdrawal || 10
                    : paymentSettings?.minWithdrawal || 50}{' '}
                  ETB | Max:{' '}
                  {withdrawMethod === 'Voucher'
                    ? paymentSettings?.maxVoucherWithdrawal || 5000
                    : paymentSettings?.maxWithdrawal || 50000}{' '}
                  ETB
                </div>
              </div>

              {withdrawMethod === 'Voucher' ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200/90 leading-relaxed space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Instant Voucher Withdrawal</span>
                  </div>
                  <p>
                    Convert your ETB balance into a unique voucher code immediately. You can share this code with anyone to redeem into their wallet.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-gray-300 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name on Account"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-300 mb-1">Account / Phone Number</label>
                    <input
                      type="text"
                      required
                      placeholder="09... or Account Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </>
              )}

              {/* Display Generated Voucher Code when created */}
              {generatedVoucher && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center space-y-2 animate-fadeIn">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Your Generated Voucher</div>
                  <div className="text-xl font-mono font-black text-white tracking-widest bg-black/40 py-2 px-3 rounded-lg border border-emerald-500/20 select-all">
                    {generatedVoucher.code}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedVoucher.code, 'gen_voucher')}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedField === 'gen_voucher' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'gen_voucher' ? 'Code Copied!' : 'Copy Voucher Code'}
                  </button>
                </div>
              )}

              {message && !generatedVoucher && (
                <div
                  className={`p-2 rounded-xl text-center text-xs font-bold ${
                    message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black rounded-xl uppercase tracking-wider"
              >
                {loading
                  ? 'Processing...'
                  : withdrawMethod === 'Voucher'
                  ? '🎟️ Generate Voucher'
                  : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {voucherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-extrabold text-sm text-yellow-300 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-amber-400" />
                Voucher Management
              </h3>
              <button onClick={() => { setVoucherOpen(false); setGeneratedVoucher(null); setMessage(null); }} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voucher Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setVoucherTabMode('redeem');
                  setGeneratedVoucher(null);
                  setMessage(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  voucherTabMode === 'redeem'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Redeem Voucher
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoucherTabMode('withdraw');
                  setGeneratedVoucher(null);
                  setMessage(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  voucherTabMode === 'withdraw'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Withdraw via Voucher
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit} className="space-y-3 text-xs">
              {voucherTabMode === 'redeem' ? (
                <div>
                  <label className="block font-bold text-gray-300 mb-1">Enter Promo / Voucher Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VCH-8K9M2P4X"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-yellow-300 font-mono font-extrabold text-base tracking-widest text-center focus:outline-none focus:border-yellow-400 uppercase"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-300 mb-1">Withdraw Amount (ETB)</label>
                    <input
                      type="number"
                      min={paymentSettings?.minVoucherWithdrawal || 10}
                      max={paymentSettings?.maxVoucherWithdrawal || 5000}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-yellow-300 font-extrabold text-sm focus:outline-none focus:border-yellow-400"
                    />
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Min: {paymentSettings?.minVoucherWithdrawal || 10} ETB | Max: {paymentSettings?.maxVoucherWithdrawal || 5000} ETB
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    💡 This will deduct {withdrawAmount} ETB from your balance and generate an active voucher code that can be shared or redeemed by anyone.
                  </p>
                </div>
              )}

              {/* Display Generated Voucher Code when created */}
              {generatedVoucher && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center space-y-2 animate-fadeIn">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Your Generated Voucher</div>
                  <div className="text-xl font-mono font-black text-white tracking-widest bg-black/40 py-2 px-3 rounded-lg border border-emerald-500/20 select-all">
                    {generatedVoucher.code}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedVoucher.code, 'gen_voucher_modal')}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedField === 'gen_voucher_modal' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'gen_voucher_modal' ? 'Code Copied!' : 'Copy Voucher Code'}
                  </button>
                </div>
              )}

              {message && !generatedVoucher && (
                <div
                  className={`p-2 rounded-xl text-center text-xs font-bold ${
                    message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-gray-950 font-black rounded-xl uppercase tracking-wider shadow-lg"
              >
                {loading
                  ? 'Processing...'
                  : voucherTabMode === 'withdraw'
                  ? '🎟️ Generate Voucher'
                  : 'Claim Voucher'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
