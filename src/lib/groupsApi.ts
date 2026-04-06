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

  // 2. Insérer le créateur comme owner dans group_memberships pour chaque groupe migré
  const membershipRows = groups.map((g) => ({
    group_id: g.id,
    user_id: userId,
    role: 'owner',
  }));

  const { error: membershipError } = await supabase
    .from('group_memberships')
    .upsert(membershipRows, { onConflict: 'group_id,user_id', ignoreDuplicates: true });
  if (membershipError) {
    console.error('[groupsApi] upsertGroups (group_memberships):', membershipError.message);
    // Non bloquant : les groupes sont migrés, on continue
  }

  // 3. Upsert les membres joueurs (group_members)
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

  const { error: playerMemberError } = await supabase.from('group_members').upsert(memberRows);
  if (playerMemberError) {
    console.error('[groupsApi] upsertGroups (group_members):', playerMemberError.message);
    return false;
  }

  return true;
}

export async function upsertGroup(group: Group, userId: string): Promise<boolean> {
  // 1. Upsert le groupe
  const { error: groupError } = await supabase.from('groups').upsert({
    id: group.id,
    user_id: userId,
    name: group.name,
    created_at: group.createdAt,
  });
  if (groupError) {
    console.error('[groupsApi] upsertGroup:', groupError.message, { groupId: group.id });
    return false;
  }

  // 2. Insérer le créateur comme owner dans group_memberships
  const { error: membershipError } = await supabase
    .from('group_memberships')
    .upsert(
      { group_id: group.id, user_id: userId, role: 'owner' },
      { onConflict: 'group_id,user_id', ignoreDuplicates: true }
    );
  if (membershipError) {
    console.error('[groupsApi] upsertGroup (group_memberships):', membershipError.message, { groupId: group.id });
    // Non bloquant : le groupe existe, le membership peut être réinséré plus tard
  }

  return true;
}

export async function updateGroup(id: string, name: string): Promise<boolean> {
  const { error } = await supabase.from('groups').update({ name }).eq('id', id);
  if (error) {
    console.error('[groupsApi] updateGroup:', error.message, { groupId: id });
    return false;
  }
  return true;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) {
    console.error('[groupsApi] deleteGroup:', error.message, { groupId: id });
    return false;
  }
  return true;
}

export async function addMember(groupId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_members')
    .upsert(
      { group_id: groupId, player_id: playerId },
      { onConflict: 'group_id,player_id', ignoreDuplicates: true }
    );
  if (error) {
    console.error('[groupsApi] addMember:', error.message, { groupId, playerId });
    return false;
  }
  return true;
}

export async function removeMember(groupId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('player_id', playerId);
  if (error) {
    console.error('[groupsApi] removeMember:', error.message, { groupId, playerId });
    return false;
  }
  return true;
}
