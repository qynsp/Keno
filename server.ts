import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { initDb } from './server/schema';
import { KenoEngine } from './server/kenoEngine';
import { generateToken, authMiddleware, AuthenticatedRequest, validateTelegramInitData, parseTelegramUserFromInitData } from './server/auth';
import { createAdminRouter } from './server/adminController';
import { ServerToClientEvents, ClientToServerEvents, User } from './src/types';

async function startServer() {
  console.log('🚀 Starting Keno Server with PostgreSQL persistence...');
  
  // 1. Initialize PostgreSQL Database Schema
  await initDb();

  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware for production cross-domain and iframe Telegram Mini App support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Support POST requests to non-API SPA routes (Telegram Mini App initial page load)
  app.use((req, res, next) => {
    if (req.method === 'POST' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      req.method = 'GET';
    }
    next();
  });

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      server: 'Casino Keno Server',
      port: PORT,
      database: 'postgres',
      timestamp: new Date().toISOString(),
    });
  });

  // Socket.io Server Setup
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize Keno Engine
  const kenoEngine = new KenoEngine(io);
  await kenoEngine.initialize();

  // Socket.IO Real-Time Connection Logic
  io.on('connection', (socket) => {
    let currentUserId: string | null = null;

    socket.on('join_game', async (userData) => {
      try {
        let user: User | null = null;
        if (userData.telegramId) {
          user = await db.getUserByTelegramId(userData.telegramId);
        }
        if (!user && userData.username) {
          user = await db.getUserByTelegramId(userData.username);
        }

        if (!user) {
          // Create auto user with 0.00 ETB
          user = await db.createUser(
            userData.telegramId || String(Math.floor(100000 + Math.random() * 900000)),
            userData.username || 'Player',
            userData.username || `player_${Math.floor(1000 + Math.random() * 9000)}`
          );
        }

        currentUserId = user.id;
        socket.join(`user_${user.id}`);

        // Send initial state back
        socket.emit('round_started', kenoEngine.getCurrentRound());
        socket.emit('timer_update', {
          roundId: kenoEngine.getCurrentRound().id,
          remainingSeconds: kenoEngine.getRemainingSeconds(),
          status: kenoEngine.getCurrentRound().status,
        });
        socket.emit('balance_updated', { userId: user.id, balance: user.balance });
      } catch (err) {
        console.error('Error in socket join_game:', err);
      }
    });

    socket.on('get_current_state', async (callback) => {
      try {
        const user = currentUserId ? await db.getUserById(currentUserId) : null;
        const settings = await db.getSettings();
        callback({
          round: kenoEngine.getCurrentRound(),
          settings,
          userBalance: user ? user.balance : undefined,
          drawnSoFar: kenoEngine.getDrawnSoFar(),
        });
      } catch (err) {
        console.error('Error in get_current_state:', err);
      }
    });

    socket.on('buy_ticket', async (data, callback) => {
      if (!currentUserId) {
        return callback({ success: false, error: 'User not authenticated' });
      }

      const res = await kenoEngine.buyTicket(currentUserId, data.selectedNumbers, data.stake);
      callback(res);
    });
  });

  // REST API Endpoints

  // Admin / User Direct Auth
  const handleAdminLogin = async (req: express.Request, res: express.Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const expectedAdminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (password !== expectedAdminPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      let user = await db.getUserByTelegramId(username);
      if (!user) {
        user = await db.createUser(username, 'Admin', username);
      }
      if (user.role !== 'ADMIN') {
        await db.updateUserRole(user.id, 'ADMIN');
        user.role = 'ADMIN';
      }
      const token = generateToken({ id: user.id, username: user.username, role: 'ADMIN' });
      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.post('/api/auth/login', handleAdminLogin);
  app.post('/api/auth/admin-login', handleAdminLogin);

  // Payment Settings
  app.get('/api/payment-settings', async (req, res) => {
    try {
      const ps = await db.getPaymentSettings();
      res.json(ps);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const s = await db.getSettings();
      res.json(s);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Payout Multipliers
  app.get('/api/payouts', async (req, res) => {
    try {
      const payouts = await db.getPayouts();
      res.json(payouts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // User Transactions
  app.get('/api/user/transactions', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const txs = await db.getTransactionsForUser(req.user!.id);
      res.json(txs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auth / Telegram Login Endpoint
  app.all('/api/auth/telegram', async (req, res) => {
    try {
      const payload = { ...req.query, ...req.body };
      const { initData, referralCode } = payload;
      let { telegramId, username, firstName } = payload;

      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (botToken && initData) {
        const validation = validateTelegramInitData(initData, botToken);
        if (validation.isValid && validation.user) {
          telegramId = String(validation.user.id);
          username = validation.user.username || username || `user_${validation.user.id}`;
          firstName = validation.user.first_name || firstName || 'Telegram User';
        }
      } else if (initData) {
        const parsedUser = parseTelegramUserFromInitData(initData);
        if (parsedUser) {
          telegramId = String(parsedUser.id);
          username = parsedUser.username || username || `user_${parsedUser.id}`;
          firstName = parsedUser.first_name || firstName || 'Telegram User';
        }
      }

      if (!telegramId && !username) {
        telegramId = '888888';
        username = 'lucky_keno_player';
        firstName = 'Lucky';
      }

      const effectiveTgId = telegramId ? String(telegramId) : '888888';

      let user = await db.getUserByTelegramId(effectiveTgId);
      if (!user) {
        user = await db.createUser(effectiveTgId, firstName || 'Player', username || 'player', referralCode);
      }

      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      return res.json({ success: true, token, user });
    } catch (err: any) {
      console.error('[Telegram Auth Error]', err);
      return res.status(500).json({ success: false, error: 'Database error: ' + (err.message || 'Unknown error') });
    }
  });

  // Current User Profile
  app.get('/api/user/profile', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await db.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // User Tickets History
  app.get('/api/user/tickets', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const tickets = await db.getTicketsForUser(req.user!.id);
      res.json(tickets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Deposit Request
  const handleDeposit = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { amount, method, transactionRef, screenshotUrl, instant } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

      const dep = await db.createDeposit(
        req.user!.id,
        amount,
        method || 'Telebirr',
        transactionRef,
        screenshotUrl,
        Boolean(instant)
      );

      res.json({ success: true, deposit: dep, instant: Boolean(instant) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.post('/api/wallet/deposit', authMiddleware as any, handleDeposit);
  app.post('/api/user/deposit', authMiddleware as any, handleDeposit);

  // Withdrawal Request
  const handleWithdrawal = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { amount, method, accountName, accountNumber, accountDetails } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

      const settings = await db.getSettings();
      const paymentSettings = await db.getPaymentSettings();
      if (method === 'Voucher') {
        const minV = Number(paymentSettings?.minVoucherWithdrawal || settings.voucherMinWithdrawal || 10);
        const maxV = Number(paymentSettings?.maxVoucherWithdrawal || settings.voucherMaxWithdrawal || 5000);
        if (amount < minV || amount > maxV) {
          return res.status(400).json({ error: `Voucher withdrawal must be between ${minV} and ${maxV} ETB` });
        }
      }

      const details = accountDetails || `${method}: ${accountName || ''} - ${accountNumber || ''}`;
      const w = await db.createWithdrawal(req.user!.id, amount, method || 'Telebirr', details);
      res.json({ success: true, withdrawal: w, message: 'Withdrawal request submitted' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  app.post('/api/wallet/withdraw', authMiddleware as any, handleWithdrawal);
  app.post('/api/user/withdraw', authMiddleware as any, handleWithdrawal);

  // Voucher Withdraw
  app.post('/api/user/withdraw-voucher', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount } = req.body;
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const settings = await db.getSettings();
      const paymentSettings = await db.getPaymentSettings();
      const minVoucher = Number(paymentSettings?.minVoucherWithdrawal || settings.voucherMinWithdrawal || 10);
      const maxVoucher = Number(paymentSettings?.maxVoucherWithdrawal || settings.voucherMaxWithdrawal || 50000);

      if (numAmount < minVoucher) {
        return res.status(400).json({ error: `Minimum voucher withdrawal is ${minVoucher} ETB` });
      }
      if (numAmount > maxVoucher) {
        return res.status(400).json({ error: `Maximum voucher withdrawal is ${maxVoucher} ETB` });
      }

      const code = 'VOUCHER_' + Math.floor(100000 + Math.random() * 900000);
      await db.deductBalance(req.user!.id, numAmount, `Withdrawal via Voucher ${code}`);
      const v = await db.createVoucher(code, numAmount, 1);
      res.json({ success: true, voucherCode: code, amount: v.amount });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Claim / Redeem Voucher
  const handleClaimVoucher = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Voucher code is required' });

      const dep = await db.claimVoucher(req.user!.id, code);
      const user = await db.getUserById(req.user!.id);
      res.json({ success: true, amount: dep.amount, balance: user?.balance });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  app.post('/api/wallet/claim-voucher', authMiddleware as any, handleClaimVoucher);
  app.post('/api/user/redeem-voucher', authMiddleware as any, handleClaimVoucher);

  // Recent Rounds
  app.get('/api/rounds/recent', async (req, res) => {
    try {
      const rounds = await db.getRecentRounds(20);
      res.json(rounds);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Announcements
  app.get('/api/announcements', async (req, res) => {
    try {
      const ann = await db.getActiveAnnouncements();
      res.json(ann);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const lb = await db.getLeaderboard();
      res.json(lb);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mount Admin Router
  app.use('/api/admin', createAdminRouter(kenoEngine));

  // Vite / Static Files Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.all('*', (req, res, next) => {
      if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎰 Casino Keno Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
