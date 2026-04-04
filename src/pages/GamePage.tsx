import { useState, useEffect, useRef } from 'react';
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
import { GameParticipant, Player } from '../types';

// ---- Distribution ----
type DistributionRule =
  | 'winner_takes_all'
  | 'top2_equal'
  | 'top2_6040'
  | 'top3_equal'
  | 'top3_50_30_20'
  | 'custom';

const DIST_RULES: { value: DistributionRule; label: string; percents: number[] }[] = [
  { value: 'winner_takes_all', label: '1er prend tout (100%)', percents: [100] },
  { value: 'top2_equal', label: 'Top 2 — égalité (50/50)', percents: [50, 50] },
  { value: 'top2_6040', label: 'Top 2 — 60% / 40%', percents: [60, 40] },
  { value: 'top3_equal', label: 'Top 3 — égalité', percents: [33.34, 33.33, 33.33] },
  { value: 'top3_50_30_20', label: 'Top 3 — 50% / 30% / 20%', percents: [50, 30, 20] },
  { value: 'custom', label: 'Personnalisé (%)', percents: [] },
];

function computeDistribution(
  orderedIds: string[],
  totalPot: number,
  percents: number[]
): Record<string, number> {
  const amounts: Record<string, number> = {};
  orderedIds.forEach((id, i) => {
    const pct = i < percents.length ? percents[i] : 0;
    amounts[id] = Math.round((totalPot * pct) / 100 * 100) / 100;
  });
  // Fix rounding: remainder goes to 1st place
  const distributed = Object.values(amounts).reduce((s, a) => s + a, 0);
  const diff = Math.round((totalPot - distributed) * 100) / 100;
  if (orderedIds.length > 0) {
    amounts[orderedIds[0]] = Math.round(((amounts[orderedIds[0]] ?? 0) + diff) * 100) / 100;
  }
  return amounts;
}

interface DistributionPanelProps {
  participantIds: string[];
  players: Record<string, Player>;
  totalPot: number;
  onApply: (amounts: Record<string, number>) => void;
}

function DistributionPanel({ participantIds, players, totalPot, onApply }: DistributionPanelProps) {
  const [ranked, setRanked] = useState<string[]>([...participantIds]);
  const [rule, setRule] = useState<DistributionRule>('winner_takes_all');
  const [customPcts, setCustomPcts] = useState<number[]>(() =>
    participantIds.map((_, i) => (i === 0 ? 100 : 0))
  );

  // Drag: React state only for what needs a re-render (dragIndex, dropIndex visibility)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  // Ref stores mutable drag data without triggering re-renders (for smooth position tracking)
  const dragData = useRef<{
    startPointerY: number;
    startGhostTop: number;
    fromIndex: number;
    currentDrop: number;
  } | null>(null);

  // Sync if participants change
  useEffect(() => {
    setRanked((prev) => {
      const ids = new Set(participantIds);
      const filtered = prev.filter((id) => ids.has(id));
      participantIds.forEach((id) => { if (!filtered.includes(id)) filtered.push(id); });
      return filtered;
    });
    setCustomPcts((prev) => participantIds.map((_, i) => prev[i] ?? 0));
  }, [participantIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveUp = (i: number) => {
    if (i === 0) return;
    setRanked((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveDown = (i: number) => {
    if (i === ranked.length - 1) return;
    setRanked((prev) => { const a = [...prev]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; });
  };

  // ---- Drag handlers ----
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    // Don't start drag on button clicks
    if ((e.target as HTMLElement).closest('button')) return;
    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    row.setPointerCapture(e.pointerId);

    dragData.current = {
      startPointerY: e.clientY,
      startGhostTop: rect.top,
      fromIndex: i,
      currentDrop: i,
    };

    if (ghostRef.current) {
      ghostRef.current.style.top = `${rect.top}px`;
      ghostRef.current.style.left = `${rect.left}px`;
      ghostRef.current.style.width = `${rect.width}px`;
      ghostRef.current.style.display = 'flex';
    }

    setDragIndex(i);
    setDropIndex(i);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragData.current || !listRef.current || !ghostRef.current) return;

    // Update ghost position imperatively — no re-render, stays at 60fps
    const delta = e.clientY - dragData.current.startPointerY;
    ghostRef.current.style.top = `${dragData.current.startGhostTop + delta}px`;

    // Find closest item to pointer
    const items = Array.from(listRef.current.children) as HTMLElement[];
    let closest = dragData.current.fromIndex;
    let closestDist = Infinity;
    items.forEach((el, j) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(e.clientY - (r.top + r.height / 2));
      if (dist < closestDist) { closestDist = dist; closest = j; }
    });

    // Trigger re-render only when target slot changes
    if (closest !== dragData.current.currentDrop) {
      dragData.current.currentDrop = closest;
      setDropIndex(closest);
    }
  };

  const commitDrag = () => {
    if (ghostRef.current) ghostRef.current.style.display = 'none';
    if (dragData.current) {
      const { fromIndex, currentDrop } = dragData.current;
      if (fromIndex !== currentDrop) {
        setRanked((prev) => {
          const a = [...prev];
          const [item] = a.splice(fromIndex, 1);
          a.splice(currentDrop, 0, item);
          return a;
        });
      }
    }
    dragData.current = null;
    setDragIndex(null);
    setDropIndex(null);
  };

  const activePercents =
    rule === 'custom'
      ? customPcts
      : (DIST_RULES.find((r) => r.value === rule)?.percents ?? [100]);

  const preview = computeDistribution(ranked, totalPot, activePercents);
  const RANK_LABELS = ['🥇', '🥈', '🥉'];
  const customTotal = customPcts.reduce((s, p) => s + p, 0);
  const customOk = Math.abs(customTotal - 100) < 0.05;

  const ghostPlayer = dragIndex !== null ? players[ranked[dragIndex]] : null;
  const ghostLabel = dragIndex !== null ? (RANK_LABELS[dragIndex] ?? `${dragIndex + 1}.`) : '';

  return (
    <div className="bg-slate-900 border border-emerald-500/25 rounded-2xl p-4 space-y-4">
      <p className="text-sm font-semibold text-white">Distribution automatique</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left — Ranking */}
        <div>
          <p className="text-xs text-slate-400 mb-2">
            Classement{' '}
            <span className="text-slate-600">— glisser ou ↑↓</span>
          </p>
          <div className="space-y-1.5" ref={listRef}>
            {ranked.map((playerId, i) => {
              const player = players[playerId];
              if (!player) return null;
              const rankLabel = RANK_LABELS[i] ?? `${i + 1}.`;
              const isBeingDragged = dragIndex === i;
              const isDropTarget = dropIndex === i && dragIndex !== null && dragIndex !== i;

              return (
                <div
                  key={playerId}
                  className={[
                    'flex items-center gap-2 rounded-xl px-3 py-2.5 select-none transition-all duration-100',
                    // Dragged slot: invisible placeholder so layout is preserved
                    isBeingDragged
                      ? 'opacity-0 pointer-events-none'
                      : 'cursor-grab active:cursor-grabbing',
                    // Drop target: visual highlight
                    isDropTarget
                      ? 'bg-slate-700 ring-2 ring-emerald-500 scale-[1.02]'
                      : 'bg-slate-800 hover:bg-slate-750',
                  ].join(' ')}
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={commitDrag}
                  onPointerCancel={commitDrag}
                  style={{ touchAction: 'none' }}
                >
                  <span className="text-sm w-6 text-center leading-none flex-shrink-0 pointer-events-none">
                    {rankLabel}
                  </span>
                  <span className="flex-1 text-sm text-white truncate pointer-events-none">
                    {player.name}
                  </span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => moveUp(i)}
                      disabled={i === 0 || dragIndex !== null}
                      className="w-6 h-6 rounded text-slate-500 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-sm flex items-center justify-center transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => moveDown(i)}
                      disabled={i === ranked.length - 1 || dragIndex !== null}
                      className="w-6 h-6 rounded text-slate-500 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-sm flex items-center justify-center transition-colors"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — Rule + Preview */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-2">Règle de distribution</p>
            <select
              value={rule}
              onChange={(e) => setRule(e.target.value as DistributionRule)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              {DIST_RULES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {rule === 'custom' && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">Pourcentage par place</p>
              {ranked.map((playerId, i) => {
                const player = players[playerId];
                if (!player) return null;
                return (
                  <div key={playerId} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-14 truncate">{player.name}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={customPcts[i] ?? 0}
                      onChange={(e) => {
                        const next = [...customPcts];
                        next[i] = parseFloat(e.target.value) || 0;
                        setCustomPcts(next);
                      }}
                      className="w-16 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                );
              })}
              <p className={`text-xs font-medium ${customOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                Total : {Math.round(customTotal * 100) / 100}%
                {!customOk && ' ≠ 100%'}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-2">Aperçu</p>
            <div className="space-y-1">
              {ranked.map((playerId) => {
                const player = players[playerId];
                if (!player) return null;
                const amount = preview[playerId] ?? 0;
                return (
                  <div key={playerId} className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{player.name}</span>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        amount > 0 ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {formatCurrencyCompact(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={() => onApply(preview)}
        disabled={rule === 'custom' && !customOk}
      >
        Appliquer les montants
      </Button>

      {/* Ghost: follows cursor during drag — position updated imperatively for 60fps smoothness */}
      <div
        ref={ghostRef}
        style={{ display: 'none', position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}
        className="items-center gap-2 rounded-xl px-3 py-2.5 bg-slate-600 shadow-2xl shadow-black/70 ring-2 ring-emerald-400"
      >
        <span className="text-sm w-6 text-center leading-none flex-shrink-0 text-slate-200">
          {ghostLabel}
        </span>
        <span className="flex-1 text-sm text-white font-semibold truncate">
          {ghostPlayer?.name ?? ''}
        </span>
      </div>
    </div>
  );
}

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
  const [showDistPanel, setShowDistPanel] = useState(false);
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
    setShowDistPanel(false);
    setConfirmReset(false);
  };

  const handleApplyDistribution = (amounts: Record<string, number>) => {
    Object.entries(amounts).forEach(([playerId, amount]) => {
      dispatch({ type: 'SET_FINAL_AMOUNT', payload: { gameId: currentGameId, playerId, amount } });
    });
    setShowDistPanel(false);
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
            onClick={() => {
              const next = !showFinalAmounts;
              setShowFinalAmounts(next);
              if (!next) setShowDistPanel(false);
            }}
          >
            {showFinalAmounts ? '✓ Saisie des résultats' : 'Saisir les résultats'}
          </Button>
          {showFinalAmounts && (
            <Button
              variant={showDistPanel ? 'success' : 'ghost'}
              size="sm"
              onClick={() => setShowDistPanel(!showDistPanel)}
            >
              {showDistPanel ? '✕ Distribution' : '⚡ Distribution auto'}
            </Button>
          )}
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

      {/* Distribution Panel */}
      {showFinalAmounts && !isFinished && showDistPanel && (
        <DistributionPanel
          participantIds={sortedParticipants.map((p) => p.playerId)}
          players={state.players}
          totalPot={totalInvested}
          onApply={handleApplyDistribution}
        />
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
                key={`${participant.playerId}-${participant.finalAmount ?? 'null'}`}
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
