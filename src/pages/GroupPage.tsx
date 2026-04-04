import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input, CurrencyInput } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  getPlayerCumulativeStats,
  getGroupCumulativeTransfers,
  calculateGameTotalInvested,
} from '../utils/calculations';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateTime,
  formatBalanceSign,
  today,
} from '../utils/formatters';

// ---- Icons ----
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

type Tab = 'games' | 'balances' | 'history';

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('games');

  // New game modal
  const [gameModal, setGameModal] = useState(false);
  const [gameName, setGameName] = useState('');
  const [gameDate, setGameDate] = useState(today());
  const [gameInitialBuyIn, setGameInitialBuyIn] = useState('50');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [updateExistingBuyIn, setUpdateExistingBuyIn] = useState(false);

  // Delete game
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);

  // Settle player
  const [settlePlayerId, setSettlePlayerId] = useState<string | null>(null);
  const [settleNote, setSettleNote] = useState('');

  // Delete settlement
  const [deleteSettlementId, setDeleteSettlementId] = useState<string | null>(null);

  // Filter
  const [filterPlayerId, setFilterPlayerId] = useState('');

  const group = groupId ? state.groups[groupId] : null;

  if (!group) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-slate-400">Groupe introuvable.</p>
        <Link to="/">
          <Button variant="secondary">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const members = group.memberIds
    .map((id) => state.players[id])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const groupGames = Object.values(state.games)
    .filter((g) => g.groupId === group.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const openCreateGame = () => {
    setGameName(`Partie du ${formatDate(today())}`);
    setGameDate(today());
    setGameInitialBuyIn('50');
    setSelectedPlayers(new Set(group.memberIds));
    setEditGameId(null);
    setUpdateExistingBuyIn(false);
    setGameModal(true);
  };

  const openEditGame = (gid: string) => {
    const g = state.games[gid];
    // Pre-fill buy-in from existing participants (take the most common value)
    const existingBuyIns = Object.values(g.participants).map((p) => p.initialBuyIn);
    const defaultBuyIn = existingBuyIns.length > 0 ? String(existingBuyIns[0]) : '50';
    setGameName(g.name);
    setGameDate(g.date);
    setEditGameId(gid);
    setGameInitialBuyIn(defaultBuyIn);
    setSelectedPlayers(new Set(Object.keys(g.participants)));
    setUpdateExistingBuyIn(false);
    setGameModal(true);
  };

  const submitGame = () => {
    const name = gameName.trim();
    if (!name || selectedPlayers.size === 0) return;
    const buyIn = parseFloat(gameInitialBuyIn) || 0;

    if (editGameId) {
      dispatch({ type: 'UPDATE_GAME', payload: { id: editGameId, name, date: gameDate } });
      const currentGame = state.games[editGameId];
      const currentIds = new Set(Object.keys(currentGame.participants));

      // Update buy-in of existing participants if requested
      if (updateExistingBuyIn) {
        for (const playerId of currentIds) {
          if (selectedPlayers.has(playerId)) {
            dispatch({ type: 'UPDATE_BUYIN', payload: { gameId: editGameId, playerId, amount: buyIn } });
          }
        }
      }

      // Add new participants
      for (const playerId of selectedPlayers) {
        if (!currentIds.has(playerId)) {
          dispatch({ type: 'ADD_PARTICIPANT', payload: { gameId: editGameId, playerId, initialBuyIn: buyIn } });
        }
      }
      // Remove deselected participants
      for (const playerId of currentIds) {
        if (!selectedPlayers.has(playerId)) {
          dispatch({ type: 'REMOVE_PARTICIPANT', payload: { gameId: editGameId, playerId } });
        }
      }
    } else {
      dispatch({
        type: 'ADD_GAME',
        payload: {
          groupId: group.id,
          name,
          date: gameDate,
          participantIds: Array.from(selectedPlayers),
          initialBuyIn: buyIn,
        },
      });
    }
    setGameModal(false);
  };

  // Cumulative stats
  const memberStats = members.map((p) =>
    getPlayerCumulativeStats(p.id, group.id, state)
  );

  const cumulativeTransfers = getGroupCumulativeTransfers(group.id, state);

  // Settlements for this group
  const groupSettlements = state.settlements
    .filter((s) => s.groupId === group.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredSettlements = filterPlayerId
    ? groupSettlements.filter((s) => s.playerId === filterPlayerId)
    : groupSettlements;

  const handleSettle = (playerId: string) => {
    setSettlePlayerId(playerId);
    setSettleNote('Remboursement effectué');
  };

  const confirmSettle = () => {
    if (!settlePlayerId) return;
    const stats = getPlayerCumulativeStats(settlePlayerId, group.id, state);
    dispatch({
      type: 'SETTLE_PLAYER',
      payload: {
        groupId: group.id,
        playerId: settlePlayerId,
        balance: stats.currentBalance,
        note: settleNote || 'Remboursement effectué',
      },
    });
    setSettlePlayerId(null);
    setSettleNote('');
  };

  const settlingPlayer = settlePlayerId ? state.players[settlePlayerId] : null;
  const settlingStats = settlePlayerId
    ? getPlayerCumulativeStats(settlePlayerId, group.id, state)
    : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'games', label: 'Parties' },
    { id: 'balances', label: 'Soldes' },
    { id: 'history', label: 'Historique' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ChevronLeftIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{group.name}</h1>
          <p className="text-sm text-slate-400">{members.length} membre{members.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-2xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- GAMES TAB --- */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {groupGames.length} partie{groupGames.length > 1 ? 's' : ''}
            </p>
            <Button variant="primary" size="sm" icon={<PlusIcon />} onClick={openCreateGame}>
              Nouvelle partie
            </Button>
          </div>

          {groupGames.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-400">Aucune partie pour l'instant.</p>
              <Button variant="primary" icon={<PlusIcon />} onClick={openCreateGame}>
                Créer la première partie
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {groupGames.map((game) => {
                const totalInvested = calculateGameTotalInvested(game);
                const participantCount = Object.keys(game.participants).length;
                const isFinished = game.status === 'finished';
                return (
                  <div
                    key={game.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                        onClick={() => navigate(`/games/${game.id}`)}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isFinished
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'bg-amber-500/10 border border-amber-500/30'
                          }`}
                        >
                          {isFinished ? (
                            <CheckIcon />
                          ) : (
                            <span className="text-amber-400 text-xs font-bold">EN</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white truncate">{game.name}</span>
                            <Badge variant={isFinished ? 'success' : 'warning'} dot={!isFinished}>
                              {isFinished ? 'Terminée' : 'En cours'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{formatDate(game.date)}</span>
                            <span>•</span>
                            <span>{participantCount} joueur{participantCount > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{formatCurrencyCompact(totalInvested)} misés</span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditGame(game.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setDeleteGameId(game.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                        <button
                          onClick={() => navigate(`/games/${game.id}`)}
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
        </div>
      )}

      {/* --- BALANCES TAB --- */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Per-player stats */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Soldes cumulés</h2>
            {members.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun membre dans ce groupe.</p>
            ) : (
              <div className="space-y-2">
                {memberStats
                  .sort((a, b) => b.currentBalance - a.currentBalance)
                  .map((stats) => {
                    const player = state.players[stats.playerId];
                    if (!player) return null;
                    const isPositive = stats.currentBalance > 0.005;
                    const isNegative = stats.currentBalance < -0.005;
                    const isSettled = !isPositive && !isNegative;
                    return (
                      <div
                        key={stats.playerId}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                                isPositive
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : isNegative
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{player.name}</p>
                              <p className="text-xs text-slate-500">
                                {stats.gamesPlayed} partie{stats.gamesPlayed > 1 ? 's' : ''}
                                {stats.settledAmount !== 0 && (
                                  <span>
                                    {' '}• réglé: {formatBalanceSign(stats.settledAmount)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p
                                className={`font-bold font-mono text-sm ${
                                  isPositive
                                    ? 'text-emerald-400'
                                    : isNegative
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {formatBalanceSign(stats.currentBalance)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isSettled ? 'Soldé' : isPositive ? 'À recevoir' : 'À payer'}
                              </p>
                            </div>
                            {!isSettled && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleSettle(stats.playerId)}
                              >
                                Régler
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500">Misé</p>
                            <p className="text-white font-mono font-medium">
                              {formatCurrencyCompact(stats.totalInvested)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Récupéré</p>
                            <p className="text-white font-mono font-medium">
                              {formatCurrencyCompact(stats.totalRecovered)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Bilan net</p>
                            <p
                              className={`font-mono font-medium ${
                                stats.netBalance > 0
                                  ? 'text-emerald-400'
                                  : stats.netBalance < 0
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {formatBalanceSign(stats.netBalance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Optimal transfers */}
          {cumulativeTransfers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-white">
                Remboursements optimaux
              </h2>
              <p className="text-xs text-slate-500">
                Plan minimal pour équilibrer tous les soldes non réglés
              </p>
              <div className="space-y-2">
                {cumulativeTransfers.map((t, i) => {
                  const from = state.players[t.from];
                  const to = state.players[t.to];
                  if (!from || !to) return null;
                  return (
                    <div
                      key={i}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                        {from.name.charAt(0)}
                      </div>
                      <span className="text-slate-300 text-sm font-medium">{from.name}</span>
                      <ArrowRightIcon />
                      <span className="font-bold font-mono text-emerald-400 text-sm">
                        {formatCurrencyCompact(t.amount)}
                      </span>
                      <ArrowRightIcon />
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                        {to.name.charAt(0)}
                      </div>
                      <span className="text-slate-300 text-sm font-medium">{to.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cumulativeTransfers.length === 0 && memberStats.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-emerald-400 font-medium text-sm">✓ Tous les comptes sont soldés</p>
            </div>
          )}
        </div>
      )}

      {/* --- HISTORY TAB --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Historique des règlements</h2>
          </div>

          {/* Filter by player */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterPlayerId('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterPlayerId === ''
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              {members.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFilterPlayerId(p.id === filterPlayerId ? '' : p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterPlayerId === p.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {filteredSettlements.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 text-sm">Aucun règlement enregistré.</p>
              <p className="text-slate-600 text-xs mt-1">
                Utilisez "Régler" dans l'onglet Soldes pour enregistrer un remboursement.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSettlements.map((settlement) => {
                const player = state.players[settlement.playerId];
                if (!player) return null;
                return (
                  <div
                    key={settlement.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                      {player.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{player.name}</span>
                        <Badge variant="success">
                          <CheckIcon />
                          Réglé
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{settlement.note}</p>
                      <p className="text-xs text-slate-600">{formatDateTime(settlement.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm font-bold font-mono ${
                          settlement.settledBalance > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatBalanceSign(settlement.settledBalance)}
                      </p>
                      <p className="text-xs text-slate-500">soldé</p>
                    </div>
                    <button
                      onClick={() => setDeleteSettlementId(settlement.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New/Edit Game Modal */}
      <Modal
        isOpen={gameModal}
        onClose={() => setGameModal(false)}
        title={editGameId ? 'Modifier la partie' : 'Nouvelle partie'}
        size="md"
      >
        <div className="space-y-5">
          <Input
            label="Nom de la partie"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Ex: Partie du vendredi"
          />
          <Input
            label="Date"
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
          />
          <CurrencyInput
            label={editGameId ? 'Mise initiale' : 'Mise initiale par joueur'}
            value={gameInitialBuyIn}
            onChange={setGameInitialBuyIn}
            placeholder="50"
          />
          {editGameId && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={updateExistingBuyIn}
                onChange={(e) => setUpdateExistingBuyIn(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 flex-shrink-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Mettre à jour la mise de tous les joueurs existants
              </span>
            </label>
          )}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              Joueurs participants
            </p>
            {members.length === 0 ? (
              <p className="text-slate-500 text-sm">
                Aucun membre dans ce groupe.{' '}
                <Link to="/" className="text-emerald-400 underline">
                  Gérer les membres →
                </Link>
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {members.map((player) => {
                  const isSelected = selectedPlayers.has(player.id);
                  return (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = new Set(selectedPlayers);
                          if (isSelected) next.delete(player.id);
                          else next.add(player.id);
                          setSelectedPlayers(next);
                        }}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span className="text-white text-sm">{player.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedPlayers.size === 0 && (
              <p className="text-xs text-red-400 mt-1">
                Sélectionnez au moins un joueur.
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setGameModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={submitGame}
              disabled={!gameName.trim() || selectedPlayers.size === 0}
            >
              {editGameId ? 'Enregistrer' : 'Créer la partie'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Game Confirm */}
      <ConfirmDialog
        isOpen={!!deleteGameId}
        onClose={() => setDeleteGameId(null)}
        onConfirm={() => {
          if (deleteGameId) dispatch({ type: 'DELETE_GAME', payload: { id: deleteGameId } });
          setDeleteGameId(null);
        }}
        title="Supprimer la partie"
        message="Toutes les données de cette partie (mises, recaves, résultats) seront supprimées définitivement."
        confirmLabel="Supprimer"
      />

      {/* Settle Player Modal */}
      <Modal
        isOpen={!!settlePlayerId}
        onClose={() => setSettlePlayerId(null)}
        title={`Régler le solde — ${settlingPlayer?.name}`}
        size="sm"
      >
        {settlingStats && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border ${
                settlingStats.currentBalance > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <p className="text-sm text-slate-300">Solde actuel à régler</p>
              <p
                className={`text-2xl font-bold font-mono mt-1 ${
                  settlingStats.currentBalance > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatBalanceSign(settlingStats.currentBalance)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {settlingStats.currentBalance > 0
                  ? `${settlingPlayer?.name} a ${formatCurrency(settlingStats.currentBalance)} à recevoir des autres joueurs`
                  : `${settlingPlayer?.name} doit ${formatCurrency(Math.abs(settlingStats.currentBalance))} aux autres joueurs`}
              </p>
            </div>
            <Input
              label="Note (optionnel)"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
              placeholder="Ex: Remboursement en liquide"
            />
            <p className="text-xs text-slate-500">
              Le solde actuel sera marqué comme réglé. L'historique des parties ne sera pas modifié.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setSettlePlayerId(null)}>
                Annuler
              </Button>
              <Button variant="success" icon={<CheckIcon />} onClick={confirmSettle}>
                Marquer comme réglé
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Settlement Confirm */}
      <ConfirmDialog
        isOpen={!!deleteSettlementId}
        onClose={() => setDeleteSettlementId(null)}
        onConfirm={() => {
          if (deleteSettlementId)
            dispatch({
              type: 'DELETE_SETTLEMENT',
              payload: { id: deleteSettlementId },
            });
          setDeleteSettlementId(null);
        }}
        title="Annuler le règlement"
        message="Ce règlement sera supprimé et le solde du joueur sera recalculé sans ce règlement."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
