export type RoundStatus = 'WAITING' | 'DRAWING' | 'RESULT' | 'PAUSED' | 'CANCELLED';

export interface KenoRound {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  startTime: number; // Unix timestamp ms when WAITING started
  endTime: number;   // Unix timestamp ms when WAITING ends (60s)
  drawnNumbers: number[];
  drawTimestamp?: number;
  provableSeed?: string;
  multipliers?: Record<string, any>;
  totalTickets?: number;
  totalBets?: number;
  totalStakes?: number;
  totalPayouts: number;
}

export interface KenoTicket {
  id: string;
  userId: string;
  username?: string;
  roundId: string;
  roundNumber?: number;
  stake: number; // ETB
  selectedNumbers: number[]; // 1 to 10 numbers from 1..80
  matchedNumbers: number[];
  hitCount?: number;
  matchedCount?: number;
  multiplier?: number;
  payout?: number;
  winAmount?: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: number;
  timestamp?: number;
}

export interface PayoutTier {
  picks: number; // 1 to 10
  hits: number;  // 0 to picks
  multiplier: number; // e.g. Pick 1 with 1 hit = 3x
}

export interface UserProfile {
  id: string;
  telegramId?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  balance: number; // ETB
  role: 'USER' | 'ADMIN';
  referralCode: string;
  referredBy?: string;
  referredUsersCount?: number;
  referralEarnings?: number;
  totalBets: number;
  totalWins: number;
  totalPayout: number;
  joinedAt: number;
}

export type User = UserProfile;

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: number;
  timestamp?: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  username?: string;
  amount: number;
  method: string;
  accountName?: string;
  accountNumber?: string;
  transactionRef?: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: number;
  timestamp?: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username?: string;
  amount: number;
  method: string;
  accountName?: string;
  accountNumber?: string;
  accountDetails?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: number;
  timestamp?: number;
}

export interface PaymentSettings {
  telebirrName: string;
  telebirrPhone: string;
  telebirr?: string;
  telebirrHolder?: string;
  cbeName: string;
  cbeAccount: string;
  cbeBirr?: string;
  cbePhone?: string;
  cbeHolder?: string;
  minDeposit: number;
  maxDeposit: number;
  screenshotRequired: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  minVoucherWithdrawal?: number;
  maxVoucherWithdrawal?: number;
  vouchersEnabled: boolean;
}

export interface Voucher {
  id: string;
  code: string;
  amount: number;
  expiryDate?: number;
  usageLimit?: number;
  timesUsed: number;
  active?: boolean;
  createdBy?: string;
  createdAt: number;
  usedBy?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  message?: string;
  type?: 'INFO' | 'PROMO' | 'SYSTEM' | 'BIG_WIN';
  createdAt: number;
  timestamp?: number;
  active: boolean;
}

export interface GameSettings {
  roundDurationSeconds: number; // Default 60
  drawSpeedMs?: number;          // Default 1000ms per number
  resultDurationSeconds?: number; // Default 15
  minStake: number;              // Default 5 ETB
  maxStake: number;              // Default 1000 ETB
  houseEdgePercent?: number;
  maintenanceMode: boolean;
  paused?: boolean;
  houseMarginPercent?: number;
  botUsername?: string;
  voucherMinWithdrawal?: number;
  voucherMaxWithdrawal?: number;
}

export interface AdminStats {
  totalUsers: number;
  onlineUsers?: number;
  activeTickets?: number;
  totalBets?: number;
  totalPayouts?: number;
  houseProfit?: number;
  recentRounds?: KenoRound[];
  recentTickets?: KenoTicket[];
  revenueGraph?: { date: string; bets: number; payouts: number; profit: number }[];
  totalBalance?: number;
  activeRoundTickets?: number;
  currentRoundId?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminUsername?: string;
  action: string;
  details: any;
  timestamp: number;
}

export interface ServerToClientEvents {
  round_started: (round: KenoRound) => void;
  timer_update: (data: { roundId: string; remainingSeconds: number; status: RoundStatus }) => void;
  ticket_created: (ticket: KenoTicket) => void;
  ticket_closed: () => void;
  draw_started: (data: { roundId: string; seed: string }) => void;
  number_drawn: (data: { roundId: string; number: number; index: number; drawnSoFar: number[] }) => void;
  draw_finished: (data: { roundId: string; drawnNumbers: number[] }) => void;
  round_finished: (data: { roundId: string; winnersCount: number; totalPayout: number }) => void;
  balance_updated: (data: { userId: string; balance: number }) => void;
  leaderboard_updated: (leaderboard: any[]) => void;
  announcement_broadcast: (announcement: Announcement) => void;
}

export interface ClientToServerEvents {
  join_game: (userData: { telegramId?: string; username: string }) => void;
  buy_ticket: (
    data: { selectedNumbers: number[]; stake: number },
    callback: (res: { success: boolean; ticket?: KenoTicket; error?: string; balance?: number }) => void
  ) => void;
  get_current_state: (callback: (state: { round: KenoRound; settings: GameSettings; userBalance?: number; drawnSoFar?: number[] }) => void) => void;
}
