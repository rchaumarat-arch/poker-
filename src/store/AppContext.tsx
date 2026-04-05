import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { AppState, GameParticipant } from '../types';
import { createDemoData } from '../utils/demoData';
import { generateId } from '../utils/formatters';
import { fetchPlayers, upsertPlayers, upsertPlayer, updatePlayer, deletePlayer } from '../lib/playersApi';
import { fetchGroups, upsertGroups, upsertGroup, updateGroup, deleteGroup, addMember, removeMember } from '../lib/groupsApi';
import { fetchGames, upsertGames } from '../lib/gamesApi';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'poker-tracker-v1';

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AppState;
  } catch {
    // ignore
  }
  return createDemoData();
}

type Action =
  | { type: 'ADD_PLAYER'; payload: { name: string; id?: string; createdAt?: string } }
  | { type: 'UPDATE_PLAYER'; payload: { id: string; name: string } }
  | { type: 'DELETE_PLAYER'; payload: { id: string } }
  | { type: 'ADD_GROUP'; payload: { name: string; memberIds: string[]; id?: string; createdAt?: string } }
  | { type: 'UPDATE_GROUP'; payload: { id: string; name: string } }
  | { type: 'DELETE_GROUP'; payload: { id: string } }
  | { type: 'ADD_MEMBER'; payload: { groupId: string; playerId: string } }
  | { type: 'REMOVE_MEMBER'; payload: { groupId: string; playerId: string } }
  | {
      type: 'ADD_GAME';
      payload: {
        groupId: string;
        name: string;
        date: string;
        participantIds: string[];
        initialBuyIn: number;
      };
    }
  | { type: 'UPDATE_GAME'; payload: { id: string; name?: string; date?: string } }
  | { type: 'DELETE_GAME'; payload: { id: string } }
  | {
      type: 'ADD_PARTICIPANT';
      payload: { gameId: string; playerId: string; initialBuyIn: number };
    }
  | { type: 'REMOVE_PARTICIPANT'; payload: { gameId: string; playerId: string } }
  | {
      type: 'UPDATE_BUYIN';
      payload: { gameId: string; playerId: string; amount: number };
    }
  | {
      type: 'ADD_REBUY';
      payload: { gameId: string; playerId: string; amount: number };
    }
  | {
      type: 'UPDATE_REBUY';
      payload: {
        gameId: string;
        playerId: string;
        rebuyId: string;
        amount: number;
      };
    }
  | {
      type: 'REMOVE_REBUY';
      payload: { gameId: string; playerId: string; rebuyId: string };
    }
  | {
      type: 'SET_FINAL_AMOUNT';
      payload: { gameId: string; playerId: string; amount: number | null };
    }
  | { type: 'FINISH_GAME'; payload: { id: string } }
  | { type: 'REOPEN_GAME'; payload: { id: string } }
  | { type: 'RESET_GAME_RESULTS'; payload: { id: string } }
  | {
      type: 'SETTLE_PLAYER';
      payload: {
        groupId: string;
        playerId: string;
        balance: number;
        note: string;
      };
    }
  | { type: 'DELETE_SETTLEMENT'; payload: { id: string } }
  | { type: 'IMPORT_STATE'; payload: AppState }
  | { type: 'LOAD_DEMO' }
  | { type: 'SYNC_PLAYERS'; payload: AppState['players'] }
  | { type: 'SYNC_GROUPS'; payload: AppState['groups'] }
  | { type: 'SYNC_GAMES'; payload: AppState['games'] };

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const id = action.payload.id ?? generateId();
      const createdAt = action.payload.createdAt ?? new Date().toISOString();
      return {
        ...state,
        players: {
          ...state.players,
          [id]: { id, name: action.payload.name, createdAt },
        },
      };
    }

    case 'UPDATE_PLAYER': {
      const { id, name } = action.payload;
      return {
        ...state,
        players: { ...state.players, [id]: { ...state.players[id], name } },
      };
    }

    case 'DELETE_PLAYER': {
      const { id } = action.payload;
      const s = clone(state);
      delete s.players[id];
      Object.values(s.groups).forEach((g) => {
        g.memberIds = g.memberIds.filter((mid) => mid !== id);
      });
      Object.values(s.games).forEach((g) => {
        delete g.participants[id];
      });
      s.settlements = s.settlements.filter((st) => st.playerId !== id);
      return s;
    }

    case 'ADD_GROUP': {
      const id = action.payload.id ?? generateId();
      const createdAt = action.payload.createdAt ?? new Date().toISOString();
      return {
        ...state,
        groups: {
          ...state.groups,
          [id]: { id, name: action.payload.name, memberIds: action.payload.memberIds, createdAt },
        },
      };
    }

    case 'UPDATE_GROUP': {
      const { id, name } = action.payload;
      return {
        ...state,
        groups: { ...state.groups, [id]: { ...state.groups[id], name } },
      };
    }

    case 'DELETE_GROUP': {
      const { id } = action.payload;
      const s = clone(state);
      delete s.groups[id];
      Object.keys(s.games).forEach((gameId) => {
        if (s.games[gameId].groupId === id) delete s.games[gameId];
      });
      s.settlements = s.settlements.filter((st) => st.groupId !== id);
      return s;
    }

    case 'ADD_MEMBER': {
      const { groupId, playerId } = action.payload;
      const group = state.groups[groupId];
      if (!group || group.memberIds.includes(playerId)) return state;
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: { ...group, memberIds: [...group.memberIds, playerId] },
        },
      };
    }

    case 'REMOVE_MEMBER': {
      const { groupId, playerId } = action.payload;
      const group = state.groups[groupId];
      if (!group) return state;
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            memberIds: group.memberIds.filter((id) => id !== playerId),
          },
        },
      };
    }

    case 'ADD_GAME': {
      const { groupId, name, date, participantIds, initialBuyIn } = action.payload;
      const id = generateId();
      const participants: Record<string, GameParticipant> = {};
      participantIds.forEach((playerId) => {
        participants[playerId] = {
          playerId,
          initialBuyIn,
          rebuys: [],
          finalAmount: null,
        };
      });
      return {
        ...state,
        games: {
          ...state.games,
          [id]: {
            id,
            groupId,
            name,
            date,
            status: 'in-progress',
            participants,
            createdAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'UPDATE_GAME': {
      const { id, name, date } = action.payload;
      return {
        ...state,
        games: {
          ...state.games,
          [id]: {
            ...state.games[id],
            ...(name !== undefined && { name }),
            ...(date !== undefined && { date }),
          },
        },
      };
    }

    case 'DELETE_GAME': {
      const s = clone(state);
      delete s.games[action.payload.id];
      return s;
    }

    case 'ADD_PARTICIPANT': {
      const { gameId, playerId, initialBuyIn } = action.payload;
      const s = clone(state);
      s.games[gameId].participants[playerId] = {
        playerId,
        initialBuyIn,
        rebuys: [],
        finalAmount: null,
      };
      return s;
    }

    case 'REMOVE_PARTICIPANT': {
      const s = clone(state);
      delete s.games[action.payload.gameId].participants[action.payload.playerId];
      return s;
    }

    case 'UPDATE_BUYIN': {
      const s = clone(state);
      s.games[action.payload.gameId].participants[action.payload.playerId].initialBuyIn =
        action.payload.amount;
      return s;
    }

    case 'ADD_REBUY': {
      const s = clone(state);
      s.games[action.payload.gameId].participants[action.payload.playerId].rebuys.push({
        id: generateId(),
        amount: action.payload.amount,
      });
      return s;
    }

    case 'UPDATE_REBUY': {
      const s = clone(state);
      const p = s.games[action.payload.gameId].participants[action.payload.playerId];
      const idx = p.rebuys.findIndex((r) => r.id === action.payload.rebuyId);
      if (idx !== -1) p.rebuys[idx].amount = action.payload.amount;
      return s;
    }

    case 'REMOVE_REBUY': {
      const s = clone(state);
      const p = s.games[action.payload.gameId].participants[action.payload.playerId];
      p.rebuys = p.rebuys.filter((r) => r.id !== action.payload.rebuyId);
      return s;
    }

    case 'SET_FINAL_AMOUNT': {
      const s = clone(state);
      s.games[action.payload.gameId].participants[action.payload.playerId].finalAmount =
        action.payload.amount;
      return s;
    }

    case 'FINISH_GAME': {
      return {
        ...state,
        games: {
          ...state.games,
          [action.payload.id]: {
            ...state.games[action.payload.id],
            status: 'finished',
          },
        },
      };
    }

    case 'REOPEN_GAME': {
      return {
        ...state,
        games: {
          ...state.games,
          [action.payload.id]: {
            ...state.games[action.payload.id],
            status: 'in-progress',
          },
        },
      };
    }

    case 'RESET_GAME_RESULTS': {
      const s = clone(state);
      const game = s.games[action.payload.id];
      Object.values(game.participants).forEach((p) => {
        p.finalAmount = null;
      });
      game.status = 'in-progress';
      return s;
    }

    case 'SETTLE_PLAYER': {
      const { groupId, playerId, balance, note } = action.payload;
      return {
        ...state,
        settlements: [
          ...state.settlements,
          {
            id: generateId(),
            groupId,
            playerId,
            settledBalance: balance,
            date: new Date().toISOString(),
            note,
          },
        ],
      };
    }

    case 'DELETE_SETTLEMENT': {
      return {
        ...state,
        settlements: state.settlements.filter((s) => s.id !== action.payload.id),
      };
    }

    case 'IMPORT_STATE': {
      return action.payload;
    }

    case 'LOAD_DEMO': {
      return createDemoData();
    }

    case 'SYNC_PLAYERS': {
      return { ...state, players: action.payload };
    }

    case 'SYNC_GROUPS': {
      return { ...state, groups: action.payload };
    }

    case 'SYNC_GAMES': {
      return { ...state, games: action.payload };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const { user } = useAuth();

  // Sync initial depuis Supabase au montage (une seule fois par session).
  // Players et groups sont chargés séquentiellement dans une même IIFE async :
  // la migration groups n'est tentée qu'après la résolution complète de la migration players,
  // ce qui garantit que les players existent en Supabase avant d'insérer les group_members (FK).
  useEffect(() => {
    if (!user) return;

    (async () => {
      // ── Étape 1 : players ──────────────────────────────────────────────────
      const remotePlayers = await fetchPlayers();

      // knownPlayerIds = players effectivement présents dans Supabase après cette étape.
      // Utilisé à l'étape 2 pour filtrer les group_members orphelins.
      let knownPlayerIds: Set<string>;

      if (remotePlayers === null) {
        // Erreur réseau → localStorage intact, on utilisera les ids locaux comme
        // meilleure approximation pour la migration groups qui suivra.
        knownPlayerIds = new Set(Object.keys(state.players));
      } else if (remotePlayers.length === 0) {
        // Supabase vide → migration one-shot players
        const localPlayers = Object.values(state.players);
        if (localPlayers.length > 0) {
          await upsertPlayers(localPlayers, user.id);
        }
        knownPlayerIds = new Set(localPlayers.map((p) => p.id));
        // state.players déjà correct, pas de dispatch nécessaire
      } else {
        // Supabase a des données → il fait autorité
        const playersById: AppState['players'] = {};
        remotePlayers.forEach((p) => { playersById[p.id] = p; });
        dispatch({ type: 'SYNC_PLAYERS', payload: playersById });
        knownPlayerIds = new Set(remotePlayers.map((p) => p.id));
      }

      // ── Étape 2 : groups (s'exécute après await ci-dessus) ─────────────────
      const remoteGroups = await fetchGroups();
      let knownGroupIds: Set<string>;

      if (remoteGroups === null) {
        // Erreur réseau → localStorage intact, approximation locale pour l'étape 3
        console.warn('[AppContext] fetchGroups failed — using localStorage as fallback');
        knownGroupIds = new Set(Object.keys(state.groups));
      } else if (remoteGroups.length === 0) {
        // Supabase vide → migration one-shot groups
        const localGroups = Object.values(state.groups);
        if (localGroups.length > 0) {
          await upsertGroups(localGroups, user.id, knownPlayerIds);
        }
        knownGroupIds = new Set(localGroups.map((g) => g.id));
        // state.groups déjà correct, pas de dispatch nécessaire
      } else {
        // Supabase a des données → il fait autorité
        const groupsById: AppState['groups'] = {};
        remoteGroups.forEach((g) => { groupsById[g.id] = g; });
        dispatch({ type: 'SYNC_GROUPS', payload: groupsById });
        knownGroupIds = new Set(remoteGroups.map((g) => g.id));
      }

      // ── Étape 3 : games (s'exécute après await ci-dessus) ──────────────────
      const remoteGames = await fetchGames();

      if (remoteGames === null) {
        // Erreur réseau → localStorage intact
        console.warn('[AppContext] fetchGames failed — using localStorage as fallback');
        return;
      }

      if (remoteGames.length === 0) {
        // Supabase vide → migration one-shot games
        // knownGroupIds et knownPlayerIds sont garantis à jour : étapes 1 et 2 terminées.
        const localGames = Object.values(state.games);
        if (localGames.length > 0) {
          await upsertGames(localGames, user.id, knownGroupIds, knownPlayerIds);
        }
        // state.games déjà correct, pas de dispatch nécessaire
        return;
      }

      // Supabase a des données → il fait autorité
      const gamesById: AppState['games'] = {};
      remoteGames.forEach((g) => { gamesById[g.id] = g; });
      dispatch({ type: 'SYNC_GAMES', payload: gamesById });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota exceeded
    }
  }, [state]);

  // Wrapper optimistic : dispatch local immédiat, sync Supabase en arrière-plan
  const dispatchWithSync = useCallback((action: Action) => {
    if (!user) {
      dispatch(action);
      return;
    }

    if (action.type === 'ADD_PLAYER') {
      // Pré-générer id + createdAt pour pouvoir les passer à Supabase immédiatement
      const id = action.payload.id ?? generateId();
      const createdAt = action.payload.createdAt ?? new Date().toISOString();
      const enriched: Action = { type: 'ADD_PLAYER', payload: { ...action.payload, id, createdAt } };
      dispatch(enriched);
      upsertPlayer({ id, name: action.payload.name, createdAt }, user.id).then((ok) => {
        if (!ok) console.warn('[AppContext] ADD_PLAYER sync failed — local state preserved', { id });
      });
    } else if (action.type === 'UPDATE_PLAYER') {
      dispatch(action);
      updatePlayer(action.payload.id, action.payload.name).then((ok) => {
        if (!ok) console.warn('[AppContext] UPDATE_PLAYER sync failed — local state preserved', { id: action.payload.id });
      });
    } else if (action.type === 'DELETE_PLAYER') {
      dispatch(action);
      deletePlayer(action.payload.id).then((ok) => {
        if (!ok) console.warn('[AppContext] DELETE_PLAYER sync failed — local state preserved', { id: action.payload.id });
      });
    } else if (action.type === 'ADD_GROUP') {
      const id = action.payload.id ?? generateId();
      const createdAt = action.payload.createdAt ?? new Date().toISOString();
      const enriched: Action = { type: 'ADD_GROUP', payload: { ...action.payload, id, createdAt } };
      dispatch(enriched);
      upsertGroup({ id, name: action.payload.name, memberIds: action.payload.memberIds, createdAt }, user.id).then((ok) => {
        if (!ok) console.warn('[AppContext] ADD_GROUP sync failed — local state preserved', { id });
      });
    } else if (action.type === 'UPDATE_GROUP') {
      dispatch(action);
      updateGroup(action.payload.id, action.payload.name).then((ok) => {
        if (!ok) console.warn('[AppContext] UPDATE_GROUP sync failed — local state preserved', { id: action.payload.id });
      });
    } else if (action.type === 'DELETE_GROUP') {
      dispatch(action);
      deleteGroup(action.payload.id).then((ok) => {
        if (!ok) console.warn('[AppContext] DELETE_GROUP sync failed — local state preserved', { id: action.payload.id });
      });
    } else if (action.type === 'ADD_MEMBER') {
      dispatch(action);
      addMember(action.payload.groupId, action.payload.playerId).then((ok) => {
        if (!ok) console.warn('[AppContext] ADD_MEMBER sync failed — local state preserved', action.payload);
      });
    } else if (action.type === 'REMOVE_MEMBER') {
      dispatch(action);
      removeMember(action.payload.groupId, action.payload.playerId).then((ok) => {
        if (!ok) console.warn('[AppContext] REMOVE_MEMBER sync failed — local state preserved', action.payload);
      });
    } else {
      dispatch(action);
    }
  }, [user]);

  const exportData = useCallback(() => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text) as AppState;
    dispatch({ type: 'IMPORT_STATE', payload: data });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchWithSync, exportData, importData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
