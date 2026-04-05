import { supabase } from './supabase';
import { Player } from '../types';

interface DbPlayer {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

function toPlayer(row: DbPlayer): Player {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function fetchPlayers(): Promise<Player[] | null> {
  const { data, error } = await supabase
    .from('players')
    .select('id, user_id, name, created_at')
    .order('created_at');

  if (error) return null;
  return (data as DbPlayer[]).map(toPlayer);
}

export async function upsertPlayers(players: Player[], userId: string): Promise<boolean> {
  const rows: DbPlayer[] = players.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    created_at: p.createdAt,
  }));

  const { error } = await supabase.from('players').upsert(rows);
  return !error;
}

export async function upsertPlayer(player: Player, userId: string): Promise<boolean> {
  const { error } = await supabase.from('players').upsert({
    id: player.id,
    user_id: userId,
    name: player.name,
    created_at: player.createdAt,
  });
  return !error;
}

export async function updatePlayer(id: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('players')
    .update({ name })
    .eq('id', id);
  return !error;
}

export async function deletePlayer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);
  return !error;
}
