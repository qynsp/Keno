import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;
let useFallback = false;

// Local in-memory fallback store when DATABASE_URL is not provided or unavailable
const memStore: Record<string, any[]> = {
  users: [],
  settings: [],
  payment_settings: [],
  keno_rounds: [],
  tickets: [],
  transactions: [],
  deposits: [],
  withdrawals: [],
  vouchers: [],
  voucher_claims: [],
  announcements: [],
  audit_logs: [],
  payout_settings: [],
};

export function isFallbackMode(): boolean {
  return useFallback;
}

export function initFallbackDb() {
  useFallback = true;
  if (memStore.settings.length === 0) {
    memStore.settings.push({
      id: 1,
      min_stake: 5.00,
      max_stake: 1000.00,
      round_duration_seconds: 60,
      draw_speed_ms: 1000,
      house_edge_percent: 10.00,
      maintenance_mode: false,
      bot_username: 'casinokenobot',
      voucher_min_withdrawal: 10.00,
      voucher_max_withdrawal: 5000.00,
      updated_at: Date.now(),
    });
  }
}

export function getPool(): Pool | null {
  if (useFallback) return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      useFallback = true;
      initFallbackDb();
      return null;
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('sslmode=disable')
        ? false
        : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  if (!p || useFallback) {
    return executeFallbackQuery(text, params);
  }
  try {
    const res = await p.query(text, params);
    return res.rows;
  } catch (err) {
    console.warn('PostgreSQL query error, attempting fallback:', (err as Error).message);
    return executeFallbackQuery(text, params);
  }
}

export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const p = getPool();
  if (!p || useFallback) {
    const mockClient = {
      query: async (text: string, params?: any[]) => {
        const rows = await executeFallbackQuery(text, params || []);
        return { rows };
      },
    };
    return await callback(mockClient);
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// In-Memory Fallback Executor for Local Development / Sandbox environments
function executeFallbackQuery(sql: string, params: any[] = []): any[] {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  const lowerSql = cleanSql.toLowerCase();

  // 1. SELECT COUNT(*) FROM table
  if (lowerSql.startsWith('select count(*) from')) {
    const tableName = cleanSql.split(' ')[3]?.toLowerCase();
    const table = memStore[tableName] || [];
    return [{ count: table.length }];
  }

  // 2. SELECT FROM USERS BY TELEGRAM ID
  if (lowerSql.includes('from users') && lowerSql.includes('telegram_id =')) {
    const tgId = String(params[0]);
    const user = memStore.users.find((u) => String(u.telegram_id) === tgId);
    return user ? [formatUserRow(user)] : [];
  }

  // 3. SELECT FROM USERS BY ID
  if (lowerSql.includes('from users') && lowerSql.includes('where id =')) {
    const id = params[0];
    const user = memStore.users.find((u) => u.id === id);
    return user ? [formatUserRow(user)] : [];
  }

  // 4. SELECT FROM USERS BY REFERRAL CODE
  if (lowerSql.includes('from users') && lowerSql.includes('referral_code =')) {
    const code = params[0];
    const user = memStore.users.find((u) => u.referral_code === code);
    return user ? [formatUserRow(user)] : [];
  }

  // 5. SELECT ALL USERS / LEADERBOARD
  if (lowerSql.includes('from users')) {
    let list = [...memStore.users];
    if (lowerSql.includes('order by balance desc')) {
      list.sort((a, b) => b.balance - a.balance);
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }
    if (params.length > 0 && typeof params[params.length - 1] === 'number') {
      list = list.slice(0, params[params.length - 1]);
    }
    return list.map(formatUserRow);
  }

  // 6. INSERT INTO USERS
  if (lowerSql.startsWith('insert into users')) {
    const newUser = {
      id: params[0],
      telegram_id: params[1],
      first_name: params[2],
      username: params[3],
      balance: parseFloat(params[4] || 0),
      role: 'USER',
      referral_code: params[5],
      referred_by: params[6] || null,
      created_at: params[7],
    };
    memStore.users.push(newUser);
    return [formatUserRow(newUser)];
  }

  // 7. UPDATE USERS BALANCE
  if (lowerSql.startsWith('update users set balance =')) {
    const newBal = parseFloat(params[0]);
    const userId = params[1];
    const user = memStore.users.find((u) => u.id === userId);
    if (user) {
      user.balance = newBal;
    }
    return [];
  }

  // 8. SETTINGS
  if (lowerSql.includes('from settings')) {
    const s = memStore.settings[0] || {
      id: 1,
      min_stake: 5.00,
      max_stake: 1000.00,
      round_duration_seconds: 60,
      draw_speed_ms: 1000,
      house_edge_percent: 10.00,
      maintenance_mode: false,
      bot_username: 'casinokenobot',
      voucher_min_withdrawal: 10.00,
      voucher_max_withdrawal: 5000.00,
      updated_at: Date.now(),
    };
    return [{
      minStake: parseFloat(s.min_stake),
      maxStake: parseFloat(s.max_stake),
      roundDurationSeconds: s.round_duration_seconds,
      drawSpeedMs: s.draw_speed_ms || 1000,
      houseEdgePercent: parseFloat(s.house_edge_percent),
      maintenanceMode: Boolean(s.maintenance_mode),
      botUsername: s.bot_username,
      voucherMinWithdrawal: parseFloat(s.voucher_min_withdrawal || 10),
      voucherMaxWithdrawal: parseFloat(s.voucher_max_withdrawal || 5000),
    }];
  }

  if (lowerSql.startsWith('update settings set')) {
    const s = memStore.settings[0] || {};
    s.min_stake = params[0];
    s.max_stake = params[1];
    s.round_duration_seconds = params[2];
    s.draw_speed_ms = params[3];
    s.house_edge_percent = params[4];
    s.maintenance_mode = params[5];
    s.bot_username = params[6];
    s.voucher_min_withdrawal = params[7];
    s.voucher_max_withdrawal = params[8];
    s.updated_at = params[9];
    memStore.settings[0] = s;
    return [];
  }

  // 9. KENO ROUNDS
  if (lowerSql.startsWith('insert into keno_rounds')) {
    const newRound = {
      id: params[0],
      round_number: params[1],
      status: params[2],
      start_time: params[3],
      end_time: params[4],
      drawn_numbers: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
      multipliers: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6],
      total_stakes: 0,
      total_payouts: 0,
      created_at: params[7],
    };
    memStore.keno_rounds.push(newRound);
    return [formatRoundRow(newRound)];
  }

  if (lowerSql.includes('from keno_rounds')) {
    let rounds = [...memStore.keno_rounds].sort((a, b) => b.created_at - a.created_at);
    if (lowerSql.includes('limit 1')) {
      return rounds.length > 0 ? [formatRoundRow(rounds[0])] : [];
    }
    if (params.length > 0 && typeof params[0] === 'number') {
      rounds = rounds.slice(0, params[0]);
    }
    return rounds.map(formatRoundRow);
  }

  if (lowerSql.startsWith('update keno_rounds set')) {
    const roundId = params[params.length - 1];
    const r = memStore.keno_rounds.find((round) => round.id === roundId);
    if (r) {
      if (lowerSql.includes('status = $1, drawn_numbers = $2')) {
        r.status = params[0];
        r.drawn_numbers = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
      } else if (lowerSql.includes('status = $1')) {
        r.status = params[0];
      } else if (lowerSql.includes('total_stakes = total_stakes + $1')) {
        r.total_stakes = (r.total_stakes || 0) + parseFloat(params[0]);
      } else if (lowerSql.includes('total_payouts = total_payouts + $1')) {
        r.total_payouts = (r.total_payouts || 0) + parseFloat(params[0]);
      }
    }
    return [];
  }

  // 10. TICKETS
  if (lowerSql.startsWith('insert into tickets')) {
    const newTicket = {
      id: params[0],
      round_id: params[1],
      user_id: params[2],
      selected_numbers: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3],
      stake: parseFloat(params[4]),
      status: 'PENDING',
      win_amount: 0,
      matched_count: 0,
      created_at: params[5],
    };
    memStore.tickets.push(newTicket);
    return [formatTicketRow(newTicket)];
  }

  if (lowerSql.includes('from tickets')) {
    if (lowerSql.includes('where round_id =')) {
      const roundId = params[0];
      return memStore.tickets.filter((t) => t.round_id === roundId).map(formatTicketRow);
    }
    if (lowerSql.includes('where user_id =')) {
      const userId = params[0];
      let tkts = memStore.tickets.filter((t) => t.user_id === userId).sort((a, b) => b.created_at - a.created_at);
      if (params[1]) tkts = tkts.slice(0, params[1]);
      return tkts.map(formatTicketRow);
    }
  }

  if (lowerSql.startsWith('update tickets set status =')) {
    const ticketId = params[3];
    const t = memStore.tickets.find((tk) => tk.id === ticketId);
    if (t) {
      t.status = params[0];
      t.win_amount = parseFloat(params[1]);
      t.matched_count = params[2];
      return [{ round_id: t.round_id }];
    }
    return [];
  }

  // 11. TRANSACTIONS
  if (lowerSql.startsWith('insert into transactions')) {
    const newTx = {
      id: params[0],
      user_id: params[1],
      type: params[2],
      amount: parseFloat(params[3]),
      balance_after: parseFloat(params[4]),
      description: params[5],
      timestamp: params[6],
    };
    memStore.transactions.push(newTx);
    return [];
  }

  if (lowerSql.includes('from transactions')) {
    return [...memStore.transactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100)
      .map((t) => ({
        id: t.id,
        userId: t.user_id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after,
        description: t.description,
        timestamp: t.timestamp,
      }));
  }

  // 12. DEPOSITS & WITHDRAWALS
  if (lowerSql.startsWith('insert into deposits')) {
    const newDep = {
      id: params[0],
      user_id: params[1],
      amount: parseFloat(params[2]),
      method: params[3],
      transaction_ref: params[4],
      screenshot_url: params[5] || null,
      status: params[6],
      admin_notes: params[7] || null,
      created_at: params[8],
    };
    memStore.deposits.push(newDep);
    return [formatDepositRow(newDep)];
  }

  if (lowerSql.includes('from deposits')) {
    if (lowerSql.includes('where id =')) {
      const dep = memStore.deposits.find((d) => d.id === params[0]);
      return dep ? [dep] : [];
    }
    return [...memStore.deposits].sort((a, b) => b.created_at - a.created_at).map(formatDepositRow);
  }

  if (lowerSql.startsWith('update deposits set status =')) {
    const depId = params[2];
    const d = memStore.deposits.find((dep) => dep.id === depId);
    if (d) {
      d.status = params[0];
      d.admin_notes = params[1];
    }
    return [];
  }

  if (lowerSql.startsWith('insert into withdrawals')) {
    const newWth = {
      id: params[0],
      user_id: params[1],
      amount: parseFloat(params[2]),
      method: params[3],
      account_details: params[4],
      status: 'PENDING',
      created_at: params[5],
    };
    memStore.withdrawals.push(newWth);
    return [formatWithdrawalRow(newWth)];
  }

  if (lowerSql.includes('from withdrawals')) {
    if (lowerSql.includes('where id =')) {
      const w = memStore.withdrawals.find((item) => item.id === params[0]);
      return w ? [w] : [];
    }
    return [...memStore.withdrawals].sort((a, b) => b.created_at - a.created_at).map(formatWithdrawalRow);
  }

  if (lowerSql.startsWith('update withdrawals set status =')) {
    const wId = params[2];
    const w = memStore.withdrawals.find((item) => item.id === wId);
    if (w) {
      w.status = params[0];
      w.admin_notes = params[1];
    }
    return [];
  }

  // 13. VOUCHERS & ANNOUNCEMENTS
  if (lowerSql.startsWith('insert into vouchers')) {
    const v = {
      id: params[0],
      code: params[1],
      amount: parseFloat(params[2]),
      usage_limit: params[3] || null,
      times_used: 0,
      active: true,
      created_at: params[params.length - 1],
    };
    memStore.vouchers.push(v);
    return [{ id: v.id, code: v.code, amount: v.amount, usageLimit: v.usage_limit, timesUsed: 0, active: true, createdAt: v.created_at }];
  }

  if (lowerSql.includes('from vouchers')) {
    if (lowerSql.includes('code) = upper(')) {
      const code = String(params[0]).toUpperCase();
      const v = memStore.vouchers.find((item) => item.code.toUpperCase() === code);
      return v ? [v] : [];
    }
    return memStore.vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      amount: v.amount,
      usageLimit: v.usage_limit,
      timesUsed: v.times_used,
      active: v.active !== false,
      createdAt: v.created_at,
    }));
  }

  if (lowerSql.startsWith('update vouchers set active =')) {
    const v = memStore.vouchers.find((item) => item.id === params[1]);
    if (v) v.active = Boolean(params[0]);
    return [];
  }

  if (lowerSql.startsWith('delete from vouchers')) {
    memStore.vouchers = memStore.vouchers.filter((v) => v.id !== params[0]);
    return [];
  }

  if (lowerSql.startsWith('insert into voucher_claims')) {
    memStore.voucher_claims.push({ id: params[0], voucher_id: params[1], user_id: params[2], claimed_at: params[3] });
    return [];
  }

  if (lowerSql.includes('from voucher_claims')) {
    const c = memStore.voucher_claims.find((item) => item.voucher_id === params[0] && item.user_id === params[1]);
    return c ? [c] : [];
  }

  if (lowerSql.startsWith('update vouchers set times_used =')) {
    const v = memStore.vouchers.find((item) => item.id === params[0]);
    if (v) v.times_used += 1;
    return [];
  }

  if (lowerSql.startsWith('insert into announcements')) {
    const ann = { id: params[0], title: params[1], message: params[2], active: true, created_at: params[3] };
    memStore.announcements.push(ann);
    return [{ id: ann.id, title: ann.title, message: ann.message, active: true, createdAt: ann.created_at }];
  }

  if (lowerSql.includes('from announcements')) {
    return memStore.announcements.filter((a) => a.active).map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      active: a.active,
      createdAt: a.created_at,
    }));
  }

  if (lowerSql.startsWith('insert into audit_logs')) {
    memStore.audit_logs.push({ id: params[0], admin_id: params[1], action: params[2], details: params[3], timestamp: params[4] });
    return [];
  }

  if (lowerSql.includes('from audit_logs')) {
    return memStore.audit_logs.map((l) => ({
      id: l.id,
      adminId: l.admin_id,
      action: l.action,
      details: l.details,
      timestamp: l.timestamp,
    }));
  }

  // 14. PAYMENT SETTINGS
  if (lowerSql.includes('from payment_settings')) {
    const id = params[0] || 'default';
    const item = memStore.payment_settings.find((ps) => ps.id === id);
    return item ? [{ data: item.data }] : [];
  }

  if (lowerSql.startsWith('insert into payment_settings')) {
    const id = params[0] || 'default';
    const data = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
    const existingIndex = memStore.payment_settings.findIndex((ps) => ps.id === id);
    if (existingIndex >= 0) {
      if (lowerSql.includes('on conflict (id) do update')) {
        memStore.payment_settings[existingIndex].data = data;
        memStore.payment_settings[existingIndex].updated_at = params[2];
      }
    } else {
      memStore.payment_settings.push({ id, data, updated_at: params[2] });
    }
    return [];
  }

  // 15. PAYOUT SETTINGS
  if (lowerSql.includes('from payout_settings')) {
    const id = params[0] || 'default';
    const item = memStore.payout_settings.find((ps) => ps.id === id);
    return item ? [{ data: item.data }] : [];
  }

  if (lowerSql.startsWith('insert into payout_settings')) {
    const id = params[0] || 'default';
    const data = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
    const existingIndex = memStore.payout_settings.findIndex((ps) => ps.id === id);
    if (existingIndex >= 0) {
      if (lowerSql.includes('on conflict (id) do update')) {
        memStore.payout_settings[existingIndex].data = data;
        memStore.payout_settings[existingIndex].updated_at = params[2];
      }
    } else {
      memStore.payout_settings.push({ id, data, updated_at: params[2] });
    }
    return [];
  }

  return [];
}

function formatUserRow(u: any) {
  return {
    id: u.id,
    telegramId: u.telegram_id,
    firstName: u.first_name,
    username: u.username,
    balance: parseFloat(u.balance || 0),
    role: u.role,
    referralCode: u.referral_code,
    referredBy: u.referred_by,
    createdAt: u.created_at,
  };
}

function formatRoundRow(r: any) {
  return {
    id: r.id,
    roundNumber: r.round_number,
    status: r.status,
    startTime: r.start_time,
    endTime: r.end_time,
    drawnNumbers: r.drawn_numbers || [],
    multipliers: r.multipliers || {},
    totalStakes: parseFloat(r.total_stakes || 0),
    totalPayouts: parseFloat(r.total_payouts || 0),
  };
}

function formatTicketRow(t: any) {
  return {
    id: t.id,
    roundId: t.round_id,
    userId: t.user_id,
    selectedNumbers: t.selected_numbers || [],
    stake: parseFloat(t.stake || 0),
    status: t.status,
    winAmount: parseFloat(t.win_amount || 0),
    matchedCount: t.matched_count || 0,
    createdAt: t.created_at,
  };
}

function formatDepositRow(d: any) {
  return {
    id: d.id,
    userId: d.user_id,
    amount: parseFloat(d.amount || 0),
    method: d.method,
    transactionRef: d.transaction_ref,
    screenshotUrl: d.screenshot_url,
    status: d.status,
    adminNotes: d.admin_notes,
    createdAt: d.created_at,
  };
}

function formatWithdrawalRow(w: any) {
  return {
    id: w.id,
    userId: w.user_id,
    amount: parseFloat(w.amount || 0),
    method: w.method,
    accountDetails: w.account_details,
    status: w.status,
    adminNotes: w.admin_notes,
    createdAt: w.created_at,
  };
}
