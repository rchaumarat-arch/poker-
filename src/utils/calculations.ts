import { Game, GameParticipant, Transfer, AppState, PlayerCumulativeStats } from '../types';

export function calculateTotalInvested(participant: GameParticipant): number {
  const rebuysTotal = participant.rebuys.reduce((sum, r) => sum + r.amount, 0);
  return participant.initialBuyIn + rebuysTotal;
}

export function calculateGameTotalInvested(game: Game): number {
  return Object.values(game.participants).reduce(
    (sum, p) => sum + calculateTotalInvested(p),
    0
  );
}

export function calculateGameTotalRecovered(game: Game): number {
  return Object.values(game.participants).reduce(
    (sum, p) => sum + (p.finalAmount ?? 0),
    0
  );
}

export function isGameComplete(game: Game): boolean {
  const participants = Object.values(game.participants);
  return participants.length > 0 && participants.every((p) => p.finalAmount !== null);
}

export function isGameBalanced(game: Game): boolean {
  const totalInvested = calculateGameTotalInvested(game);
  const totalRecovered = calculateGameTotalRecovered(game);
  return Math.abs(totalInvested - totalRecovered) < 0.005;
}

export function getBalanceImbalance(game: Game): number {
  const totalInvested = calculateGameTotalInvested(game);
  const totalRecovered = calculateGameTotalRecovered(game);
  return totalRecovered - totalInvested;
}

/**
 * Calculates the minimal set of transfers to settle all debts.
 * Uses greedy matching of largest debtor with largest creditor.
 */
export function calculateOptimalTransfers(
  balances: { id: string; balance: number }[]
): Transfer[] {
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ id: b.id, balance: b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ id: b.id, balance: b.balance }))
    .sort((a, b) => a.balance - b.balance);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(-debtors[di].balance, creditors[ci].balance);
    if (amount > 0.005) {
      transfers.push({
        from: debtors[di].id,
        to: creditors[ci].id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[di].balance = Math.round((debtors[di].balance + amount) * 100) / 100;
    creditors[ci].balance = Math.round((creditors[ci].balance - amount) * 100) / 100;
    if (Math.abs(debtors[di].balance) < 0.005) di++;
    if (Math.abs(creditors[ci].balance) < 0.005) ci++;
  }

  return transfers;
}

export function getGameTransfers(game: Game): Transfer[] {
  if (game.status !== 'finished') return [];
  const balances = Object.values(game.participants).map((p) => ({
    id: p.playerId,
    balance: (p.finalAmount ?? 0) - calculateTotalInvested(p),
  }));
  return calculateOptimalTransfers(balances);
}

export function getPlayerCumulativeStats(
  playerId: string,
  groupId: string,
  state: AppState
): PlayerCumulativeStats {
  const groupGames = Object.values(state.games).filter(
    (g) => g.groupId === groupId && g.status === 'finished'
  );

  let gamesPlayed = 0;
  let totalInvested = 0;
  let totalRecovered = 0;

  for (const game of groupGames) {
    const p = game.participants[playerId];
    if (!p) continue;
    gamesPlayed++;
    totalInvested += calculateTotalInvested(p);
    totalRecovered += p.finalAmount ?? 0;
  }

  const netBalance = totalRecovered - totalInvested;

  const settledAmount = state.settlements
    .filter((s) => s.groupId === groupId && s.playerId === playerId)
    .reduce((sum, s) => sum + s.settledBalance, 0);

  const currentBalance = netBalance - settledAmount;

  return {
    playerId,
    gamesPlayed,
    totalInvested,
    totalRecovered,
    netBalance,
    settledAmount,
    currentBalance,
  };
}

export function getGroupCumulativeTransfers(
  groupId: string,
  state: AppState
): Transfer[] {
  const group = state.groups[groupId];
  if (!group) return [];

  const balances = group.memberIds.map((playerId) => ({
    id: playerId,
    balance: getPlayerCumulativeStats(playerId, groupId, state).currentBalance,
  }));

  return calculateOptimalTransfers(balances);
}
