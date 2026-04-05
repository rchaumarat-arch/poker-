import { supabase } from './supabase';
import { Game, GameParticipant, Rebuy } from '../types';

// ── Types DB ────────────────────────────────────────────────────────────────

interface DbRebuy {
  id: string;
  game_id: string;
  player_id: string;
  amount: number;
}

interface DbParticipant {
  game_id: string;
  player_id: string;
  initial_buy_in: number;
  final_amount: number | null;
  rebuys: DbRebuy[];
}

interface DbGame {
  id: string;
  user_id: string;
  group_id: string;
  name: string;
  date: string;
  status: string;
  created_at: string;
  game_participants: DbParticipant[];
}

// ── Conversion DB → AppState ─────────────────────────────────────────────────

function toGame(row: DbGame): Game {
  const participants: Record<string, GameParticipant> = {};

  for (const p of row.game_participants) {
    const rebuys: Rebuy[] = p.rebuys.map((r) => ({ id: r.id, amount: r.amount }));
    participants[p.player_id] = {
      playerId: p.player_id,
      initialBuyIn: p.initial_buy_in,
      finalAmount: p.final_amount,
      rebuys,
    };
  }

  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    date: row.date,
    status: row.status as Game['status'],
    createdAt: row.created_at,
    participants,
  };
}

// ── Lecture ──────────────────────────────────────────────────────────────────

export async function fetchGames(): Promise<Game[] | null> {
  // rebuys est imbriqué dans game_participants grâce à la FK composite
  // (game_id, player_id) → game_participants(game_id, player_id)
  const { data, error } = await supabase
    .from('games')
    .select(`
      id, user_id, group_id, name, date, status, created_at,
      game_participants (
        game_id, player_id, initial_buy_in, final_amount,
        rebuys ( id, game_id, player_id, amount )
      )
    `)
    .order('created_at');

  if (error) {
    console.error('[gamesApi] fetchGames:', error.message);
    return null;
  }

  return (data as DbGame[]).map(toGame);
}

// ── Migration one-shot ───────────────────────────────────────────────────────

export async function upsertGames(
  games: Game[],
  userId: string,
  knownGroupIds: Set<string>,
  knownPlayerIds: Set<string>
): Promise<boolean> {
  if (games.length === 0) return true;

  // 1. Filtrer et upsert les games (FK group_id → groups)
  const gameRows: { id: string; user_id: string; group_id: string; name: string; date: string; status: string; created_at: string }[] = [];

  for (const g of games) {
    if (!knownGroupIds.has(g.groupId)) {
      console.warn('[gamesApi] upsertGames: groupId absent de Supabase, game ignoré', {
        gameId: g.id,
        groupId: g.groupId,
      });
      continue;
    }
    gameRows.push({
      id: g.id,
      user_id: userId,
      group_id: g.groupId,
      name: g.name,
      date: g.date,
      status: g.status,
      created_at: g.createdAt,
    });
  }

  if (gameRows.length === 0) return true;

  const { error: gameError } = await supabase.from('games').upsert(gameRows);
  if (gameError) {
    console.error('[gamesApi] upsertGames (games):', gameError.message);
    return false;
  }

  const migratedGameIds = new Set(gameRows.map((r) => r.id));

  // 2. Upsert les game_participants (FK game_id + player_id)
  const participantRows: { game_id: string; player_id: string; initial_buy_in: number; final_amount: number | null }[] = [];

  for (const g of games) {
    if (!migratedGameIds.has(g.id)) continue; // game ignoré à l'étape 1
    for (const p of Object.values(g.participants)) {
      if (!knownPlayerIds.has(p.playerId)) {
        console.warn('[gamesApi] upsertGames: playerId absent de Supabase, participant ignoré', {
          gameId: g.id,
          playerId: p.playerId,
        });
        continue;
      }
      participantRows.push({
        game_id: g.id,
        player_id: p.playerId,
        initial_buy_in: p.initialBuyIn,
        final_amount: p.finalAmount,
      });
    }
  }

  if (participantRows.length > 0) {
    const { error: participantError } = await supabase.from('game_participants').upsert(participantRows);
    if (participantError) {
      console.error('[gamesApi] upsertGames (game_participants):', participantError.message);
      return false;
    }
  }

  // 3. Upsert les rebuys (FK composite → game_participants)
  const migratedParticipantKeys = new Set(participantRows.map((r) => `${r.game_id}:${r.player_id}`));
  const rebuyRows: { id: string; game_id: string; player_id: string; amount: number }[] = [];

  for (const g of games) {
    if (!migratedGameIds.has(g.id)) continue;
    for (const p of Object.values(g.participants)) {
      if (!migratedParticipantKeys.has(`${g.id}:${p.playerId}`)) continue; // participant ignoré
      for (const r of p.rebuys) {
        rebuyRows.push({ id: r.id, game_id: g.id, player_id: p.playerId, amount: r.amount });
      }
    }
  }

  if (rebuyRows.length > 0) {
    const { error: rebuyError } = await supabase.from('rebuys').upsert(rebuyRows);
    if (rebuyError) {
      console.error('[gamesApi] upsertGames (rebuys):', rebuyError.message);
      return false;
    }
  }

  return true;
}
