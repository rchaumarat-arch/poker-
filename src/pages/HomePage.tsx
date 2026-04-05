import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/formatters';

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

// Assign a suit symbol per group (cycles through the 4 suits)
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_CLASSES = ['suit-spade', 'suit-spade', 'suit-heart', 'suit-diamond'];

export default function HomePage() {
  const { state, dispatch, exportData, importData } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | null>(null);

  const [playerModal, setPlayerModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);

  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [membersGroupId, setMembersGroupId] = useState<string | null>(null);

  const groups = Object.values(state.groups).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const players = Object.values(state.players).sort((a, b) => a.name.localeCompare(b.name));

  function openCreateGroup() { setGroupName(''); setEditGroupId(null); setGroupModal(true); }
  function openEditGroup(id: string) { setGroupName(state.groups[id].name); setEditGroupId(id); setGroupModal(true); }
  function submitGroup() {
    const name = groupName.trim();
    if (!name) return;
    if (editGroupId) dispatch({ type: 'UPDATE_GROUP', payload: { id: editGroupId, name } });
    else dispatch({ type: 'ADD_GROUP', payload: { name, memberIds: [] } });
    setGroupModal(false); setGroupName('');
  }

  function openCreatePlayer() { setPlayerName(''); setEditPlayerId(null); setPlayerModal(true); }
  function openEditPlayer(id: string) { setPlayerName(state.players[id].name); setEditPlayerId(id); setPlayerModal(true); }
  function submitPlayer() {
    const name = playerName.trim();
    if (!name) return;
    if (editPlayerId) dispatch({ type: 'UPDATE_PLAYER', payload: { id: editPlayerId, name } });
    else dispatch({ type: 'ADD_PLAYER', payload: { name } });
    setPlayerModal(false); setPlayerName('');
  }

  function getGroupStats(groupId: string) {
    const group = state.groups[groupId];
    const games = Object.values(state.games).filter((g) => g.groupId === groupId);
    const activeGames = games.filter((g) => g.status === 'in-progress');
    const lastGame = games.sort((a, b) => b.date.localeCompare(a.date))[0];
    return { memberCount: group.memberIds.length, gameCount: games.length, activeGames: activeGames.length, lastDate: lastGame?.date };
  }

  const membersGroup = membersGroupId ? state.groups[membersGroupId] : null;

  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--gold)', opacity: 0.5 }} className="text-lg">♦</span>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-warm)', letterSpacing: '-0.03em' }}>
              Mes groupes
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Gérez vos tables de poker et l'historique des parties
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon />} onClick={openCreateGroup}>
          Nouveau groupe
        </Button>
      </div>

      {/* ── Groups ── */}
      {groups.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl" style={{ color: 'var(--gold)', opacity: 0.3, letterSpacing: '0.2rem' }}>
            ♠ ♥ ♦ ♣
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Aucun groupe pour l'instant.</p>
          <Button variant="primary" icon={<PlusIcon />} onClick={openCreateGroup}>
            Créer votre premier groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, idx) => {
            const stats = getGroupStats(group.id);
            const suit = SUITS[idx % 4];
            const suitCls = SUIT_CLASSES[idx % 4];
            return (
              <div
                key={group.id}
                className="card card-interactive"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="flex items-center gap-4 p-4" onClick={(e) => e.stopPropagation()}>

                  {/* Avatar */}
                  <button
                    className="flex-shrink-0"
                    onClick={() => navigate(`/groups/${group.id}`)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'rgba(201,160,48,0.1)', border: '1px solid rgba(201,160,48,0.28)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                  >
                    <span className={`text-base leading-none ${suitCls}`}>{suit}</span>
                    <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--gold-bright)' }}>
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {/* Info */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-warm)' }}>
                        {group.name}
                      </span>
                      {stats.activeGames > 0 && (
                        <Badge variant="warning" dot>{stats.activeGames} en cours</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{stats.memberCount} membre{stats.memberCount > 1 ? 's' : ''}</span>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span>{stats.gameCount} partie{stats.gameCount > 1 ? 's' : ''}</span>
                      {stats.lastDate && (
                        <>
                          <span style={{ opacity: 0.4 }}>•</span>
                          <span>{formatDate(stats.lastDate)}</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMembersGroupId(group.id); }}
                      className="btn-ghost btn-sm !p-2 !rounded-lg"
                      title="Gérer les membres"
                    >
                      <UserIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditGroup(group.id); }}
                      className="btn-ghost btn-sm !p-2 !rounded-lg"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteGroupId(group.id); }}
                      className="btn-ghost btn-sm !p-2 !rounded-lg"
                      style={{ color: 'rgba(240,128,128,0.6)' }}
                    >
                      <TrashIcon />
                    </button>
                    <div className="w-px h-5 mx-1" style={{ background: 'rgba(201,160,48,0.15)' }} />
                    <button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="btn-ghost btn-sm !p-2 !rounded-lg"
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Players ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-header">Joueurs</h2>
          <Button variant="ghost" size="sm" icon={<PlusIcon />} onClick={openCreatePlayer}>
            Ajouter
          </Button>
        </div>
        {players.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun joueur enregistré.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((player) => {
              const groupCount = Object.values(state.groups).filter((g) =>
                g.memberIds.includes(player.id)
              ).length;
              return (
                <div key={player.id} className="card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--gold)', opacity: 0.5, fontSize: '0.7rem' }}>♣</span>
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-warm)' }}>
                        {player.name}
                      </p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {groupCount} groupe{groupCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEditPlayer(player.id)} className="btn-ghost btn-sm !p-1.5 !rounded-lg">
                      <EditIcon />
                    </button>
                    <button onClick={() => setDeletePlayerId(player.id)} className="btn-ghost btn-sm !p-1.5 !rounded-lg" style={{ color: 'rgba(240,128,128,0.6)' }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Data Management ── */}
      <div className="space-y-3 pt-5" style={{ borderTop: '1px solid rgba(201,160,48,0.1)' }}>
        <h2 className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Données
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" icon={<DownloadIcon />} onClick={exportData}>Exporter JSON</Button>
          <Button variant="ghost" size="sm" icon={<UploadIcon />} onClick={() => fileRef.current?.click()}>Importer JSON</Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'LOAD_DEMO' })}>Charger démo</Button>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; }} />
      </div>

      {/* ── Modals ── */}
      <Modal isOpen={groupModal} onClose={() => setGroupModal(false)}
        title={editGroupId ? 'Renommer le groupe' : 'Créer un groupe'} size="sm">
        <div className="space-y-4">
          <Input label="Nom du groupe" value={groupName} onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Les Potes du Vendredi" onKeyDown={(e) => e.key === 'Enter' && submitGroup()} autoFocus />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setGroupModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={submitGroup} disabled={!groupName.trim()}>
              {editGroupId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={playerModal} onClose={() => setPlayerModal(false)}
        title={editPlayerId ? 'Modifier le joueur' : 'Ajouter un joueur'} size="sm">
        <div className="space-y-4">
          <Input label="Nom du joueur" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ex: Alice" onKeyDown={(e) => e.key === 'Enter' && submitPlayer()} autoFocus />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPlayerModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={submitPlayer} disabled={!playerName.trim()}>
              {editPlayerId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      {membersGroup && (
        <Modal isOpen={!!membersGroupId} onClose={() => setMembersGroupId(null)}
          title={`Membres — ${membersGroup.name}`} size="sm">
          <div className="space-y-4">
            {players.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Créez d'abord des joueurs dans la section "Joueurs".</p>
            ) : (
              <div className="space-y-1">
                {players.map((player) => {
                  const isMember = membersGroup.memberIds.includes(player.id);
                  return (
                    <label key={player.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                      style={{ background: isMember ? 'rgba(201,160,48,0.06)' : 'transparent' }}
                    >
                      <input type="checkbox" checked={isMember}
                        onChange={() => {
                          if (isMember) dispatch({ type: 'REMOVE_MEMBER', payload: { groupId: membersGroup.id, playerId: player.id } });
                          else dispatch({ type: 'ADD_MEMBER', payload: { groupId: membersGroup.id, playerId: player.id } });
                        }}
                        className="w-4 h-4 accent-amber-500 flex-shrink-0"
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-warm)' }}>{player.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setMembersGroupId(null)}>Terminé</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteGroupId} onClose={() => setDeleteGroupId(null)}
        onConfirm={() => { if (deleteGroupId) dispatch({ type: 'DELETE_GROUP', payload: { id: deleteGroupId } }); setDeleteGroupId(null); }}
        title="Supprimer le groupe"
        message="Cette action supprimera le groupe et toutes ses parties. Cette action est irréversible."
        confirmLabel="Supprimer" />
      <ConfirmDialog isOpen={!!deletePlayerId} onClose={() => setDeletePlayerId(null)}
        onConfirm={() => { if (deletePlayerId) dispatch({ type: 'DELETE_PLAYER', payload: { id: deletePlayerId } }); setDeletePlayerId(null); }}
        title="Supprimer le joueur"
        message="Ce joueur sera retiré de tous les groupes et parties. Son historique sera perdu."
        confirmLabel="Supprimer" />
    </div>
  );
}
