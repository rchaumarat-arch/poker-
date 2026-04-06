import { supabase } from './supabase';
import { SettlementRecord } from '../types';

interface DbSettlement {
  id: string;
  user_id: string;
  group_id: string;
  player_id: string;
  settled_balance: number;
  date: string;
  note: string;
}

function toSettlement(row: DbSettlement): SettlementRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    playerId: row.player_id,
    settledBalance: row.settled_balance,
    date: row.date,
    note: row.note,
  };
}

export async function fetchSettlements(): Promise<SettlementRecord[] | null> {
  const { data, error } = await supabase
    .from('settlements')
    .select('id, user_id, group_id, player_id, settled_balance, date, note')
    .order('date');

  if (error) {
    console.error('[settlementsApi] fetchSettlements:', error.message);
    return null;
  }
  return (data as DbSettlement[]).map(toSettlement);
}

export async function upsertSettlements(
  settlements: SettlementRecord[],
  userId: string,
  knownGroupIds: Set<string>,
  knownPlayerIds: Set<string>
): Promise<boolean> {
  if (settlements.length === 0) return true;

  const rows: DbSettlement[] = [];

  for (const s of settlements) {
    if (!knownGroupIds.has(s.groupId)) {
      console.warn('[settlementsApi] upsertSettlements: groupId absent de Supabase, settlement ignoré', {
        settlementId: s.id,
        groupId: s.groupId,
      });
      continue;
    }
    if (!knownPlayerIds.has(s.playerId)) {
      console.warn('[settlementsApi] upsertSettlements: playerId absent de Supabase, settlement ignoré', {
        settlementId: s.id,
        playerId: s.playerId,
      });
      continue;
    }
    rows.push({
      id: s.id,
      user_id: userId,
      group_id: s.groupId,
      player_id: s.playerId,
      settled_balance: s.settledBalance,
      date: s.date,
      note: s.note,
    });
  }

  if (rows.length === 0) return true;

  const { error } = await supabase.from('settlements').upsert(rows);
  if (error) {
    console.error('[settlementsApi] upsertSettlements:', error.message);
    return false;
  }
  return true;
}

export async function insertSettlement(
  settlement: SettlementRecord,
  userId: string
): Promise<boolean> {
  const { error } = await supabase.from('settlements').insert({
    id: settlement.id,
    user_id: userId,
    group_id: settlement.groupId,
    player_id: settlement.playerId,
    settled_balance: settlement.settledBalance,
    date: settlement.date,
    note: settlement.note,
  });
  if (error) {
    console.error('[settlementsApi] insertSettlement:', error.message, { settlementId: settlement.id });
    return false;
  }
  return true;
}

export async function deleteSettlement(id: string): Promise<boolean> {
  const { error } = await supabase.from('settlements').delete().eq('id', id);
  if (error) {
    console.error('[settlementsApi] deleteSettlement:', error.message, { settlementId: id });
    return false;
  }
  return true;
}
