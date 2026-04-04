export type GameStatus = 'in-progress' | 'finished';

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export interface Rebuy {
  id: string;
  amount: number;
}

export interface GameParticipant {
  playerId: string;
  initialBuyIn: number;
  rebuys: Rebuy[];
  finalAmount: number | null;
}

export interface Game {
  id: string;
  groupId: string;
  name: string;
  date: string;
  status: GameStatus;
  participants: Record<string, GameParticipant>;
  createdAt: string;
}

export interface SettlementRecord {
  id: string;
  groupId: string;
  playerId: string;
  settledBalance: number;
  date: string;
  note: string;
}

export interface AppState {
  players: Record<string, Player>;
  groups: Record<string, Group>;
  games: Record<string, Game>;
  settlements: SettlementRecord[];
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface PlayerCumulativeStats {
  playerId: string;
  gamesPlayed: number;
  totalInvested: number;
  totalRecovered: number;
  netBalance: number;
  settledAmount: number;
  currentBalance: number;
}
