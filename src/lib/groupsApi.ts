import { supabase } from './supabase';
import { Group } from '../types';

interface DbGroup {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  group_members: { player_id: string }[];
}

function toGroup(row: DbGroup): Group {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    memberIds: row.group_members.map((m) => m.player_id),
  };
}

export async function fetchGroups(): Promise<Group[] | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, user_id, name, created_at, group_members(player_id)')
    .order('created_at');

  if (error) {
    console.error('[groupsApi] fetchGroups:', error.message);
    return null;
  }
  return (data as DbGroup[]).map(toGroup);
}

export async function upsertGroups(
  groups: Group[],
  userId: string,
  knownPlayerIds: Set<string>
): Promise<boolean> {
  if (groups.length === 0) return true;

  // 1. Upsert les groupes
  const groupRows = groups.map((g) => ({
    id: g.id,
    user_id: userId,
    name: g.name,
    created_at: g.createdAt,
  }));

  const { error: groupError } = await supabase.from('groups').upsert(groupRows);
  if (groupError) {
    console.error('[groupsApi] upsertGroups (groups):', groupError.message);
    return false;
  }

  // 2. Upsert les members — en filtrant les playerIds absents de Supabase
  const memberRows: { group_id: string; player_id: string }[] = [];

  for (const g of groups) {
    for (const playerId of g.memberIds) {
      if (!knownPlayerIds.has(playerId)) {
        console.warn(
          '[groupsApi] upsertGroups: memberId absent de Supabase, ignoré',
          { groupId: g.id, playerId }
        );
        continue;
      }
      memberRows.push({ group_id: g.id, player_id: playerId });
    }
  }

  if (memberRows.length === 0) return true;

  const { error: memberError } = await supabase
    .from('group_members')
    .upsert(memberRows);

  if (memberError) {
    console.error('[groupsApi] upsertGroups (group_members):', memberError.message);
    return false;
  }

  return true;
}
