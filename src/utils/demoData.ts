import { AppState } from '../types';

export function createDemoData(): AppState {
  const players = {
    p1: { id: 'p1', name: 'Alice', createdAt: '2024-01-01T00:00:00Z' },
    p2: { id: 'p2', name: 'Bob', createdAt: '2024-01-01T00:00:00Z' },
    p3: { id: 'p3', name: 'Charlie', createdAt: '2024-01-01T00:00:00Z' },
    p4: { id: 'p4', name: 'Diana', createdAt: '2024-01-01T00:00:00Z' },
    p5: { id: 'p5', name: 'Éric', createdAt: '2024-01-01T00:00:00Z' },
  };

  const groups = {
    g1: {
      id: 'g1',
      name: 'Les Potes du Vendredi',
      memberIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      createdAt: '2024-01-01T00:00:00Z',
    },
  };

  // Game 1: total invested = 350, total recovered = 350
  // p1: 50, p2: 100, p3: 50, p4: 100, p5: 50 => 350
  // p1:75, p2:20, p3:110, p4:40, p5:105 => 350 ✓
  const game1 = {
    id: 'game1',
    groupId: 'g1',
    name: 'Partie du 15 mars',
    date: '2024-03-15',
    status: 'finished' as const,
    createdAt: '2024-03-15T20:00:00Z',
    participants: {
      p1: { playerId: 'p1', initialBuyIn: 50, rebuys: [], finalAmount: 75 },
      p2: {
        playerId: 'p2',
        initialBuyIn: 50,
        rebuys: [{ id: 'r1', amount: 50 }],
        finalAmount: 20,
      },
      p3: { playerId: 'p3', initialBuyIn: 50, rebuys: [], finalAmount: 110 },
      p4: {
        playerId: 'p4',
        initialBuyIn: 50,
        rebuys: [{ id: 'r2', amount: 50 }],
        finalAmount: 40,
      },
      p5: { playerId: 'p5', initialBuyIn: 50, rebuys: [], finalAmount: 105 },
    },
  };

  // Game 2: total invested = 300, total recovered = 300
  // p1: 100, p2: 50, p3: 50, p5: 100 => 300
  // p1:30, p2:120, p3:0, p5:150 => 300 ✓
  const game2 = {
    id: 'game2',
    groupId: 'g1',
    name: 'Partie du 22 mars',
    date: '2024-03-22',
    status: 'finished' as const,
    createdAt: '2024-03-22T20:00:00Z',
    participants: {
      p1: {
        playerId: 'p1',
        initialBuyIn: 50,
        rebuys: [{ id: 'r3', amount: 50 }],
        finalAmount: 30,
      },
      p2: { playerId: 'p2', initialBuyIn: 50, rebuys: [], finalAmount: 120 },
      p3: { playerId: 'p3', initialBuyIn: 50, rebuys: [], finalAmount: 0 },
      p5: {
        playerId: 'p5',
        initialBuyIn: 50,
        rebuys: [{ id: 'r4', amount: 50 }],
        finalAmount: 150,
      },
    },
  };

  // Game 3: in progress
  const game3 = {
    id: 'game3',
    groupId: 'g1',
    name: 'Partie du 5 avril',
    date: '2024-04-05',
    status: 'in-progress' as const,
    createdAt: '2024-04-05T20:00:00Z',
    participants: {
      p1: { playerId: 'p1', initialBuyIn: 50, rebuys: [], finalAmount: null },
      p2: { playerId: 'p2', initialBuyIn: 50, rebuys: [], finalAmount: null },
      p4: {
        playerId: 'p4',
        initialBuyIn: 50,
        rebuys: [{ id: 'r5', amount: 50 }],
        finalAmount: null,
      },
    },
  };

  return {
    players,
    groups,
    games: { game1, game2, game3 },
    settlements: [],
  };
}
