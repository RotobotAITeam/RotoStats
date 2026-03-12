import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Brain, Search, TrendingUp, Zap, ChevronRight, BarChart2, Loader2, Trophy } from "lucide-react";
import { useBracket } from "../context/BracketContext";
import { RotoBotAppPlug } from "./RotoBotAppPlug";
import type { Game } from "../types/bracket";

function ConfidenceGauge({ value }: { value: number }) {
  const rounded = Math.round(value);
  const color = rounded >= 80 ? "#00b8db" : rounded >= 60 ? "#3c84ff" : rounded >= 50 ? "#f59e0b" : "#ef4444";
  const cx = 50, cy = 50, r = 36;
  const rad = Math.PI * (1 - rounded / 100);
  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 14 50 A 36 36 0 0 1 86 50" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 14 50 A 36 36 0 0 1 86 50" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={`${rounded * 1.131} 200`}
        />
        <line x1={cx} y1={cy} x2={x} y2={y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill="white" />
        <text x={cx} y={58} textAnchor="middle" fill={color} fontSize="13" fontFamily="Rubik, sans-serif" fontWeight="700">
          {rounded}%
        </text>
      </svg>
    </div>
  );
}

function isRotobotPickTeam(game: Game, teamId: string, teamName: string): boolean {
  return game.rotobotPick === teamId || game.rotobotPick === teamName;
}

type BracketMode = "all" | "chalk" | "upsets" | "tossups" | "mid-major";

const BRACKET_MODES: { id: BracketMode; label: string; emoji: string; desc: string }[] = [
  { id: "all", label: "All Games", emoji: "🏀", desc: "Every R1 matchup" },
  { id: "chalk", label: "Chalk", emoji: "📋", desc: "Heavy favorites (≥80%)" },
  { id: "upsets", label: "Upset Watch", emoji: "💥", desc: "Underdogs with real data" },
  { id: "tossups", label: "Toss-Ups", emoji: "⚖️", desc: "Close calls (50–65%)" },
  { id: "mid-major", label: "Mid-Majors", emoji: "🔥", desc: "Non-power conference teams" },
];

const POWER_CONFERENCES = new Set([
  "ACC", "Big Ten", "Big 12", "SEC", "Pac-12", "Big East",
]);

const SEED_UPSET_RATES: Record<string, number> = {
  "9-8": 51.9, "10-7": 38.8, "11-6": 38.8, "12-5": 35.6,
  "13-4": 20.6, "14-3": 14.4, "15-2": 6.9, "16-1": 1.3,
};

// An "upset watch" game: lower seed has competitive data (close NET, close eFG, hot form, or big seed gap with moderate conf)
function isUpsetWatch(g: Game): boolean {
  const isPick1 = g.rotobotPick === g.team1.name || g.rotobotPick === g.team1.id;
  const pick = isPick1 ? g.team1 : g.team2;
  const underdog = isPick1 ? g.team2 : g.team1;
  const seedDiff = Math.abs(pick.seed - underdog.seed);
  if (seedDiff < 3) return false; // Not interesting if seeds are close

  const netClose = Math.abs(pick.netRank - underdog.netRank) < 50;
  const efgClose = Math.abs(pick.eFGPct - underdog.eFGPct) < 4;
  const conf = Math.round(g.rotobotConfidence);
  const moderateConf = conf < 80; // Favorite isn't a lock
  const underdogWins = (underdog.recentForm || []).filter(r => r === "W").length;
  const hotStreak = underdog.recentForm.length >= 3 && underdogWins >= underdog.recentForm.length * 0.7;
  const notPowerConf = !POWER_CONFERENCES.has(underdog.conference ?? "");

  // Show if underdog has 2+ factors in their favor
  const factors = [netClose, efgClose, moderateConf, hotStreak, notPowerConf].filter(Boolean).length;
  return factors >= 2;
}


export function AnalysisScreen() {
  const { state, getRegionGames, setUpsetTolerance } = useBracket();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [bracketMode, setBracketMode] = useState<BracketMode>("all");

  const allGames = useMemo(() => {
    if (!state.dataLoaded) return [];
    const games: Game[] = [];
    for (const region of ["East", "West", "South", "Midwest"]) {
      const { r1 } = getRegionGames(region);
      games.push(...r1);
    }
    return games;
  }, [state.dataLoaded, getRegionGames]);

  const filtered = useMemo(() => allGames.filter((g) => {
    if (!g?.team1 || !g?.team2) return false;
    const conf = Math.round(g.rotobotConfidence);

    const matchSearch =
      search === "" ||
      (g.team1.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.team2.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.team1.shortName || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.team2.shortName || "").toLowerCase().includes(search.toLowerCase());

    const matchRegion = regionFilter === "All" || g.region === regionFilter;

    let matchMode = true;
    if (bracketMode === "chalk") matchMode = conf >= 80;
    else if (bracketMode === "upsets") matchMode = isUpsetWatch(g);
    else if (bracketMode === "tossups") matchMode = conf >= 50 && conf < 65;
    else if (bracketMode === "mid-major") {
      const t1Major = POWER_CONFERENCES.has(g.team1.conference ?? "");
      const t2Major = POWER_CONFERENCES.has(g.team2.conference ?? "");
      matchMode = !t1Major || !t2Major;
    }

    return matchSearch && matchRegion && matchMode;
  }), [allGames, search, regionFilter, bracketMode]);

  if (!state.dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
        <Loader2 size={32} className="animate-spin" color="#00b8db" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-16 pb-20 md:pb-8"
      style={{ background: "linear-gradient(160deg, #010c2a 0%, #030712 40%, #00081e 100%)" }}
    >
      <div className="fixed pointer-events-none" style={{ top: 80, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(0,184,219,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,184,219,0.15)" }}>
              <Brain size={16} color="#00b8db" />
            </div>
            <h1 style={{ fontFamily: "Rubik, sans-serif", fontSize: 24, fontWeight: 800, color: "white" }}>
              AI Game Analysis
            </h1>
            <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
              {filtered.length} matchup{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            RotoBot's statistical breakdown of every Round 1 matchup.
          </p>
        </div>

        {/* Upset Tolerance Slider */}
        <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} color={state.upsetTolerance > 50 ? "#f59e0b" : "#00b8db"} />
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>
                Upset Tolerance
              </span>
            </div>
            <span style={{
              fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700,
              color: state.upsetTolerance === 0 ? "#00b8db" : state.upsetTolerance < 40 ? "#3c84ff" : state.upsetTolerance < 70 ? "#f59e0b" : "#ef4444",
            }}>
              {state.upsetTolerance}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={state.upsetTolerance}
            onChange={(e) => setUpsetTolerance(Number(e.target.value))}
            className="w-full"
            style={{
              appearance: "none",
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(90deg, #00b8db ${state.upsetTolerance}%, rgba(255,255,255,0.1) ${state.upsetTolerance}%)`,
              outline: "none",
              cursor: "pointer",
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              Pure Chalk
            </span>
            <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              Max Upsets
            </span>
          </div>
        </div>

        {/* Bracketologist Mode Filter */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {BRACKET_MODES.map(({ id, label, emoji, desc }) => {
              const active = bracketMode === id;
              return (
                <button
                  key={id}
                  onClick={() => setBracketMode(id)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all hover:opacity-90 shrink-0"
                  style={{
                    background: active ? "rgba(0,184,219,0.18)" : "rgba(255,255,255,0.04)",
                    border: active ? "1px solid rgba(0,184,219,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{emoji}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: active ? "#00b8db" : "rgba(255,255,255,0.7)" }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.45)" }}>
                      {desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + Region Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div
            className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Search size={15} color="rgba(255,255,255,0.3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="bg-transparent flex-1 outline-none"
              style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "white" }}
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {["All", "East", "West", "South", "Midwest"].map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className="px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontFamily: "Rubik, sans-serif", fontSize: 16,
                  fontWeight: regionFilter === r ? 600 : 400,
                  color: regionFilter === r ? "white" : "rgba(255,255,255,0.4)",
                  background: regionFilter === r ? "rgba(0,184,219,0.15)" : "transparent",
                  border: "none", cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Trophy size={32} color="rgba(255,255,255,0.15)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
              No matchups match this filter.
            </p>
          </div>
        )}

        {/* Game Cards */}
        <div className="flex flex-col gap-3">
          {filtered.map((game) => {
            const isPick1 = isRotobotPickTeam(game, game.team1.id, game.team1.name);
            const pick = isPick1 ? game.team1 : game.team2;
            const other = isPick1 ? game.team2 : game.team1;
            const conf = Math.round(game.rotobotConfidence);
            const isUpset = pick.seed > other.seed;
            const isTossup = conf < 62;

            return (
              <Link
                key={game.id}
                to={`/matchup/${game.id}`}
                className="no-underline block rounded-2xl overflow-hidden transition-all group"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isTossup ? "0 0 0 1px rgba(245,158,11,0.15)" : undefined,
                }}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Region badge */}
                  <div className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 48 }}>
                    <div
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(0,184,219,0.1)", border: "1px solid rgba(0,184,219,0.2)",
                        fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700,
                        color: "#00b8db", textTransform: "uppercase", letterSpacing: "0.5px",
                      }}
                    >
                      {game.region.slice(0, 4)}
                    </div>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>R1</span>
                    {isUpset && (
                      <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>UPSET?</span>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1.5">
                      {[game.team1, game.team2].map((team) => {
                        const isPick = isRotobotPickTeam(game, team.id, team.name);
                        return (
                          <div key={team.id} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                                style={{
                                  background: isPick ? "rgba(0,184,219,0.2)" : "rgba(255,255,255,0.06)",
                                  fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700,
                                  color: isPick ? "#00b8db" : "rgba(255,255,255,0.35)",
                                }}
                              >
                                {team.seed}
                              </div>
                              <span className="truncate" style={{
                                fontFamily: "Rubik, sans-serif",
                                fontSize: isPick ? 14 : 13,
                                fontWeight: isPick ? 700 : 400,
                                color: isPick ? "white" : "rgba(255,255,255,0.45)",
                              }}>
                                {team.shortName}
                              </span>
                              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>
                                {team.record}
                              </span>
                              {isPick && <Brain size={11} color="#00b8db" style={{ flexShrink: 0 }} />}
                            </div>
                            {team.keyPlayer && (
                              <div className="flex items-center gap-1 ml-8">
                                <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
                                  {team.keyPlayer}
                                </span>
                                {team.keyPlayerStat && (
                                  <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: isPick ? "#00b8db" : "rgba(255,255,255,0.35)" }}>
                                    {team.keyPlayerStat}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gauge */}
                  <div className="shrink-0 hidden sm:block">
                    <ConfidenceGauge value={game.rotobotConfidence} />
                  </div>

                  {/* Snippet */}
                  <div className="hidden lg:block flex-1 max-w-xs">
                    {game.pickReasoning ? (
                      <p className="line-clamp-2" style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>
                        {game.pickReasoning.replace(/committee score/gi, "RotoBot Score").replace(/power rating/gi, "RotoBot Score")}
                      </p>
                    ) : null}
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-1 shrink-0" style={{ color: "#00b8db" }}>
                    <BarChart2 size={14} />
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Footer stat bar */}
                <div
                  className="flex items-center gap-4 px-4 py-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.15)" }}
                >
                  {(() => {
                    const diff = pick.ppg - other.ppg;
                    const sign = diff >= 0 ? "+" : "";
                    return (
                      <div className="flex items-center gap-1.5">
                        <Zap size={11} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>
                          {pick.shortName} {sign}{diff.toFixed(1)} PPG
                        </span>
                      </div>
                    );
                  })()}
                  {pick.recentForm.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={11} color="#22c55e" style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>
                        {pick.recentForm.filter((f) => f === "W").length}-{pick.recentForm.filter((f) => f === "L").length} last {Math.min(pick.recentForm.length, 5)}
                      </span>
                    </div>
                  )}
                  {/* Historical seed upset rate */}
                  {(() => {
                    const seedKey = `${other.seed}-${pick.seed}`;
                    const rate = SEED_UPSET_RATES[seedKey];
                    if (!rate || !isUpset) return null;
                    return (
                      <div className="flex items-center gap-1.5">
                        <span style={{
                          fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700,
                          color: rate > 30 ? "#f59e0b" : "rgba(255,255,255,0.4)",
                          background: rate > 30 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                          padding: "1px 6px", borderRadius: 4,
                        }}>
                          #{other.seed} beats #{pick.seed} {rate}% historically
                        </span>
                      </div>
                    );
                  })()}
                  {game.odds && game.odds.total > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span style={{
                        fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600,
                        color: "rgba(255,255,255,0.45)",
                        background: "rgba(255,255,255,0.06)",
                        padding: "1px 6px", borderRadius: 4,
                      }}>
                        {game.odds.spread > 0 ? `+${game.odds.spread}` : game.odds.spread} · O/U {game.odds.total}
                      </span>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    {conf < 60 && (
                      <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>
                        Toss-up
                      </span>
                    )}
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.45)" }}>
                      NET #{pick.netRank ?? "—"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* RotoBot app CTA */}
        <div className="mt-8">
          <RotoBotAppPlug
            variant="banner"
            sectionTitle="Want live betting lines, spreads, and O/U for every matchup?"
          />
        </div>
      </div>
    </div>
  );
}
