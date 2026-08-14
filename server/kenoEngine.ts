import crypto from 'crypto';
import { Server } from 'socket.io';
import {
  KenoRound,
  KenoTicket,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../src/types';
import { db } from './db';

export class KenoEngine {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private currentRound!: KenoRound;
  private timerInterval?: NodeJS.Timeout;
  private remainingSeconds = 60;
  private drawnSoFar: number[] = [];

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  public async initialize() {
    await this.startNewRound();
  }

  public getCurrentRound(): KenoRound {
    return this.currentRound;
  }

  public getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  public getDrawnSoFar(): number[] {
    return this.drawnSoFar;
  }

  // --- Start a New Round ---
  private async startNewRound() {
    const settings = await db.getSettings();
    if (settings.maintenanceMode) {
      console.log('Game is in maintenance mode. Retrying in 5s...');
      setTimeout(() => this.startNewRound(), 5000);
      return;
    }

    const roundNumber = Date.now();
    const roundId = 'round_' + roundNumber;
    const duration = settings.roundDurationSeconds || 60;

    this.currentRound = {
      id: roundId,
      roundNumber,
      status: 'WAITING',
      startTime: Date.now(),
      endTime: Date.now() + duration * 1000,
      drawnNumbers: [],
      multipliers: {},
      totalStakes: 0,
      totalPayouts: 0,
    };

    await db.createRound(this.currentRound);
    this.remainingSeconds = duration;
    this.drawnSoFar = [];

    // Broadcast round_started
    this.io.emit('round_started', this.currentRound);

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds -= 1;

      this.io.emit('timer_update', {
        roundId: this.currentRound.id,
        remainingSeconds: Math.max(0, this.remainingSeconds),
        status: 'WAITING',
      });

      if (this.remainingSeconds <= 0) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startDrawPhase();
      }
    }, 1000);
  }

  // --- Start Drawing Phase ---
  private async startDrawPhase() {
    const settings = await db.getSettings();
    this.currentRound.status = 'DRAWING';
    await db.updateRoundStatus(this.currentRound.id, 'DRAWING');

    this.io.emit('ticket_closed');

    const numbersSet = new Set<number>();
    while (numbersSet.size < 20) {
      const num = crypto.randomInt(1, 81);
      numbersSet.add(num);
    }

    const drawnNumbers = Array.from(numbersSet);
    this.currentRound.drawnNumbers = drawnNumbers;

    await db.updateRoundStatus(this.currentRound.id, 'DRAWING', drawnNumbers);

    this.io.emit('draw_started', {
      roundId: this.currentRound.id,
      seed: '',
    });

    this.drawnSoFar = [];
    const drawSpeed = Math.max(100, settings.drawSpeedMs || 1000);

    for (let i = 0; i < drawnNumbers.length; i++) {
      await new Promise((res) => setTimeout(res, drawSpeed));

      const ball = drawnNumbers[i];
      this.drawnSoFar.push(ball);

      this.io.emit('number_drawn', {
        roundId: this.currentRound.id,
        number: ball,
        index: i,
        drawnSoFar: [...this.drawnSoFar],
      });
    }

    await this.processResults();
  }

  // --- Process Results & Win Calculation ---
  private async processResults() {
    const settings = await db.getSettings();
    this.currentRound.status = 'RESULT';
    await db.completeRound(this.currentRound.id, this.currentRound.drawnNumbers);

    this.io.emit('draw_finished', {
      roundId: this.currentRound.id,
      drawnNumbers: this.currentRound.drawnNumbers,
    });

    const tickets = await db.getTicketsForRound(this.currentRound.id);
    const drawnSet = new Set(this.currentRound.drawnNumbers);
    const payoutTiers = await db.getPayouts();

    let winnersCount = 0;
    let roundTotalPayout = 0;

    for (const ticket of tickets) {
      const matched = ticket.selectedNumbers.filter((n) => drawnSet.has(n));
      const hitCount = matched.length;
      const pickCount = ticket.selectedNumbers.length;

      // Authoritative dynamic multiplier from configured payout tables
      const tier = payoutTiers.find((t) => t.picks === pickCount && t.hits === hitCount);
      let mult = tier ? Number(tier.multiplier) || 0 : 0;

      // Fallback defaults if tier not found
      if (!tier && hitCount > 0) {
        if (pickCount === 1 && hitCount === 1) mult = 3.5;
        else if (pickCount === 2 && hitCount === 2) mult = 12;
        else if (pickCount === 3 && hitCount === 3) mult = 45;
        else if (pickCount === 4 && hitCount === 4) mult = 140;
        else if (pickCount === 5 && hitCount === 5) mult = 500;
      }

      const payout = Math.round(ticket.stake * mult);

      if (payout > 0) {
        winnersCount++;
        roundTotalPayout += payout;

        const newBal = await db.recordPayout(
          ticket.userId,
          payout,
          `Keno Win Round #${this.currentRound.roundNumber} (${hitCount}/${pickCount} hits, ${mult}x)`
        );

        this.io.emit('balance_updated', {
          userId: ticket.userId,
          balance: newBal,
        });
      }

      await db.settleTicket(ticket.id, payout, hitCount);
    }

    this.io.emit('round_finished', {
      roundId: this.currentRound.id,
      winnersCount,
      totalPayout: roundTotalPayout,
    });

    const leaderboard = await db.getLeaderboard();
    this.io.emit('leaderboard_updated', leaderboard);

    setTimeout(() => {
      this.startNewRound();
    }, 10000);
  }

  // --- Authoritative Ticket Purchase ---
  public async buyTicket(
    userId: string,
    selectedNumbers: number[],
    stake: number
  ): Promise<{ success: boolean; ticket?: KenoTicket; error?: string; balance?: number }> {
    const settings = await db.getSettings();

    if (this.currentRound.status !== 'WAITING') {
      return { success: false, error: 'Ticket sales are closed for this round' };
    }
    if (this.remainingSeconds <= 1) {
      return { success: false, error: 'Round countdown ended' };
    }

    if (typeof stake !== 'number' || isNaN(stake) || stake < settings.minStake || stake > settings.maxStake) {
      return { success: false, error: `Stake must be between ${settings.minStake} and ${settings.maxStake} ETB` };
    }

    if (!Array.isArray(selectedNumbers) || selectedNumbers.length < 1 || selectedNumbers.length > 10) {
      return { success: false, error: 'Select between 1 and 10 numbers' };
    }

    try {
      // Deduct balance atomically
      const newBalance = await db.deductBalance(
        userId,
        stake,
        `Keno Bet Round #${this.currentRound.roundNumber}`
      );

      const ticket = await db.createTicket({
        roundId: this.currentRound.id,
        userId,
        selectedNumbers: selectedNumbers.sort((a, b) => a - b),
        stake,
      });

      this.io.emit('ticket_created', ticket);

      return {
        success: true,
        ticket,
        balance: newBalance,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to purchase ticket' };
    }
  }

  public async forceNextRound() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    await this.startNewRound();
  }
}
