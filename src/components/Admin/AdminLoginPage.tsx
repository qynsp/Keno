import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { triggerHaptic } from '../../lib/telegram';
import { ShieldCheck, Lock, User, ArrowLeft, Key, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onBackToGame: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToGame,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        triggerHaptic('success');
        localStorage.setItem('keno_jwt', data.token);
        onLoginSuccess(data.user, data.token);
        return;
      }

      triggerHaptic('error');
      setError(data?.error || 'Invalid admin credentials or unauthorized user.');
    } catch (err) {
      triggerHaptic('error');
      setError('Unable to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefaultAdmin = () => {
    setUsername('admin');
    setPassword('admin');
  };

  return (
    <div className="space-y-4 max-w-md mx-auto pb-16 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToGame}
          className="p-2 bg-[#121214] hover:bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Game</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ADMIN PORTAL</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider pt-1">
            Admin Authentication
          </h2>
          <p className="text-xs text-gray-400">
            Access game settings, finance approvals, users, and telemetry.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-3">
          <div>
            <label className="block text-gray-400 text-xs font-bold mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-yellow-500" /> Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full bg-[#121214] border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-bold mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-yellow-500" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password (default: admin)"
              className="w-full bg-[#121214] border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
          </button>
        </form>

        <div className="pt-2 border-t border-white/5 space-y-2">
          <button
            type="button"
            onClick={handleFillDefaultAdmin}
            className="w-full py-2.5 bg-[#121214] hover:bg-white/5 border border-yellow-500/20 text-yellow-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-yellow-500" />
            <span>Fill Default Admin Credentials</span>
          </button>
        </div>
      </div>

      {/* Instructions & Help Toggle */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-3">
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between text-xs font-bold text-gray-300 hover:text-yellow-400 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-yellow-500" />
            <span>Admin Setup & Role Elevation Guide</span>
          </div>
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">
            {showInstructions ? 'Hide' : 'Show'}
          </span>
        </button>

        {showInstructions && (
          <div className="pt-2 border-t border-white/5 text-xs text-gray-400 space-y-2.5 leading-relaxed font-mono">
            <div className="space-y-1">
              <span className="text-yellow-400 font-bold block">1. Built-in Admin Account</span>
              <p className="text-[11px] text-gray-300">
                A default system admin is created automatically with username <code className="text-white bg-white/10 px-1 py-0.5 rounded">admin</code> and default password <code className="text-white bg-white/10 px-1 py-0.5 rounded">admin</code>.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-yellow-400 font-bold block">2. How to Promote Any User to Admin</span>
              <p className="text-[11px] text-gray-300">
                Log in as an existing admin, go to <span className="text-white">Admin Dashboard &gt; Users</span> tab, search for the user, and click <span className="text-yellow-400 font-bold">Promote</span>. Alternatively, send a POST request:
              </p>
              <pre className="p-2 bg-black/50 border border-white/10 rounded text-[10px] text-emerald-400 overflow-x-auto">
{`POST /api/admin/users/role
Headers: Authorization: Bearer <ADMIN_JWT>
Body: { "userId": "<USER_ID>", "role": "ADMIN" }`}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-yellow-400 font-bold block">3. Direct URL Access</span>
              <p className="text-[11px] text-gray-300">
                You can directly navigate to <span className="text-white font-bold">/admin</span> in the browser at any time to open this portal or dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
