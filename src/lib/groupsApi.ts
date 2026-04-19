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
    return false;
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

// ── Accès collaboratif (group_memberships) ────────────────────────────────────

export interface GroupMembership {
  userId: string;
  role: 'owner' | 'member';
  email: string;
  displayName: string | null;
}

export async function fetchGroupMemberships(groupId: string): Promise<GroupMembership[] | null> {
  const { data: rows, error } = await supabase
    .from('group_memberships')
    .select('user_id, role')
    .eq('group_id', groupId);

  if (error) {
    console.error('[groupsApi] fetchGroupMemberships:', error.message, { groupId });
    return null;
  }
  if (!rows || rows.length === 0) return [];

  const userIds = (rows as { user_id: string; role: string }[]).map((r) => r.user_id);

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', userIds);

  if (profileError) {
    console.error('[groupsApi] fetchGroupMemberships (profiles):', profileError.message, { groupId });
    return null;
  }

  const profileMap = new Map(
    ((profileRows ?? []) as { id: string; email: string; display_name: string | null }[]).map(
      (p) => [p.id, p]
    )
  );

  return (rows as { user_id: string; role: string }[]).map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      userId: r.user_id,
      role: r.role as 'owner' | 'member',
      email: profile?.email ?? '',
      displayName: profile?.display_name ?? null,
    };
  });
}

export async function addMemberByEmail(
  groupId: string,
  email: string
): Promise<{ displayName: string | null; email: string }> {
  // 1. Rechercher le compte par email via la fonction RPC
  const { data: users, error } = await supabase.rpc('search_user_by_email', {
    search_email: email,
  });

  if (error) throw new Error('Erreur lors de la recherche du compte.');
  if (!users?.length) throw new Error('Aucun compte trouvé avec cet email.');

  const targetUser = (users as { id: string; email: string; display_name: string | null }[])[0];

  // 2. Vérifier qu'il n'est pas déjà membre
  const { data: existing } = await supabase
    .from('group_memberships')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (existing) {
    const name = targetUser.display_name || targetUser.email;
    throw new Error(`${name} est déjà membre de ce groupe.`);
  }

  // 3. Insérer dans group_memberships
  const { error: insertError } = await supabase
    .from('group_memberships')
    .insert({ group_id: groupId, user_id: targetUser.id, role: 'member' });

  if (insertError) throw new Error("Erreur lors de l'ajout du membre.");

  return { displayName: targetUser.display_name, email: targetUser.email };
}
