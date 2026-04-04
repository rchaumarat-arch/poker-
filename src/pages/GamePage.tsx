import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { CurrencyInput } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  calculateTotalInvested,
  calculateGameTotalInvested,
  calculateGameTotalRecovered,
  isGameBalanced,
  getBalanceImbalance,
  getGameTransfers,
} from '../utils/calculations';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatBalanceSign,
} from '../utils/formatters';
import { GameParticipant } from '../types';

// ---- Icons ----
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ---- Participant Card ----
interface ParticipantCardProps {
  participant: GameParticipant;
  playerName: string;
  gameId: string;
  showFinalAmount: boolean;
  isFinished: boolean;
}

function ParticipantCard({
  participant,
  playerName,
  gameId,
  showFinalAmount,
  isFinished,
}: ParticipantCardProps) {
  const { dispatch } = useApp();
  const [buyInValue, setBuyInValue] = useState(String(participant.initialBuyIn));
  const [newRebuyValue, setNewRebuyValue] = useState('50');
  const [finalValue, setFinalValue] = useState(
    participant.finalAmount !== null ? String(participant.finalAmount) : ''
  );
  const [showAddRebuy, setShowAddRebuy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const totalInvested = calculateTotalInvested(participant);
  const netGain =
    participant.finalAmount !== null ? participant.finalAmount - totalInvested : null;

  function commitBuyIn(val: string) {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      dispatch({ type: 'UPDATE_BUYIN', payload: { gameId, playerId: participant.playerId, amount: n } });
    } else {
      setBuyInValue(String(participant.initialBuyIn));
    }
  }

  function commitFinalAmount(val: string) {
    if (val === '' || val === null) {
      dispatch({ type: 'SET_FINAL_AMOUNT', payload: { gameId, playerId: participant.playerId, amount: null } });
      return;
    }
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      dispatch({ type: 'SET_FINAL_AMOUNT', payload: { gameId, playerId: participant.playerId, amount: n } });
    } else {
      setFinalValue(participant.finalAmount !== null ? String(participant.finalAmount) : '');
    }
  }

  function addRebuy() {
    const n = parseFloat(newRebuyValue);
    if (!isNaN(n) && n > 0) {
      dispatch({ type: 'ADD_REBUY', payload: { gameId, playerId: participant.playerId, amount: n } });
      setNewRebuyValue('50');
      setShowAddRebuy(false);
    }
  }

  function updateRebuy(rebuyId: string, val: string) {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      dispatch({ type: 'UPDATE_REBUY', payload: { gameId, playerId: participant.playerId, rebuyId, amount: n } });
    }
  }

  return (
    <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-colors ${
      isFinished
        ? netGain !== null && netGain > 0
          ? 'border-emerald-500/30'
          : netGain !== null && netGain < 0
          ? 'border-red-500/30'
          : 'border-slate-700'
        : 'border-slate-800'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            netGain !== null && netGain > 0
              ? 'bg-emerald-500/15 text-emerald-400'
              : netGain !== null && netGain < 0
              ? 'bg-red-500/15 text-red-400'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {playerName.charAt(0).toUpperCase()}
        </div>
        <span className="flex-1 font-semibold text-white">{playerName}</span>
        {netGain !== null && (
          <span
            className={`font-bold font-mono text-sm ${
              netGain > 0 ? 'text-emerald-400' : netGain < 0 ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {formatBalanceSign(netGain)}
          </span>
        )}
        {!isFinished && (
          <button
            onClick={() => setConfirmRemove(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Buy-in */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Mise initiale</p>
            {isFinished ? (
              <p className="text-white font-mono font-medium">
                {formatCurrencyCompact(participant.initialBuyIn)}
              </p>
            ) : (
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={buyInValue}
                  onChange={(e) => setBuyInValue(e.target.value)}
                  onBlur={(e) => commitBuyIn(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commitBuyIn(buyInValue)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="absolute right-3 text-slate-400 text-xs">€</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Total investi</p>
            <p className="text-white font-mono font-semibold">
              {formatCurrencyCompact(totalInvested)}
            </p>
          </div>
        </div>

        {/* Rebuys */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">
              Recaves ({participant.rebuys.length})
            </p>
            {!isFinished && (
              <button
                onClick={() => setShowAddRebuy(!showAddRebuy)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <PlusIcon />
                Recave
              </button>
            )}
          </div>

          {participant.rebuys.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {participant.rebuys.map((rebuy) => (
                <div
                  key={rebuy.id}
                  className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2 py-1"
                >
                  {isFinished ? (
                    <span className="text-xs text-amber-400 font-mono font-medium">
                      +{formatCurrencyCompact(rebuy.amount)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={rebuy.amount}
                      onBlur={(e) => updateRebuy(rebuy.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateRebuy(rebuy.id, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-16 bg-transparent text-xs text-amber-400 font-mono font-medium focus:outline-none"
                    />
                  )}
                  <span className="text-xs text-slate-500">€</span>
                  {!isFinished && (
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'REMOVE_REBUY',
                          payload: { gameId, playerId: participant.playerId, rebuyId: rebuy.id },
                        })
                      }
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddRebuy && (
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newRebuyValue}
                  onChange={(e) => setNewRebuyValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRebuy()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
              </div>
              <Button variant="primary" size="sm" onClick={addRebuy}>
                OK
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddRebuy(false);
                  setNewRebuyValue('50');
                }}
              >
                ✕
              </Button>
            </div>
          )}
        </div>

        {/* Final Amount */}
        {(showFinalAmount || isFinished) && (
          <div className="pt-3 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Montant récupéré</p>
                {isFinished ? (
                  <p className="text-white font-mono font-medium">
                    {participant.finalAmount !== null
                      ? formatCurrencyCompact(participant.finalAmount)
                      : '—'}
                  </p>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={finalValue}
                      onChange={(e) => setFinalValue(e.target.value)}
                      onBlur={(e) => commitFinalAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitFinalAmount(finalValue)}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 text-slate-400 text-xs">€</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Gain / Perte</p>
                {netGain !== null ? (
                  <p
                    className={`font-mono font-bold ${
                      netGain > 0
                        ? 'text-emerald-400'
                        : netGain < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatBalanceSign(netGain)}
                  </p>
                ) : (
                  <p className="text-slate-600 text-sm">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          dispatch({
            type: 'REMOVE_PARTICIPANT',
            payload: { gameId, playerId: participant.playerId },
          });
          setConfirmRemove(false);
        }}
        title="Retirer le joueur"
        message={`Retirer ${playerName} de cette partie ? Son historique de mise sera supprimé.`}
        confirmLabel="Retirer"
      />
    </div>
  );
}

// ---- Main GamePage ----
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { state, dispatch } = useApp();

  const [showFinalAmounts, setShowFinalAmounts] = useState(false);
  const [addPlayerModal, setAddPlayerModal] = useState(false);
  const [addPlayerBuyIn, setAddPlayerBuyIn] = useState('50');
  const [selectedNewPlayer, setSelectedNewPlayer] = useState('');
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const game = gameId ? state.games[gameId] : null;

  if (!game) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-slate-400">Partie introuvable.</p>
        <Link to="/">
          <Button variant="secondary">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const group = state.groups[game.groupId];
  const isFinished = game.status === 'finished';
  const participants = Object.values(game.participants);

  const totalInvested = calculateGameTotalInvested(game);
  const totalRecovered = calculateGameTotalRecovered(game);
  const allFinalsFilled = participants.length > 0 && participants.every((p) => p.finalAmount !== null);
  const balanced = isGameBalanced(game);
  const imbalance = getBalanceImbalance(game);
  const transfers = isFinished ? getGameTransfers(game) : [];

  // Available players to add (group members not already in game)
  const existingPlayerIds = new Set(Object.keys(game.participants));
  const availablePlayers = (group?.memberIds ?? [])
    .map((id) => state.players[id])
    .filter((p) => p && !existingPlayerIds.has(p.id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentGameId = game.id;

  const handleAddPlayer = () => {
    if (!selectedNewPlayer) return;
    const buyIn = parseFloat(addPlayerBuyIn) || 0;
    dispatch({
      type: 'ADD_PARTICIPANT',
      payload: { gameId: currentGameId, playerId: selectedNewPlayer, initialBuyIn: buyIn },
    });
    setAddPlayerModal(false);
    setSelectedNewPlayer('');
    setAddPlayerBuyIn('50');
  };

  const handleFinish = () => {
    dispatch({ type: 'FINISH_GAME', payload: { id: currentGameId } });
    setShowFinalAmounts(false);
    setConfirmFinish(false);
  };

  const handleReopen = () => {
    dispatch({ type: 'REOPEN_GAME', payload: { id: currentGameId } });
    setConfirmReopen(false);
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_GAME_RESULTS', payload: { id: currentGameId } });
    setConfirmReset(false);
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    const na = state.players[a.playerId]?.name ?? '';
    const nb = state.players[b.playerId]?.name ?? '';
    return na.localeCompare(nb);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          to={group ? `/groups/${group.id}` : '/'}
          className="mt-0.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <ChevronLeftIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{game.name}</h1>
            <Badge variant={isFinished ? 'success' : 'warning'} dot={!isFinished}>
              {isFinished ? 'Terminée' : 'En cours'}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {formatDate(game.date)}
            {group && (
              <span>
                {' '}•{' '}
                <Link
                  to={`/groups/${group.id}`}
                  className="hover:text-slate-200 transition-colors"
                >
                  {group.name}
                </Link>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Total misé</p>
          <p className="font-bold font-mono text-white text-base">
            {formatCurrencyCompact(totalInvested)}
          </p>
        </div>
        <div className="text-center border-x border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Redistribué</p>
          <p className="font-bold font-mono text-white text-base">
            {formatCurrencyCompact(totalRecovered)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Balance</p>
          {allFinalsFilled ? (
            <p
              className={`font-bold font-mono text-base ${
                balanced ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {balanced ? '✓ OK' : formatBalanceSign(imbalance)}
            </p>
          ) : (
            <p className="text-slate-600 text-base">—</p>
          )}
        </div>
      </div>

      {/* Balance error */}
      {allFinalsFilled && !balanced && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <span className="text-red-400 text-base flex-shrink-0">⚠</span>
          <p className="text-red-300 text-sm">
            <strong>Déséquilibre de {formatCurrency(Math.abs(imbalance))}</strong> — La somme
            récupérée doit être exactement égale à la somme investie (
            {formatCurrency(totalInvested)}). Vérifiez les montants saisis.
          </p>
        </div>
      )}

      {/* Action bar */}
      {!isFinished && (
        <div className="flex flex-wrap gap-2">
          {availablePlayers.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<PlusIcon />}
              onClick={() => setAddPlayerModal(true)}
            >
              Ajouter un joueur
            </Button>
          )}
          <Button
            variant={showFinalAmounts ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowFinalAmounts(!showFinalAmounts)}
          >
            {showFinalAmounts ? '✓ Saisie des résultats' : 'Saisir les résultats'}
          </Button>
          {showFinalAmounts && allFinalsFilled && balanced && (
            <Button
              variant="success"
              size="sm"
              icon={<CheckIcon />}
              onClick={() => setConfirmFinish(true)}
            >
              Terminer la partie
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshIcon />}
            onClick={() => setConfirmReset(true)}
          >
            Réinitialiser
          </Button>
        </div>
      )}

      {isFinished && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshIcon />}
            onClick={() => setConfirmReopen(true)}
          >
            Rouvrir la partie
          </Button>
        </div>
      )}

      {/* Participant Cards */}
      {participants.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-slate-400">Aucun joueur dans cette partie.</p>
          {availablePlayers.length > 0 && (
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => setAddPlayerModal(true)}
            >
              Ajouter des joueurs
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant) => {
            const player = state.players[participant.playerId];
            if (!player) return null;
            return (
              <ParticipantCard
                key={participant.playerId}
                participant={participant}
                playerName={player.name}
                gameId={game.id}
                showFinalAmount={showFinalAmounts}
                isFinished={isFinished}
              />
            );
          })}
        </div>
      )}

      {/* Results section (when finished) */}
      {isFinished && (
        <div className="space-y-5 pt-2">
          {/* Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-semibold text-white">Résultats de la partie</h2>
            </div>
            <div className="divide-y divide-slate-800">
              {[...sortedParticipants]
                .sort((a, b) => {
                  const ga = (a.finalAmount ?? 0) - calculateTotalInvested(a);
                  const gb = (b.finalAmount ?? 0) - calculateTotalInvested(b);
                  return gb - ga;
                })
                .map((p, index) => {
                  const player = state.players[p.playerId];
                  if (!player) return null;
                  const invested = calculateTotalInvested(p);
                  const gain = (p.finalAmount ?? 0) - invested;
                  const isWinner = gain > 0;
                  const isLoser = gain < 0;
                  return (
                    <div
                      key={p.playerId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="text-slate-600 text-sm font-mono w-5 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isWinner
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : isLoser
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-white">
                        {player.name}
                      </span>
                      <div className="text-right text-xs text-slate-500 hidden sm:block">
                        <span>{formatCurrencyCompact(invested)} misé</span>
                        <span className="mx-1">→</span>
                        <span>{formatCurrencyCompact(p.finalAmount ?? 0)}</span>
                      </div>
                      <span
                        className={`font-bold font-mono text-sm ml-2 ${
                          isWinner
                            ? 'text-emerald-400'
                            : isLoser
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatBalanceSign(gain)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Optimal transfers */}
          {transfers.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-white">Remboursements à effectuer</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan optimal pour équilibrer les comptes
                </p>
              </div>
              <div className="space-y-2">
                {transfers.map((t, i) => {
                  const from = state.players[t.from];
                  const to = state.players[t.to];
                  if (!from || !to) return null;
                  return (
                    <div
                      key={i}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2 flex-wrap"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                        {from.name.charAt(0)}
                      </div>
                      <span className="text-slate-300 text-sm font-medium">{from.name}</span>
                      <span className="text-slate-600 text-sm">paye</span>
                      <span className="font-bold font-mono text-white bg-slate-800 rounded-lg px-2 py-0.5 text-sm">
                        {formatCurrencyCompact(t.amount)}
                      </span>
                      <span className="text-slate-600 text-sm">à</span>
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

          {transfers.length === 0 && participants.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-emerald-400 font-medium">
                ✓ Aucun remboursement nécessaire — tout le monde est quitte !
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Player Modal */}
      <Modal
        isOpen={addPlayerModal}
        onClose={() => setAddPlayerModal(false)}
        title="Ajouter un joueur"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Joueur</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {availablePlayers.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <input
                    type="radio"
                    name="newPlayer"
                    value={p.id}
                    checked={selectedNewPlayer === p.id}
                    onChange={() => setSelectedNewPlayer(p.id)}
                    className="accent-emerald-500"
                  />
                  <span className="text-white text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <CurrencyInput
            label="Mise initiale"
            value={addPlayerBuyIn}
            onChange={setAddPlayerBuyIn}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setAddPlayerModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPlayer}
              disabled={!selectedNewPlayer}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Finish */}
      <ConfirmDialog
        isOpen={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={handleFinish}
        title="Terminer la partie"
        message={`Terminer la partie ? Les résultats seront verrouillés. Total redistribué: ${formatCurrency(totalRecovered)}.`}
        confirmLabel="Terminer"
        variant="warning"
      />

      {/* Confirm Reopen */}
      <ConfirmDialog
        isOpen={confirmReopen}
        onClose={() => setConfirmReopen(false)}
        onConfirm={handleReopen}
        title="Rouvrir la partie"
        message="La partie repassera en mode 'En cours'. Les résultats seront modifiables."
        confirmLabel="Rouvrir"
        variant="warning"
      />

      {/* Confirm Reset */}
      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Réinitialiser les résultats"
        message="Tous les montants finaux seront effacés. Les mises et recaves seront conservées."
        confirmLabel="Réinitialiser"
      />
    </div>
  );
}
