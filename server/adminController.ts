import { Router, Response } from 'express';
import { db } from './db';
import { adminMiddleware, AuthenticatedRequest } from './auth';
import { KenoEngine } from './kenoEngine';

export function createAdminRouter(kenoEngine: KenoEngine): Router {
  const router = Router();

  // All admin routes use adminMiddleware
  router.use(adminMiddleware as any);

  // GET /api/admin/stats
  router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await db.getUsers();
      const round = await db.getCurrentRound();
      const tickets = round ? await db.getTicketsForRound(round.id) : [];

      const totalUsers = users.length;
      const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
      const totalBets = tickets.reduce((acc, t) => acc + (t.stake || 0), 0);
      const totalPayouts = tickets.reduce((acc, t) => acc + ((t as any).payout || (t as any).winAmount || 0), 0);
      const houseProfit = totalBets - totalPayouts;

      res.json({
        totalUsers,
        totalBalance,
        activeTickets: tickets.length,
        activeRoundTickets: tickets.length,
        currentRoundId: round?.id || 'N/A',
        totalBets,
        totalPayouts,
        houseProfit,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/payouts
  router.get('/payouts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payouts = await db.getPayouts();
      res.json(payouts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/payouts
  router.post('/payouts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tiers = req.body;
      if (!Array.isArray(tiers)) {
        return res.status(400).json({ error: 'Payout tiers must be an array' });
      }
      const updated = await db.updatePayouts(tiers);
      await db.logAudit(req.user!.id, 'UPDATE_PAYOUTS', { count: tiers.length });
      res.json({ success: true, payouts: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/payment-settings
  router.get('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.getPaymentSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/payment-settings
  router.post('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updatePaymentSettings(req.body);
      await db.logAudit(req.user!.id, 'UPDATE_PAYMENT_SETTINGS', req.body);
      res.json({ success: true, paymentSettings: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/vouchers/toggle
  router.post('/vouchers/toggle', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, active } = req.body;
      await db.toggleVoucher(id, Boolean(active));
      await db.logAudit(req.user!.id, 'TOGGLE_VOUCHER', { id, active });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/users/role
  router.post('/users/role', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role } = req.body;
      if (!userId || !role) return res.status(400).json({ error: 'User ID and role required' });
      await db.updateUserRole(userId, role);
      await db.logAudit(req.user!.id, 'UPDATE_USER_ROLE', { userId, role });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/force-next-round
  router.post('/force-next-round', async (req: AuthenticatedRequest, res: Response) => {
    try {
      await kenoEngine.forceNextRound();
      await db.logAudit(req.user!.id, 'FORCE_NEXT_ROUND', {});
      res.json({ success: true, message: 'Next round triggered' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/announcements
  router.post('/announcements', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, content, message } = req.body;
      const ann = await db.createAnnouncement(title, content || message || '');
      await db.logAudit(req.user!.id, 'CREATE_ANNOUNCEMENT', { title });
      res.json({ success: true, announcement: ann });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/settings
  router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.getSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/settings
  router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newSettings = await db.updateSettings(req.body);
      await db.logAudit(req.user!.id, 'UPDATE_SETTINGS', req.body);
      res.json({ success: true, settings: newSettings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/vouchers
  router.post('/vouchers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, amount, usageLimit } = req.body;
      if (!code || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Code and valid positive amount required' });
      }

      const v = await db.createVoucher(code, Number(amount), usageLimit ? Number(usageLimit) : undefined);
      await db.logAudit(req.user!.id, 'CREATE_VOUCHER', { code: v.code, amount: v.amount });
      res.json({ success: true, voucher: v });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/vouchers
  router.get('/vouchers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const vouchers = await db.getVouchers();
      res.json(vouchers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/users
  router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await db.getUsers();
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/users/balance
  router.post('/users/balance', async (req: AuthenticatedRequest, res: Response) => {
    const { userId, delta, reason } = req.body;
    if (!userId || delta === undefined) {
      return res.status(400).json({ error: 'User ID and delta required' });
    }
    try {
      const amount = Math.abs(Number(delta));
      const type = Number(delta) >= 0 ? 'ADD' : 'DEDUCT';
      const updatedUser = await db.adminAdjustBalance(
        userId,
        amount,
        type,
        reason || `Admin Balance Adjustment by ${req.user!.username}`
      );
      await db.logAudit(req.user!.id, 'ADJUST_BALANCE', { userId, delta, reason });
      res.json({ success: true, newBalance: updatedUser.balance });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/admin/deposits
  router.get('/deposits', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deposits = await db.getDeposits();
      res.json(deposits);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/deposits/action
  router.post('/deposits/action', async (req: AuthenticatedRequest, res: Response) => {
    const { id, action, rejectionReason } = req.body;
    if (!id || !['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const updated = await db.updateDepositStatus(id, action, rejectionReason);
      if (!updated) {
        return res.status(400).json({ error: 'Deposit request not found or already processed' });
      }

      await db.logAudit(req.user!.id, `DEPOSIT_${action}`, { depositId: id, action });
      res.json({ success: true, deposit: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/withdrawals
  router.get('/withdrawals', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const withdrawals = await db.getWithdrawals();
      res.json(withdrawals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/admin/withdrawals/action
  router.post('/withdrawals/action', async (req: AuthenticatedRequest, res: Response) => {
    const { id, action, rejectionReason } = req.body;
    if (!id || !['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const updated = await db.updateWithdrawalStatus(id, action, rejectionReason);
      if (!updated) {
        return res.status(400).json({ error: 'Withdrawal request not found or already processed' });
      }

      await db.logAudit(req.user!.id, `WITHDRAWAL_${action}`, { withdrawalId: id, action });
      res.json({ success: true, withdrawal: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/audit-logs
  router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await db.getAuditLogs();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
