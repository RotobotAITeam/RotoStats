import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Team,
  Game,
  PlayerRecord,
  ViewMode,
  BracketMatchupRaw,
} from "../types/bracket";
import { fetchTeams, fetchBracket, fetchAllPlayers, fetchEspnLogos } from "../lib/api";
import { rawMatchupToGame, buildRegionRounds, getRegionWinner, encodePicks, decodePicks } from "../lib/bracketUtils";

// ── State ───────────────────────────────────────────────────────────────────

export type BracketStyle = "standard" | "bold" | "chaos";

interface BracketState {
  teams: Record<string, Team>;
  r1Games: Record<string, Game[]>;
  players: Record<string, PlayerRecord[]>;
  logos: Record<string, string>;
  userPicks: Record<string, string>;
  viewMode: ViewMode;
  bracketStyle: BracketStyle;
  upsetTolerance: number;
  dataLoaded: boolean;
  dataError: string | null;
  toastMessage: string | null;
}

const initialState: BracketState = {
  teams: {},
  r1Games: {},
  players: {},
  logos: {},
  userPicks: {},
  viewMode: "rotobot",
  bracketStyle: "standard",
  upsetTolerance: 0,
  dataLoaded: false,
  dataError: null,
  toastMessage: null,
};

// ── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD_DATA"; teams: Record<string, Team>; r1Games: Record<string, Game[]>; players: Record<string, PlayerRecord[]> }
  | { type: "LOAD_LOGOS"; logos: Record<string, string> }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SET_PICK"; gameId: string; teamId: string }
  | { type: "CLEAR_PICKS" }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SET_BRACKET_STYLE"; style: BracketStyle }
  | { type: "SET_UPSET_TOLERANCE"; value: number }
  | { type: "SET_TOAST"; message: string | null }
  | { type: "HYDRATE_PICKS"; picks: Record<string, string> };

function reducer(state: BracketState, action: Action): BracketState {
  switch (action.type) {
    case "LOAD_DATA":
      return {
        ...state,
        teams: action.teams,
        r1Games: action.r1Games,
        players: action.players,
        dataLoaded: true,
        dataError: null,
      };
    case "LOAD_LOGOS":
      return { ...state, logos: action.logos };
    case "LOAD_ERROR":
      return { ...state, dataError: action.error };
    case "SET_PICK":
      return {
        ...state,
        userPicks: { ...state.userPicks, [action.gameId]: action.teamId },
      };
    case "CLEAR_PICKS":
      return { ...state, userPicks: {} };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
    case "SET_BRACKET_STYLE":
      return { ...state, bracketStyle: action.style };
    case "SET_UPSET_TOLERANCE":
      return { ...state, upsetTolerance: action.value };
    case "SET_TOAST":
      return { ...state, toastMessage: action.message };
    case "HYDRATE_PICKS":
      return { ...state, userPicks: action.picks };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────────────

interface BracketContextValue {
  state: BracketState;
  makePick: (gameId: string, teamId: string) => void;
  clearPicks: () => void;
  setViewMode: (mode: ViewMode) => void;
  setBracketStyle: (style: BracketStyle) => void;
  setUpsetTolerance: (value: number) => void;
  dismissToast: () => void;
  getRegionGames: (region: string) => {
    r1: Game[];
    r2: Game[];
    s16: Game[];
    e8: Game[];
  };
  getRegionWinnerTeam: (region: string) => Team | null;
  getFinalFourTeams: () => (Team | null)[];
  getShareURL: () => string;
  findGameById: (gameId: string) => Game | undefined;
}

const BracketContext = createContext<BracketContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────

export function BracketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [teamsData, bracketData, playersData] = await Promise.all([
          fetchTeams(),
          fetchBracket(),
          fetchAllPlayers(),
        ]);

        // Group R1 matchups by region
        const r1ByRegion: Record<string, Game[]> = {};
        for (const raw of bracketData.matchups as BracketMatchupRaw[]) {
          if (raw.round !== 1) continue;
          const game = rawMatchupToGame(raw);
          if (!r1ByRegion[raw.region]) r1ByRegion[raw.region] = [];
          r1ByRegion[raw.region].push(game);
        }

        dispatch({ type: "LOAD_DATA", teams: teamsData, r1Games: r1ByRegion, players: playersData });

        fetchEspnLogos()
          .then((logos) => dispatch({ type: "LOAD_LOGOS", logos }))
          .catch(() => {});
      } catch (err) {
        dispatch({ type: "LOAD_ERROR", error: String(err) });
      }
    }
    load();
  }, []);

  // Hydrate picks from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const picks = decodePicks(hash);
      if (Object.keys(picks).length > 0) {
        dispatch({ type: "HYDRATE_PICKS", picks });
        dispatch({ type: "SET_VIEW_MODE", mode: "user" });
      }
    }
  }, []);

  const makePick = useCallback((gameId: string, teamId: string) => {
    dispatch({ type: "SET_PICK", gameId, teamId });
  }, []);

  const clearPicks = useCallback(() => {
    dispatch({ type: "CLEAR_PICKS" });
    window.location.hash = "";
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: "SET_VIEW_MODE", mode });
  }, []);

  const setBracketStyle = useCallback((style: BracketStyle) => {
    dispatch({ type: "SET_BRACKET_STYLE", style });
  }, []);

  const setUpsetTolerance = useCallback((value: number) => {
    dispatch({ type: "SET_UPSET_TOLERANCE", value });
  }, []);

  const dismissToast = useCallback(() => {
    dispatch({ type: "SET_TOAST", message: null });
  }, []);

  // Score each game's upset plausibility (0-100). Higher = more plausible upset.
  const scoreUpsetPlausibility = useCallback((g: Game): number => {
    const t1 = g.team1, t2 = g.team2;
    const seedDiff = Math.abs(t1.seed - t2.seed);
    if (seedDiff === 0) return 0;

    const favorite = t1.seed < t2.seed ? t1 : t2;
    const underdog = t1.seed < t2.seed ? t2 : t1;

    // Never predict 1-vs-16 upsets
    if (favorite.seed === 1 && underdog.seed === 16) return 0;

    // Historical plausibility scaled from actual NCAA upset rates (higher = more likely upset)
    const seedPlausibility: Record<string, number> = {
      "9-8": 90, "10-7": 75, "11-6": 75, "12-5": 70,
      "13-4": 40, "14-3": 28, "15-2": 13,
    };
    const seedKey = `${underdog.seed}-${favorite.seed}`;
    const basePlausibility = seedPlausibility[seedKey] ?? Math.max(5, 50 - seedDiff * 5);

    // Data-driven adjustments
    let dataBonus = 0;
    const netGap = Math.abs(favorite.netRank - underdog.netRank);
    if (netGap < 20) dataBonus += 20;
    else if (netGap < 40) dataBonus += 12;
    else if (netGap < 60) dataBonus += 5;

    const efgGap = Math.abs(favorite.eFGPct - underdog.eFGPct);
    if (efgGap < 2) dataBonus += 15;
    else if (efgGap < 4) dataBonus += 8;

    const underdogWins = (underdog.recentForm || []).filter(r => r === "W").length;
    const formLen = (underdog.recentForm || []).length;
    if (formLen >= 3 && underdogWins >= formLen * 0.7) dataBonus += 12;

    // Moderate the original confidence — lower confidence means more plausible upset
    const confBonus = Math.max(0, (80 - g.rotobotConfidence) * 0.5);

    return Math.min(100, basePlausibility * 0.5 + dataBonus + confBonus);
  }, []);

  // Apply upset tolerance slider — at 0 all chalk, at 100 maximum plausible upsets
  const applyUpsetTolerance = useCallback((games: Game[], tolerance: number): Game[] => {
    if (tolerance === 0) return games;

    // Score and rank all games by upset plausibility
    const scored = games.map((g) => ({
      game: g,
      plausibility: scoreUpsetPlausibility(g),
    }));

    // Sort by plausibility descending — most plausible upsets flip first
    const ranked = [...scored].sort((a, b) => b.plausibility - a.plausibility);

    // Determine how many games to flip based on tolerance
    const flippable = ranked.filter((s) => s.plausibility > 0);
    const numToFlip = Math.round((tolerance / 100) * flippable.length);
    const flipSet = new Set(flippable.slice(0, numToFlip).map((s) => s.game.id));

    return games.map((g) => {
      if (!flipSet.has(g.id)) return g;

      const t1 = g.team1, t2 = g.team2;
      const favorite = t1.seed < t2.seed ? t1 : t2;
      const underdog = t1.seed < t2.seed ? t2 : t1;
      const currentPickIsFavorite = g.rotobotPick === favorite.id || g.rotobotPick === favorite.name;
      if (!currentPickIsFavorite) return g;

      const plausibility = scoreUpsetPlausibility(g);
      const newConf = Math.max(51, Math.min(68, 50 + plausibility * 0.2));

      return {
        ...g,
        rotobotPick: underdog.id,
        rotobotConfidence: Math.round(newConf),
        pickReasoning: `[Upset Pick] ${underdog.shortName} (${underdog.conference}, NET #${underdog.netRank}) has a credible path to upset ${favorite.shortName}. ${Math.abs(favorite.netRank - underdog.netRank) < 40 ? `NET rankings are closer than the seed line suggests (#${underdog.netRank} vs #${favorite.netRank}).` : ""} ${(underdog.recentForm || []).filter(r => r === "W").length >= 3 ? `${underdog.shortName} enters the tournament hot.` : ""}`.trim(),
      };
    });
  }, [scoreUpsetPlausibility]);

  const getRegionGames = useCallback(
    (region: string) => {
      const rawR1 = state.r1Games[region] ?? [];
      const r1 = applyUpsetTolerance(rawR1, state.upsetTolerance);
      const { r2, s16, e8 } = buildRegionRounds(r1, region, state.userPicks, state.viewMode);
      return { r1, r2, s16, e8 };
    },
    [state.r1Games, state.userPicks, state.viewMode, state.upsetTolerance, applyUpsetTolerance]
  );

  const getRegionWinnerTeam = useCallback(
    (region: string) => {
      const { e8 } = getRegionGames(region);
      return getRegionWinner(e8, state.userPicks, state.viewMode);
    },
    [getRegionGames, state.userPicks, state.viewMode]
  );

  const getFinalFourTeams = useCallback(() => {
    return ["East", "West", "South", "Midwest"].map((r) => getRegionWinnerTeam(r));
  }, [getRegionWinnerTeam]);

  const getShareURL = useCallback(() => {
    const hash = encodePicks(state.userPicks);
    return `${window.location.origin}/bracket#${hash}`;
  }, [state.userPicks]);

  const findGameById = useCallback(
    (gameId: string): Game | undefined => {
      for (const region of Object.keys(state.r1Games)) {
        const { r1, r2, s16, e8 } = getRegionGames(region);
        const all = [...r1, ...r2, ...s16, ...e8];
        const found = all.find((g) => g.id === gameId);
        if (found) return found;
      }
      return undefined;
    },
    [state.r1Games, getRegionGames]
  );

  const value: BracketContextValue = {
    state,
    makePick,
    clearPicks,
    setViewMode,
    setBracketStyle,
    setUpsetTolerance,
    dismissToast,
    getRegionGames,
    getRegionWinnerTeam,
    getFinalFourTeams,
    getShareURL,
    findGameById,
  };

  return <BracketContext.Provider value={value}>{children}</BracketContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useBracket() {
  const ctx = useContext(BracketContext);
  if (!ctx) throw new Error("useBracket must be used within BracketProvider");
  return ctx;
}
