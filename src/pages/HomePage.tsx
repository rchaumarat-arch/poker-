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
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

export default function HomePage() {
  const { state, dispatch, exportData, importData } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Group modal
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | null>(null);

  // Player modal
  const [playerModal, setPlayerModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);

  // Delete confirms
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);

  // Manage members modal
  const [membersGroupId, setMembersGroupId] = useState<string | null>(null);

  const groups = Object.values(state.groups).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const players = Object.values(state.players).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  function openCreateGroup() {
    setGroupName('');
    setEditGroupId(null);
    setGroupModal(true);
  }

  function openEditGroup(id: string) {
    setGroupName(state.groups[id].name);
    setEditGroupId(id);
    setGroupModal(true);
  }

  function submitGroup() {
    const name = groupName.trim();
    if (!name) return;
    if (editGroupId) {
      dispatch({ type: 'UPDATE_GROUP', payload: { id: editGroupId, name } });
    } else {
      dispatch({ type: 'ADD_GROUP', payload: { name, memberIds: [] } });
    }
    setGroupModal(false);
    setGroupName('');
  }

  function openCreatePlayer() {
    setPlayerName('');
    setEditPlayerId(null);
    setPlayerModal(true);
  }

  function openEditPlayer(id: string) {
    setPlayerName(state.players[id].name);
    setEditPlayerId(id);
    setPlayerModal(true);
  }

  function submitPlayer() {
    const name = playerName.trim();
    if (!name) return;
    if (editPlayerId) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { id: editPlayerId, name } });
    } else {
      dispatch({ type: 'ADD_PLAYER', payload: { name } });
    }
    setPlayerModal(false);
    setPlayerName('');
  }

  function getGroupStats(groupId: string) {
    const group = state.groups[groupId];
    const games = Object.values(state.games).filter((g) => g.groupId === groupId);
    const activeGames = games.filter((g) => g.status === 'in-progress');
    const lastGame = games.sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      memberCount: group.memberIds.length,
      gameCount: games.length,
      activeGames: activeGames.length,
      lastDate: lastGame?.date,
    };
  }

  const membersGroup = membersGroupId ? state.groups[membersGroupId] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes groupes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gérez vos groupes de poker et l'historique des parties
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon />} onClick={openCreateGroup}>
          Nouveau groupe
        </Button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl" style={{ color: '#e8b94a' }}>♠</div>
          <p className="text-slate-400">Aucun groupe pour l'instant.</p>
          <Button variant="primary" icon={<PlusIcon />} onClick={openCreateGroup}>
            Créer votre premier groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const stats = getGroupStats(group.id);
            return (
              <div
                key={group.id}
                className="rounded-2xl p-4 transition-all hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, #0e2018 0%, #081510 100%)',
                  border: '1px solid rgba(201, 144, 48, 0.18)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(201, 144, 48, 0.12)',
                        border: '1px solid rgba(201, 144, 48, 0.3)',
                      }}
                    >
                      <span className="font-bold text-base" style={{ color: '#e8b94a' }}>
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{group.name}</span>
                        {stats.activeGames > 0 && (
                          <Badge variant="warning" dot>
                            {stats.activeGames} en cours
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{stats.memberCount} membre{stats.memberCount > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{stats.gameCount} partie{stats.gameCount > 1 ? 's' : ''}</span>
                        {stats.lastDate && (
                          <>
                            <span>•</span>
                            <span>Dernière: {formatDate(stats.lastDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMembersGroupId(group.id);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Gérer les membres"
                    >
                      <UserIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditGroup(group.id);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteGroupId(group.id);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                    <button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
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

      {/* Players Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Joueurs</h2>
          <Button variant="ghost" size="sm" icon={<PlusIcon />} onClick={openCreatePlayer}>
            Ajouter
          </Button>
        </div>
        {players.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun joueur enregistré.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((player) => {
              const groupCount = Object.values(state.groups).filter((g) =>
                g.memberIds.includes(player.id)
              ).length;
              return (
                <div
                  key={player.id}
                  className="rounded-xl p-3 flex items-center justify-between gap-2"
                  style={{
                    background: '#0e2018',
                    border: '1px solid rgba(201, 144, 48, 0.12)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{player.name}</p>
                    <p className="text-xs text-slate-500">
                      {groupCount} groupe{groupCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => openEditPlayer(player.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => setDeletePlayerId(player.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="pt-6 space-y-3" style={{ borderTop: '1px solid rgba(201, 144, 48, 0.12)' }}>
        <h2 className="text-sm font-medium text-slate-400">Données</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" icon={<DownloadIcon />} onClick={exportData}>
            Exporter JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<UploadIcon />}
            onClick={() => fileRef.current?.click()}
          >
            Importer JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'LOAD_DEMO' })}
          >
            Charger démo
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importData(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Group Modal */}
      <Modal
        isOpen={groupModal}
        onClose={() => setGroupModal(false)}
        title={editGroupId ? 'Renommer le groupe' : 'Créer un groupe'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du groupe"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Les Potes du Vendredi"
            onKeyDown={(e) => e.key === 'Enter' && submitGroup()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setGroupModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={submitGroup} disabled={!groupName.trim()}>
              {editGroupId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Player Modal */}
      <Modal
        isOpen={playerModal}
        onClose={() => setPlayerModal(false)}
        title={editPlayerId ? 'Modifier le joueur' : 'Ajouter un joueur'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du joueur"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ex: Alice"
            onKeyDown={(e) => e.key === 'Enter' && submitPlayer()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPlayerModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={submitPlayer} disabled={!playerName.trim()}>
              {editPlayerId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Members Modal */}
      {membersGroup && (
        <Modal
          isOpen={!!membersGroupId}
          onClose={() => setMembersGroupId(null)}
          title={`Membres — ${membersGroup.name}`}
          size="sm"
        >
          <div className="space-y-4">
            {players.length === 0 ? (
              <p className="text-slate-400 text-sm">
                Créez d'abord des joueurs dans la section "Joueurs".
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((player) => {
                  const isMember = membersGroup.memberIds.includes(player.id);
                  return (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-felt-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => {
                          if (isMember) {
                            dispatch({
                              type: 'REMOVE_MEMBER',
                              payload: { groupId: membersGroup.id, playerId: player.id },
                            });
                          } else {
                            dispatch({
                              type: 'ADD_MEMBER',
                              payload: { groupId: membersGroup.id, playerId: player.id },
                            });
                          }
                        }}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span className="text-white text-sm font-medium">{player.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setMembersGroupId(null)}>
                Terminé
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirms */}
      <ConfirmDialog
        isOpen={!!deleteGroupId}
        onClose={() => setDeleteGroupId(null)}
        onConfirm={() => {
          if (deleteGroupId) dispatch({ type: 'DELETE_GROUP', payload: { id: deleteGroupId } });
          setDeleteGroupId(null);
        }}
        title="Supprimer le groupe"
        message="Cette action supprimera le groupe et toutes ses parties. Cette action est irréversible."
        confirmLabel="Supprimer"
      />
      <ConfirmDialog
        isOpen={!!deletePlayerId}
        onClose={() => setDeletePlayerId(null)}
        onConfirm={() => {
          if (deletePlayerId) dispatch({ type: 'DELETE_PLAYER', payload: { id: deletePlayerId } });
          setDeletePlayerId(null);
        }}
        title="Supprimer le joueur"
        message="Ce joueur sera retiré de tous les groupes et parties. Son historique sera perdu."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
