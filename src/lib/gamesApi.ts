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
    if (!migratedGameIds.has(g.id)) continue;
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
      if (!migratedParticipantKeys.has(`${g.id}:${p.playerId}`)) continue;
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

// ── Écriture ─────────────────────────────────────────────────────────────────

export async function upsertGame(
  game: { id: string; groupId: string; name: string; date: string; status: string; createdAt: string },
  participantIds: string[],
  initialBuyIn: number,
  userId: string
): Promise<boolean> {
  const { error: gameError } = await supabase.from('games').upsert({
    id: game.id,
    user_id: userId,
    group_id: game.groupId,
    name: game.name,
    date: game.date,
    status: game.status,
    created_at: game.createdAt,
  });
  if (gameError) {
    console.error('[gamesApi] upsertGame:', gameError.message, { gameId: game.id });
    return false;
  }

  if (participantIds.length === 0) return true;

  const participantRows = participantIds.map((playerId) => ({
    game_id: game.id,
    player_id: playerId,
    initial_buy_in: initialBuyIn,
    final_amount: null,
  }));

  const { error: participantError } = await supabase
    .from('game_participants')
    .upsert(participantRows, { onConflict: 'game_id,player_id', ignoreDuplicates: true });
  if (participantError) {
    console.error('[gamesApi] upsertGame (participants):', participantError.message, { gameId: game.id });
    return false;
  }

  return true;
}

export async function updateGame(id: string, fields: { name?: string; date?: string }): Promise<boolean> {
  const { error } = await supabase.from('games').update(fields).eq('id', id);
  if (error) {
    console.error('[gamesApi] updateGame:', error.message, { gameId: id });
    return false;
  }
  return true;
}

export async function deleteGame(id: string): Promise<boolean> {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) {
    console.error('[gamesApi] deleteGame:', error.message, { gameId: id });
    return false;
  }
  return true;
}

export async function addParticipant(gameId: string, playerId: string, initialBuyIn: number): Promise<boolean> {
  // upsert idempotent : même précaution que addMember pour éviter une erreur de contrainte PK
  const { error } = await supabase
    .from('game_participants')
    .upsert(
      { game_id: gameId, player_id: playerId, initial_buy_in: initialBuyIn, final_amount: null },
      { onConflict: 'game_id,player_id', ignoreDuplicates: true }
    );
  if (error) {
    console.error('[gamesApi] addParticipant:', error.message, { gameId, playerId });
    return false;
  }
  return true;
}

export async function removeParticipant(gameId: string, playerId: string): Promise<boolean> {
  // La FK composite rebuys → game_participants cascade supprime les rebuys du participant
  const { error } = await supabase
    .from('game_participants')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId);
  if (error) {
    console.error('[gamesApi] removeParticipant:', error.message, { gameId, playerId });
    return false;
  }
  return true;
}

export async function updateBuyIn(gameId: string, playerId: string, amount: number): Promise<boolean> {
  const { error } = await supabase
    .from('game_participants')
    .update({ initial_buy_in: amount })
    .eq('game_id', gameId)
    .eq('player_id', playerId);
  if (error) {
    console.error('[gamesApi] updateBuyIn:', error.message, { gameId, playerId });
    return false;
  }
  return true;
}

export async function addRebuy(rebuyId: string, gameId: string, playerId: string, amount: number): Promise<boolean> {
  const { error } = await supabase
    .from('rebuys')
    .insert({ id: rebuyId, game_id: gameId, player_id: playerId, amount });
  if (error) {
    console.error('[gamesApi] addRebuy:', error.message, { rebuyId, gameId, playerId });
    return false;
  }
  return true;
}

export async function updateRebuy(rebuyId: string, amount: number): Promise<boolean> {
  const { error } = await supabase.from('rebuys').update({ amount }).eq('id', rebuyId);
  if (error) {
    console.error('[gamesApi] updateRebuy:', error.message, { rebuyId });
    return false;
  }
  return true;
}

export async function removeRebuy(rebuyId: string): Promise<boolean> {
  const { error } = await supabase.from('rebuys').delete().eq('id', rebuyId);
  if (error) {
    console.error('[gamesApi] removeRebuy:', error.message, { rebuyId });
    return false;
  }
  return true;
}

export async function setFinalAmount(gameId: string, playerId: string, amount: number | null): Promise<boolean> {
  const { error } = await supabase
    .from('game_participants')
    .update({ final_amount: amount })
    .eq('game_id', gameId)
    .eq('player_id', playerId);
  if (error) {
    console.error('[gamesApi] setFinalAmount:', error.message, { gameId, playerId });
    return false;
  }
  return true;
}

export async function finishGame(id: string): Promise<boolean> {
  const { error } = await supabase.from('games').update({ status: 'finished' }).eq('id', id);
  if (error) {
    console.error('[gamesApi] finishGame:', error.message, { gameId: id });
    return false;
  }
  return true;
}

export async function reopenGame(id: string): Promise<boolean> {
  const { error } = await supabase.from('games').update({ status: 'in-progress' }).eq('id', id);
  if (error) {
    console.error('[gamesApi] reopenGame:', error.message, { gameId: id });
    return false;
  }
  return true;
}

export async function resetGameResults(id: string): Promise<boolean> {
  // Deux opérations séquentielles : remettre final_amount à null pour tous les participants,
  // puis remettre le statut du game à 'in-progress'
  const { error: participantError } = await supabase
    .from('game_participants')
    .update({ final_amount: null })
    .eq('game_id', id);
  if (participantError) {
    console.error('[gamesApi] resetGameResults (participants):', participantError.message, { gameId: id });
    return false;
  }

  const { error: gameError } = await supabase
    .from('games')
    .update({ status: 'in-progress' })
    .eq('id', id);
  if (gameError) {
    console.error('[gamesApi] resetGameResults (status):', gameError.message, { gameId: id });
    return false;
  }

  return true;
}
