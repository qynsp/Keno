import { query, withTransaction } from './pg';
import {
  User,
  KenoRound,
  KenoTicket,
  DepositRequest,
  WithdrawalRequest,
  Voucher,
  Announcement,
  AuditLog,
  Transaction,
  GameSettings,
  PayoutTier,
} from '../src/types';

export const DEFAULT_PAYOUT_TIERS: PayoutTier[] = [
  // Pick 1
  { picks: 1, hits: 1, multiplier: 3.5 },

  // Pick 2
  { picks: 2, hits: 2, multiplier: 12 },
  { picks: 2, hits: 1, multiplier: 1 },

  // Pick 3
  { picks: 3, hits: 3, multiplier: 45 },
  { picks: 3, hits: 2, multiplier: 2.5 },

  // Pick 4
  { picks: 4, hits: 4, multiplier: 140 },
  { picks: 4, hits: 3, multiplier: 5 },
  { picks: 4, hits: 2, multiplier: 1 },

  // Pick 5
  { picks: 5, hits: 5, multiplier: 500 },
  { picks: 5, hits: 4, multiplier: 18 },
  { picks: 5, hits: 3, multiplier: 3 },

  // Pick 6
  { picks: 6, hits: 6, multiplier: 1600 },
  { picks: 6, hits: 5, multiplier: 60 },
  { picks: 6, hits: 4, multiplier: 6 },
  { picks: 6, hits: 3, multiplier: 1 },

  // Pick 7
  { picks: 7, hits: 7, multiplier: 5000 },
  { picks: 7, hits: 6, multiplier: 180 },
  { picks: 7, hits: 5, multiplier: 25 },
  { picks: 7, hits: 4, multiplier: 3 },
  { picks: 7, hits: 3, multiplier: 1 },

  // Pick 8
  { picks: 8, hits: 8, multiplier: 15000 },
  { picks: 8, hits: 7, multiplier: 500 },
  { picks: 8, hits: 6, multiplier: 60 },
  { picks: 8, hits: 5, multiplier: 12 },
  { picks: 8, hits: 4, multiplier: 2 },

  // Pick 9
  { picks: 9, hits: 9, multiplier: 35000 },
  { picks: 9, hits: 8, multiplier: 1200 },
  { picks: 9, hits: 7, multiplier: 120 },
  { picks: 9, hits: 6, multiplier: 30 },
  { picks: 9, hits: 5, multiplier: 5 },
  { picks: 9, hits: 4, multiplier: 1 },

  // Pick 10
  { picks: 10, hits: 10, multiplier: 100000 },
  { picks: 10, hits: 9, multiplier: 4000 },
  { picks: 10, hits: 8, multiplier: 500 },
  { picks: 10, hits: 7, multiplier: 80 },
  { picks: 10, hits: 6, multiplier: 20 },
  { picks: 10, hits: 5, multiplier: 4 },
  { picks: 10, hits: 0, multiplier: 2 },
];

export class PostgresDatabase {
  // --- USER MANAGEMENT ---
  public async getUserByTelegramId(telegramId: string): Promise<User | null> {
    const rows = await query<any>(
      'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    if (!rows.length) return null;
    return rows[0];
  }

  public async getUserById(userId: string): Promise<User | null> {
    const rows = await query<any>(
      'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users WHERE id = $1',
      [userId]
    );
    if (!rows.length) return null;
    return rows[0];
  }

  public async createUser(
    telegramId: string,
    firstName?: string,
    username?: string,
    referrerCode?: string
  ): Promise<User> {
    return await withTransaction(async (client) => {
      // Check if user already exists
      const existing = await client.query(
        'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      let referredByUserId: string | null = null;
      if (referrerCode) {
        const refRes = await client.query('SELECT id FROM users WHERE referral_code = $1', [referrerCode]);
        if (refRes.rows.length > 0) {
          referredByUserId = refRes.rows[0].id;
        }
      }

      const id = 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const generatedRefCode = 'KENO' + Math.floor(1000 + Math.random() * 9000);
      const createdAt = Date.now();

      // ALWAYS INITIAL BALANCE = 0.00 FOR NEW USERS
      const initialBalance = 0.00;

      const res = await client.query(
        `INSERT INTO users (id, telegram_id, first_name, username, balance, role, referral_code, referred_by, created_at)
         VALUES ($1, $2, $3, $4, $5, 'USER', $6, $7, $8)
         RETURNING id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt"`,
        [id, telegramId, firstName || '', username || '', initialBalance, generatedRefCode, referredByUserId, createdAt]
      );

      return res.rows[0];
    });
  }

  public async getUsers(): Promise<User[]> {
    return await query<any>(
      'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users ORDER BY created_at DESC'
    );
  }

  // Atomic Balance Deduction
  public async deductBalance(userId: string, amount: number, description: string): Promise<number> {
    return await withTransaction(async (client) => {
      const userRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentBalance = userRes.rows[0].balance;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentBalance - amount;
      await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

      // Record transaction
      const txId = 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txId, userId, 'TICKET_PURCHASE', -amount, newBalance, description, Date.now()]
      );

      return newBalance;
    });
  }

  // Atomic Payout / Credit
  public async recordPayout(userId: string, amount: number, description: string): Promise<number> {
    return await withTransaction(async (client) => {
      const userRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentBalance = userRes.rows[0].balance;
      const newBalance = currentBalance + amount;

      await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

      const txId = 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txId, userId, 'WIN_PAYOUT', amount, newBalance, description, Date.now()]
      );

      return newBalance;
    });
  }

  // --- KENO ROUNDS ---
  public async getCurrentRound(): Promise<KenoRound | null> {
    const rows = await query<any>(
      `SELECT id, round_number as "roundNumber", status, start_time as "startTime", end_time as "endTime",
              drawn_numbers as "drawnNumbers", multipliers, total_stakes::float as "totalStakes", total_payouts::float as "totalPayouts"
       FROM keno_rounds ORDER BY created_at DESC LIMIT 1`
    );
    if (!rows.length) return null;
    return {
      ...rows[0],
      drawnNumbers: rows[0].drawnNumbers || [],
      multipliers: rows[0].multipliers || {},
    };
  }

  public async createRound(round: Omit<KenoRound, 'totalStakes' | 'totalPayouts'>): Promise<KenoRound> {
    const created = await query<any>(
      `INSERT INTO keno_rounds (id, round_number, status, start_time, end_time, drawn_numbers, multipliers, total_stakes, total_payouts, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8)
       RETURNING id, round_number as "roundNumber", status, start_time as "startTime", end_time as "endTime",
                 drawn_numbers as "drawnNumbers", multipliers, total_stakes::float as "totalStakes", total_payouts::float as "totalPayouts"`,
      [
        round.id,
        round.roundNumber,
        round.status,
        round.startTime,
        round.endTime,
        JSON.stringify(round.drawnNumbers || []),
        JSON.stringify(round.multipliers || {}),
        Date.now(),
      ]
    );
    return created[0];
  }

  public async updateRoundStatus(roundId: string, status: string, drawnNumbers?: number[]): Promise<void> {
    if (drawnNumbers) {
      await query(
        'UPDATE keno_rounds SET status = $1, drawn_numbers = $2 WHERE id = $3',
        [status, JSON.stringify(drawnNumbers), roundId]
      );
    } else {
      await query('UPDATE keno_rounds SET status = $1 WHERE id = $2', [status, roundId]);
    }
  }

  public async completeRound(roundId: string, drawnNumbers: number[]): Promise<void> {
    await query(
      'UPDATE keno_rounds SET status = $1, drawn_numbers = $2 WHERE id = $3',
      ['RESULT', JSON.stringify(drawnNumbers), roundId]
    );
  }

  public async getRecentRounds(limit: number = 10): Promise<KenoRound[]> {
    const rows = await query<any>(
      `SELECT id, round_number as "roundNumber", status, start_time as "startTime", end_time as "endTime",
              drawn_numbers as "drawnNumbers", multipliers, total_stakes::float as "totalStakes", total_payouts::float as "totalPayouts"
       FROM keno_rounds ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({
      ...r,
      drawnNumbers: r.drawnNumbers || [],
      multipliers: r.multipliers || {},
    }));
  }

  // --- TICKETS ---
  public async createTicket(ticket: { roundId: string; userId: string; selectedNumbers: number[]; stake: number; username?: string; roundNumber?: number }): Promise<KenoTicket> {
    const id = 'tkt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const createdAt = Date.now();

    return await withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO tickets (id, round_id, user_id, selected_numbers, stake, status, win_amount, matched_count, created_at)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, 0, $6)
         RETURNING id, round_id as "roundId", user_id as "userId", selected_numbers as "selectedNumbers",
                   stake::float as stake, status, win_amount::float as "winAmount", matched_count as "matchedCount", created_at as "createdAt"`,
        [id, ticket.roundId, ticket.userId, JSON.stringify(ticket.selectedNumbers), ticket.stake, createdAt]
      );

      await client.query('UPDATE keno_rounds SET total_stakes = total_stakes + $1 WHERE id = $2', [ticket.stake, ticket.roundId]);

      const row = res.rows[0];
      const selected = Array.isArray(row.selectedNumbers)
        ? row.selectedNumbers
        : (typeof row.selectedNumbers === 'string' ? JSON.parse(row.selectedNumbers) : ticket.selectedNumbers);

      return {
        ...row,
        selectedNumbers: selected,
        matchedNumbers: [],
        matchedCount: 0,
        payout: 0,
        winAmount: 0,
      };
    });
  }

  public async getTicketsForRound(roundId: string): Promise<KenoTicket[]> {
    const rows = await query<any>(
      `SELECT id, round_id as "roundId", user_id as "userId", selected_numbers as "selectedNumbers",
              stake::float as stake, status, win_amount::float as "winAmount", win_amount::float as payout,
              matched_count as "matchedCount", created_at as "createdAt"
       FROM tickets WHERE round_id = $1`,
      [roundId]
    );
    return rows.map((t) => {
      const selected = Array.isArray(t.selectedNumbers)
        ? t.selectedNumbers
        : (typeof t.selectedNumbers === 'string' ? JSON.parse(t.selectedNumbers) : []);
      return {
        ...t,
        selectedNumbers: selected,
        matchedNumbers: [],
        payout: t.winAmount || 0,
        winAmount: t.winAmount || 0,
      };
    });
  }

  public async getTicketsForUser(userId: string, limit: number = 20): Promise<KenoTicket[]> {
    const rows = await query<any>(
      `SELECT t.id, t.round_id as "roundId", t.user_id as "userId", t.selected_numbers as "selectedNumbers",
              t.stake::float as stake, t.status, t.win_amount::float as "winAmount", t.win_amount::float as payout,
              t.matched_count as "matchedCount", t.created_at as "createdAt",
              r.round_number as "roundNumber", r.drawn_numbers as "roundDrawnNumbers"
       FROM tickets t
       LEFT JOIN keno_rounds r ON t.round_id = r.id
       WHERE t.user_id = $1 ORDER BY t.created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map((t) => {
      const selected = Array.isArray(t.selectedNumbers)
        ? t.selectedNumbers
        : (typeof t.selectedNumbers === 'string' ? JSON.parse(t.selectedNumbers) : []);
      const drawn = Array.isArray(t.roundDrawnNumbers)
        ? t.roundDrawnNumbers
        : (typeof t.roundDrawnNumbers === 'string' ? JSON.parse(t.roundDrawnNumbers) : []);
      const matched = selected.filter((n: number) => drawn.includes(n));
      return {
        ...t,
        selectedNumbers: selected,
        matchedNumbers: matched,
        matchedCount: t.matchedCount ?? matched.length,
        payout: t.payout ?? t.winAmount ?? 0,
        winAmount: t.winAmount ?? t.payout ?? 0,
      };
    });
  }

  public async settleTicket(ticketId: string, winAmount: number, matchedCount: number): Promise<void> {
    await withTransaction(async (client) => {
      const status = winAmount > 0 ? 'WON' : 'LOST';
      const tRes = await client.query(
        `UPDATE tickets SET status = $1, win_amount = $2, matched_count = $3 WHERE id = $4 RETURNING round_id`,
        [status, winAmount, matchedCount, ticketId]
      );
      if (tRes.rows.length > 0 && winAmount > 0) {
        const roundId = tRes.rows[0].round_id;
        await client.query('UPDATE keno_rounds SET total_payouts = total_payouts + $1 WHERE id = $2', [winAmount, roundId]);
      }
    });
  }

  // --- DEPOSITS & WITHDRAWALS ---
  public async createDeposit(
    userId: string,
    amount: number,
    method: string,
    transactionRef?: string,
    screenshotUrl?: string,
    instantAutoApprove: boolean = false
  ): Promise<DepositRequest> {
    return await withTransaction(async (client) => {
      const id = 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const createdAt = Date.now();
      const initialStatus = instantAutoApprove ? 'APPROVED' : 'PENDING';

      const res = await client.query(
        `INSERT INTO deposits (id, user_id, amount, method, transaction_ref, screenshot_url, status, admin_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, user_id as "userId", amount::float as amount, method, transaction_ref as "transactionRef",
                   screenshot_url as "screenshotUrl", status, admin_notes as "adminNotes", created_at as "createdAt"`,
        [id, userId, amount, method, transactionRef || null, screenshotUrl || null, initialStatus, instantAutoApprove ? 'Instant test deposit' : null, createdAt]
      );

      if (instantAutoApprove) {
        const uRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (uRes.rows.length > 0) {
          const newBal = uRes.rows[0].balance + amount;
          await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, userId]);
          await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['tx_' + Date.now(), userId, 'DEPOSIT', amount, newBal, 'Instant approved deposit', createdAt]
          );
        }
      }

      return res.rows[0];
    });
  }

  public async getDeposits(): Promise<DepositRequest[]> {
    return await query<any>(
      `SELECT id, user_id as "userId", amount::float as amount, method, transaction_ref as "transactionRef",
              screenshot_url as "screenshotUrl", status, admin_notes as "adminNotes", created_at as "createdAt"
       FROM deposits ORDER BY created_at DESC`
    );
  }

  public async updateDepositStatus(depositId: string, status: 'APPROVED' | 'REJECTED', adminNotes?: string): Promise<DepositRequest | null> {
    return await withTransaction(async (client) => {
      const depRes = await client.query('SELECT * FROM deposits WHERE id = $1 FOR UPDATE', [depositId]);
      if (depRes.rows.length === 0) return null;

      const dep = depRes.rows[0];
      if (dep.status !== 'PENDING') return null;

      await client.query('UPDATE deposits SET status = $1, admin_notes = $2 WHERE id = $3', [status, adminNotes || null, depositId]);

      if (status === 'APPROVED') {
        const uRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [dep.user_id]);
        if (uRes.rows.length > 0) {
          const newBal = uRes.rows[0].balance + parseFloat(dep.amount);
          await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, dep.user_id]);
          await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['tx_' + Date.now(), dep.user_id, 'DEPOSIT', parseFloat(dep.amount), newBal, `Approved deposit #${depositId}`, Date.now()]
          );
        }
      }

      const updated = await client.query(
        `SELECT id, user_id as "userId", amount::float as amount, method, transaction_ref as "transactionRef",
                screenshot_url as "screenshotUrl", status, admin_notes as "adminNotes", created_at as "createdAt"
         FROM deposits WHERE id = $1`,
        [depositId]
      );
      return updated.rows[0];
    });
  }

  public async createWithdrawal(userId: string, amount: number, method: string, accountDetails: string): Promise<WithdrawalRequest> {
    return await withTransaction(async (client) => {
      const userRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userRes.rows.length === 0) throw new Error('User not found');

      const currentBal = userRes.rows[0].balance;
      if (currentBal < amount) throw new Error('Insufficient balance for withdrawal');

      // Lock balance immediately
      const newBal = currentBal - amount;
      await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, userId]);

      const id = 'wth_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const createdAt = Date.now();

      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['tx_' + Date.now(), userId, 'WITHDRAWAL_REQUEST', -amount, newBal, `Withdrawal request #${id}`, createdAt]
      );

      const res = await client.query(
        `INSERT INTO withdrawals (id, user_id, amount, method, account_details, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
         RETURNING id, user_id as "userId", amount::float as amount, method, account_details as "accountDetails", status, admin_notes as "adminNotes", created_at as "createdAt"`,
        [id, userId, amount, method, accountDetails, createdAt]
      );

      return res.rows[0];
    });
  }

  public async getWithdrawals(): Promise<WithdrawalRequest[]> {
    return await query<any>(
      `SELECT id, user_id as "userId", amount::float as amount, method, account_details as "accountDetails", status, admin_notes as "adminNotes", created_at as "createdAt"
       FROM withdrawals ORDER BY created_at DESC`
    );
  }

  public async updateWithdrawalStatus(withdrawalId: string, status: 'APPROVED' | 'REJECTED', adminNotes?: string): Promise<WithdrawalRequest | null> {
    return await withTransaction(async (client) => {
      const wRes = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [withdrawalId]);
      if (wRes.rows.length === 0) return null;

      const w = wRes.rows[0];
      if (w.status !== 'PENDING') return null;

      await client.query('UPDATE withdrawals SET status = $1, admin_notes = $2 WHERE id = $3', [status, adminNotes || null, withdrawalId]);

      // If REJECTED, refund user's locked balance
      if (status === 'REJECTED') {
        const uRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [w.user_id]);
        if (uRes.rows.length > 0) {
          const newBal = uRes.rows[0].balance + parseFloat(w.amount);
          await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, w.user_id]);
          await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['tx_' + Date.now(), w.user_id, 'WITHDRAWAL_REFUND', parseFloat(w.amount), newBal, `Refund rejected withdrawal #${withdrawalId}`, Date.now()]
          );
        }
      }

      const updated = await client.query(
        `SELECT id, user_id as "userId", amount::float as amount, method, account_details as "accountDetails", status, admin_notes as "adminNotes", created_at as "createdAt"
         FROM withdrawals WHERE id = $1`,
        [withdrawalId]
      );
      return updated.rows[0];
    });
  }

  // --- VOUCHERS ---
  public async createVoucher(code: string, amount: number, usageLimit?: number): Promise<Voucher> {
    const id = 'vch_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const createdAt = Date.now();
    const rows = await query<any>(
      `INSERT INTO vouchers (id, code, amount, usage_limit, times_used, active, created_at)
       VALUES ($1, $2, $3, $4, 0, true, $5)
       RETURNING id, code, amount::float as amount, usage_limit as "usageLimit", times_used as "timesUsed", active, created_at as "createdAt"`,
      [id, code.toUpperCase(), amount, usageLimit || null, createdAt]
    );
    return rows[0];
  }

  public async getVouchers(): Promise<Voucher[]> {
    return await query<any>(
      `SELECT id, code, amount::float as amount, usage_limit as "usageLimit", times_used as "timesUsed", COALESCE(active, true) as active, created_at as "createdAt"
       FROM vouchers ORDER BY created_at DESC`
    );
  }

  public async toggleVoucher(id: string, active: boolean): Promise<boolean> {
    await query('UPDATE vouchers SET active = $1 WHERE id = $2', [active, id]);
    return true;
  }

  public async deleteVoucher(id: string): Promise<boolean> {
    await query('DELETE FROM vouchers WHERE id = $1', [id]);
    return true;
  }

  public async claimVoucher(userId: string, code: string): Promise<DepositRequest> {
    return await withTransaction(async (client) => {
      const vRes = await client.query('SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1) FOR UPDATE', [code]);
      if (vRes.rows.length === 0) throw new Error('Invalid voucher code');

      const v = vRes.rows[0];
      if (v.active === false) {
        throw new Error('This voucher code is currently disabled');
      }
      if (v.usage_limit && v.times_used >= v.usage_limit) {
        throw new Error('Voucher usage limit reached');
      }

      // Check if user already claimed
      const cRes = await client.query('SELECT id FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2', [v.id, userId]);
      if (cRes.rows.length > 0) {
        throw new Error('You have already claimed this voucher');
      }

      // Claim
      await client.query('INSERT INTO voucher_claims (id, voucher_id, user_id, claimed_at) VALUES ($1, $2, $3, $4)', [
        'vc_' + Date.now(),
        v.id,
        userId,
        Date.now(),
      ]);

      await client.query('UPDATE vouchers SET times_used = times_used + 1 WHERE id = $1', [v.id]);

      const amount = parseFloat(v.amount);
      const uRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const currentBal = uRes.rows.length > 0 ? uRes.rows[0].balance : 0;
      const newBal = currentBal + amount;

      await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, userId]);

      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['tx_' + Date.now(), userId, 'VOUCHER_CLAIM', amount, newBal, `Voucher claim ${v.code}`, Date.now()]
      );

      const depId = 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const depRes = await client.query(
        `INSERT INTO deposits (id, user_id, amount, method, transaction_ref, status, admin_notes, created_at)
         VALUES ($1, $2, $3, 'Voucher', $4, 'APPROVED', 'Claimed promo voucher', $5)
         RETURNING id, user_id as "userId", amount::float as amount, method, transaction_ref as "transactionRef",
                   screenshot_url as "screenshotUrl", status, admin_notes as "adminNotes", created_at as "createdAt"`,
        [depId, userId, amount, v.code, Date.now()]
      );

      return depRes.rows[0];
    });
  }

  // --- SETTINGS, ANNOUNCEMENTS, LEADERBOARD, AUDIT LOGS ---
  public async getSettings(): Promise<GameSettings> {
    const rows = await query<any>(
      `SELECT min_stake::float as "minStake", max_stake::float as "maxStake",
              round_duration_seconds as "roundDurationSeconds",
              COALESCE(draw_speed_ms, 1000) as "drawSpeedMs",
              house_edge_percent::float as "houseEdgePercent",
              maintenance_mode as "maintenanceMode", bot_username as "botUsername",
              COALESCE(voucher_min_withdrawal::float, 10.0) as "voucherMinWithdrawal",
              COALESCE(voucher_max_withdrawal::float, 5000.0) as "voucherMaxWithdrawal"
       FROM settings WHERE id = 1`
    );
    if (!rows.length) {
      return {
        minStake: 5,
        maxStake: 1000,
        roundDurationSeconds: 60,
        drawSpeedMs: 1000,
        houseEdgePercent: 10,
        maintenanceMode: false,
        botUsername: 'casinokenobot',
        voucherMinWithdrawal: 10,
        voucherMaxWithdrawal: 5000,
      };
    }
    return rows[0];
  }

  public async updateSettings(newSettings: Partial<GameSettings>): Promise<GameSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    await query(
      `UPDATE settings SET min_stake = $1, max_stake = $2, round_duration_seconds = $3, draw_speed_ms = $4, house_edge_percent = $5, maintenance_mode = $6, bot_username = $7, voucher_min_withdrawal = $8, voucher_max_withdrawal = $9, updated_at = $10
       WHERE id = 1`,
      [
        updated.minStake,
        updated.maxStake,
        updated.roundDurationSeconds,
        updated.drawSpeedMs || 1000,
        updated.houseEdgePercent,
        updated.maintenanceMode,
        updated.botUsername,
        updated.voucherMinWithdrawal || 10,
        updated.voucherMaxWithdrawal || 5000,
        Date.now(),
      ]
    );
    return updated;
  }

  public async getPayouts(): Promise<PayoutTier[]> {
    try {
      const rows = await query<any>('SELECT data FROM payout_settings WHERE id = $1', ['default']);
      if (rows.length && rows[0].data && Array.isArray(rows[0].data) && rows[0].data.length > 0) {
        return rows[0].data;
      }
    } catch (e) {
      console.warn('⚠️ Error fetching payout_settings from DB:', e);
    }
    return DEFAULT_PAYOUT_TIERS;
  }

  public async updatePayouts(tiers: PayoutTier[]): Promise<PayoutTier[]> {
    try {
      await query(
        `INSERT INTO payout_settings (id, data, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        ['default', JSON.stringify(tiers), Date.now()]
      );
    } catch (e) {
      console.error('Error updating payout_settings in DB:', e);
    }
    return tiers;
  }

  public async createAnnouncement(title: string, message: string): Promise<Announcement> {
    const id = 'ann_' + Date.now();
    const rows = await query<any>(
      `INSERT INTO announcements (id, title, message, active, created_at)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id, title, message, active, created_at as "createdAt"`,
      [id, title, message, Date.now()]
    );
    return rows[0];
  }

  public async getActiveAnnouncements(): Promise<Announcement[]> {
    return await query<any>(
      'SELECT id, title, message, active, created_at as "createdAt" FROM announcements WHERE active = true ORDER BY created_at DESC'
    );
  }

  public async getLeaderboard(limit: number = 20): Promise<User[]> {
    return await query<any>(
      'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users ORDER BY balance DESC LIMIT $1',
      [limit]
    );
  }

  public async adminAdjustBalance(userId: string, amount: number, type: 'ADD' | 'DEDUCT', reason: string): Promise<User> {
    return await withTransaction(async (client) => {
      const uRes = await client.query('SELECT balance::float as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) throw new Error('User not found');

      const currentBal = uRes.rows[0].balance;
      const delta = type === 'ADD' ? amount : -amount;
      const newBal = currentBal + delta;

      if (newBal < 0) throw new Error('Adjustment would result in negative balance');

      await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBal, userId]);

      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, balance_after, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['tx_' + Date.now(), userId, type === 'ADD' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT', delta, newBal, `Admin adjustment: ${reason}`, Date.now()]
      );

      const updated = await client.query(
        'SELECT id, telegram_id as "telegramId", first_name as "firstName", username, balance::float as balance, role, referral_code as "referralCode", referred_by as "referredBy", created_at as "createdAt" FROM users WHERE id = $1',
        [userId]
      );

      return updated.rows[0];
    });
  }

  public async logAudit(adminId: string, action: string, details?: any): Promise<void> {
    const id = 'log_' + Date.now();
    await query(
      `INSERT INTO audit_logs (id, admin_id, action, details, timestamp) VALUES ($1, $2, $3, $4, $5)`,
      [id, adminId, action, JSON.stringify(details || {}), Date.now()]
    );
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const rows = await query<any>('SELECT id, admin_id as "adminId", action, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 50');
    return rows.map((r) => ({ ...r, details: r.details || {} }));
  }

  public async getAllTransactions(): Promise<Transaction[]> {
    return await query<any>(
      `SELECT id, user_id as "userId", type, amount::float as amount, balance_after::float as "balanceAfter", description, reference_id as "referenceId", timestamp as "createdAt", timestamp
       FROM transactions ORDER BY timestamp DESC LIMIT 100`
    );
  }

  public async getTransactionsForUser(userId: string): Promise<Transaction[]> {
    return await query<any>(
      `SELECT id, user_id as "userId", type, amount::float as amount, balance_after::float as "balanceAfter", description, reference_id as "referenceId", timestamp as "createdAt", timestamp
       FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [userId]
    );
  }

  public async updateUserRole(userId: string, role: string): Promise<void> {
    await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
  }

  public async getPaymentSettings(): Promise<any> {
    try {
      const rows = await query<any>('SELECT data FROM payment_settings WHERE id = $1', ['default']);
      if (rows && rows.length > 0) {
        let data = rows[0].data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) {}
        }
        if (data && typeof data === 'object') {
          // Normalize alias keys
          const cbeAcc = data.cbePhone || data.cbeAccount || data.cbeBirr || '0911223355';
          const cbeH = data.cbeHolder || data.cbeName || data.cbeAccountName || 'Casino Keno Admin';
          const tbPhone = data.telebirrPhone || data.telebirr || '0911223344';
          const tbH = data.telebirrHolder || data.telebirrName || data.telebirrAccountName || 'Casino Keno Admin';

          return {
            ...data,
            cbeAccount: cbeAcc,
            cbePhone: cbeAcc,
            cbeBirr: cbeAcc,
            cbeName: cbeH,
            cbeHolder: cbeH,
            cbeAccountName: cbeH,
            telebirr: tbPhone,
            telebirrPhone: tbPhone,
            telebirrName: tbH,
            telebirrHolder: tbH,
            telebirrAccountName: tbH,
            minDeposit: data.minDeposit !== undefined ? Number(data.minDeposit) : 10,
            maxDeposit: data.maxDeposit !== undefined ? Number(data.maxDeposit) : 50000,
            minWithdrawal: data.minWithdrawal !== undefined ? Number(data.minWithdrawal) : 50,
            maxWithdrawal: data.maxWithdrawal !== undefined ? Number(data.maxWithdrawal) : 25000,
            minVoucherWithdrawal: data.minVoucherWithdrawal !== undefined ? Number(data.minVoucherWithdrawal) : 10,
            maxVoucherWithdrawal: data.maxVoucherWithdrawal !== undefined ? Number(data.maxVoucherWithdrawal) : 5000,
            screenshotRequired: data.screenshotRequired !== undefined ? Boolean(data.screenshotRequired) : true,
            vouchersEnabled: data.vouchersEnabled !== undefined ? Boolean(data.vouchersEnabled) : true,
          };
        }
      }
    } catch (e) {
      console.error('Error fetching payment_settings from DB:', e);
    }

    const defaultSettings = {
      telebirrName: 'Casino Keno Admin',
      telebirrHolder: 'Casino Keno Admin',
      telebirrPhone: '0911223344',
      telebirr: '0911223344',
      telebirrAccountName: 'Casino Keno Admin',
      cbeName: 'Casino Keno Admin',
      cbeHolder: 'Casino Keno Admin',
      cbeAccount: '0911223355',
      cbePhone: '0911223355',
      cbeBirr: '0911223355',
      cbeAccountName: 'Casino Keno Admin',
      minDeposit: 10,
      maxDeposit: 50000,
      minWithdrawal: 50,
      maxWithdrawal: 25000,
      minVoucherWithdrawal: 10,
      maxVoucherWithdrawal: 5000,
      depositInstructions: 'Please include your Telegram ID as the transaction reference.',
      withdrawalInstructions: 'Withdrawals are processed within 15-30 minutes.',
      cbeEnabled: true,
      telebirrEnabled: true,
      screenshotRequired: true,
      vouchersEnabled: true,
    };

    try {
      await query(
        `INSERT INTO payment_settings (id, data, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        ['default', JSON.stringify(defaultSettings), Date.now()]
      );
    } catch (e) {}

    return defaultSettings;
  }

  public async updatePaymentSettings(settings: any): Promise<any> {
    const current = await this.getPaymentSettings();

    // Prioritize explicitly passed fields
    const tbPhone = settings.telebirrPhone !== undefined ? settings.telebirrPhone : (settings.telebirr !== undefined ? settings.telebirr : current.telebirrPhone);
    const tbHolder = settings.telebirrHolder !== undefined ? settings.telebirrHolder : (settings.telebirrName !== undefined ? settings.telebirrName : current.telebirrHolder);

    const cbeNum = settings.cbePhone !== undefined ? settings.cbePhone : (settings.cbeAccount !== undefined ? settings.cbeAccount : (settings.cbeBirr !== undefined ? settings.cbeBirr : current.cbePhone));
    const cbeHolder = settings.cbeHolder !== undefined ? settings.cbeHolder : (settings.cbeName !== undefined ? settings.cbeName : current.cbeHolder);

    const updated = {
      ...current,
      ...settings,
      telebirr: tbPhone,
      telebirrPhone: tbPhone,
      telebirrName: tbHolder,
      telebirrHolder: tbHolder,
      telebirrAccountName: tbHolder,
      cbePhone: cbeNum,
      cbeAccount: cbeNum,
      cbeBirr: cbeNum,
      cbeHolder: cbeHolder,
      cbeName: cbeHolder,
      cbeAccountName: cbeHolder,
      minDeposit: settings.minDeposit !== undefined ? Number(settings.minDeposit) : current.minDeposit,
      maxDeposit: settings.maxDeposit !== undefined ? Number(settings.maxDeposit) : current.maxDeposit,
      minWithdrawal: settings.minWithdrawal !== undefined ? Number(settings.minWithdrawal) : current.minWithdrawal,
      maxWithdrawal: settings.maxWithdrawal !== undefined ? Number(settings.maxWithdrawal) : current.maxWithdrawal,
      minVoucherWithdrawal: settings.minVoucherWithdrawal !== undefined ? Number(settings.minVoucherWithdrawal) : (current.minVoucherWithdrawal || 10),
      maxVoucherWithdrawal: settings.maxVoucherWithdrawal !== undefined ? Number(settings.maxVoucherWithdrawal) : (current.maxVoucherWithdrawal || 5000),
      screenshotRequired: settings.screenshotRequired !== undefined ? Boolean(settings.screenshotRequired) : current.screenshotRequired,
      vouchersEnabled: settings.vouchersEnabled !== undefined ? Boolean(settings.vouchersEnabled) : current.vouchersEnabled,
      cbeEnabled: settings.cbeEnabled !== undefined ? Boolean(settings.cbeEnabled) : (current.cbeEnabled !== false),
      telebirrEnabled: settings.telebirrEnabled !== undefined ? Boolean(settings.telebirrEnabled) : (current.telebirrEnabled !== false),
    };

    try {
      await query(
        `INSERT INTO payment_settings (id, data, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        ['default', JSON.stringify(updated), Date.now()]
      );
    } catch (e) {
      console.error('Error updating payment_settings in DB:', e);
    }
    return updated;
  }
}

export const db = new PostgresDatabase();
