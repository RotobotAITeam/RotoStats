import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Brain, ChevronLeft, TrendingUp, Target, Zap, BarChart2,
  CheckCircle2, Users, Shield, Loader2, AlertTriangle, Crosshair, History,
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useBracket } from "../context/BracketContext";
import { fetchTeamPlayers, fetchEspnRoster } from "../lib/api";
import { TeamLogo } from "./TeamLogo";
import { RotoBotLogo } from "./RotoBotLogo";
import { ROTOBOT_APP_STORE_URL, ROTOBOT_PLAY_STORE_URL, ROTOBOT_WEB_URL } from "../constants";
import type { Game, PlayerRecord } from "../types/bracket";

const CYAN = "#00b8db";
const BLUE = "#3c84ff";

// ── Shared sub-components ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function StatBar({ label, val1, val2, higherIsBetter = true }: {
  label: string; val1: number; val2: number; higherIsBetter?: boolean;
}) {
  const total = val1 + val2 || 1;
  const pct1 = (val1 / total) * 100;
  const winner1 = higherIsBetter ? val1 > val2 : val1 < val2;
  const winner2 = higherIsBetter ? val2 > val1 : val2 < val1;
  return (
    <div className="flex items-center gap-3">
      <div className="text-right" style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: winner1 ? 700 : 400, color: winner1 ? CYAN : "rgba(255,255,255,0.55)", minWidth: 48 }}>
        {fmt(val1)}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div style={{ width: `${pct1}%`, background: CYAN, borderRadius: "4px 0 0 4px" }} />
          <div style={{ flex: 1, background: BLUE, borderRadius: "0 4px 4px 0" }} />
        </div>
        <div className="text-center" style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </div>
      </div>
      <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: winner2 ? 700 : 400, color: winner2 ? BLUE : "rgba(255,255,255,0.55)", minWidth: 48, textAlign: "right" }}>
        {fmt(val2)}
      </div>
    </div>
  );
}

function FormBadge({ result }: { result: "W" | "L" }) {
  return (
    <div className="w-6 h-6 rounded flex items-center justify-center" style={{
      background: result === "W" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
      border: `1px solid ${result === "W" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
      fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700,
      color: result === "W" ? "#22c55e" : "#ef4444",
    }}>
      {result}
    </div>
  );
}

function SectionCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, color = CYAN }: { icon: React.ElementType; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} color={color} />
      <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>{children}</span>
    </div>
  );
}

// ── Tab Components ──────────────────────────────────────────────────────────

function OverviewTab({ game }: { game: Game }) {
  const t1 = game.team1, t2 = game.team2;
  const isPick1 = game.rotobotPick === t1.name || game.rotobotPick === t1.id;
  const pick = isPick1 ? t1 : t2;
  const conf = Math.round(game.rotobotConfidence);

  const SEED_UPSET_RATES: Record<string, number> = {
    "9-8": 51.9, "10-7": 38.8, "11-6": 38.8, "12-5": 35.6,
    "13-4": 20.6, "14-3": 14.4, "15-2": 6.9, "16-1": 1.3,
  };
  const higher = t1.seed > t2.seed ? t1 : t2;
  const lower = t1.seed < t2.seed ? t1 : t2;
  const seedKey = `${higher.seed}-${lower.seed}`;
  const upsetRate = SEED_UPSET_RATES[seedKey];

  return (
    <div className="flex flex-col gap-5">
      {/* Win probability */}
      <SectionCard>
        <SectionTitle icon={Target}>Win Probability</SectionTitle>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 28, fontWeight: 800, color: CYAN }}>
              {isPick1 ? conf : 100 - conf}%
            </div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{t1.shortName}</div>
          </div>
          <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div style={{ width: `${isPick1 ? conf : 100 - conf}%`, background: CYAN }} />
            <div style={{ flex: 1, background: BLUE }} />
          </div>
          <div className="flex-1 text-center">
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 28, fontWeight: 800, color: BLUE }}>
              {isPick1 ? 100 - conf : conf}%
            </div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{t2.shortName}</div>
          </div>
        </div>
      </SectionCard>

      {/* RotoBot Score explainer */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} color={CYAN} />
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>RotoBot Score Breakdown</span>
        </div>
        <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 12px 0" }}>
          RotoBot Scores are a composite power rating combining multiple data signals into a single number. Higher is better.
        </p>
        <div className="flex items-center gap-4 mb-4">
          {[
            { team: t1, color: CYAN },
            { team: t2, color: BLUE },
          ].map(({ team, color }) => (
            <div key={team.id} className="flex-1 p-3 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
              <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 24, fontWeight: 800, color }}>{Number(team.rotobotScore).toFixed(1)}</div>
              <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{team.shortName}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "NET Ranking", pct: "35%", desc: "NCAA's official team metric" },
            { label: "Quad Record", pct: "30%", desc: "W-L vs quality tiers (Q1–Q4)" },
            { label: "Win Rate", pct: "10%", desc: "Overall season record" },
            { label: "Offensive Efficiency", pct: "10%", desc: "Scoring & shooting quality" },
            { label: "Defensive Rating", pct: "10%", desc: "Opponent scoring suppression" },
            { label: "Conference", pct: "5%", desc: "League strength adjustment" },
          ].map(({ label, pct, desc }) => (
            <div key={label} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 800, color: CYAN, minWidth: 28 }}>{pct}</span>
              <div>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "white" }}>{label}</div>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Analysis narrative */}
      {game.analysis && (
        <SectionCard>
          <SectionTitle icon={BarChart2}>Matchup Analysis</SectionTitle>
          <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: 0 }}>
            {game.analysis}
          </p>
        </SectionCard>
      )}

      {/* Odds + Historical Seed Data */}
      <div className="flex gap-3 flex-wrap">
        {game.odds && game.odds.total > 0 && (
          <SectionCard className="flex-1" style={{ minWidth: 200 }}>
            <div className="flex items-center gap-2 mb-3">
              <Crosshair size={14} color="#f59e0b" />
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>Betting Lines</span>
            </div>
            <div className="flex gap-4">
              {[
                { label: "Spread", val: game.odds.spread > 0 ? `+${game.odds.spread}` : String(game.odds.spread) },
                { label: "O/U", val: String(game.odds.total) },
                { label: `${t1.shortName} ML`, val: game.odds.homeML > 0 ? `+${game.odds.homeML}` : String(game.odds.homeML) },
                { label: `${t2.shortName} ML`, val: game.odds.awayML > 0 ? `+${game.odds.awayML}` : String(game.odds.awayML) },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700, color: "white" }}>{val}</div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{label}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
        {upsetRate && (
          <SectionCard className="flex-1" style={{ minWidth: 200 }}>
            <div className="flex items-center gap-2 mb-3">
              <History size={14} color="#f59e0b" />
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>Historical Upset Rate</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 24, fontWeight: 800, color: upsetRate > 30 ? "#f59e0b" : "rgba(255,255,255,0.7)" }}>
                  {upsetRate}%
                </div>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
                  #{higher.seed} beats #{lower.seed}
                </div>
              </div>
              <div className="flex-1" style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 16 }}>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                  Historically, #{higher.seed} seeds have upset #{lower.seed} seeds in <strong style={{ color: upsetRate > 30 ? "#f59e0b" : "#00b8db" }}>{upsetRate}%</strong> of matchups since 1985.
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Quick comparison table */}
      <SectionCard>
        <SectionTitle icon={BarChart2}>Head-to-Head Snapshot</SectionTitle>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: CYAN }}>{t1.shortName}</span>
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: BLUE }}>{t2.shortName}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <StatBar label="PPG" val1={t1.ppg} val2={t2.ppg} />
          <StatBar label="Opp PPG" val1={t1.oppg} val2={t2.oppg} higherIsBetter={false} />
          <StatBar label="eFG%" val1={t1.eFGPct} val2={t2.eFGPct} />
          <StatBar label="NET Rank" val1={t1.netRank} val2={t2.netRank} higherIsBetter={false} />
          {t1.stats && t2.stats && (
            <>
              <StatBar label="Scoring Margin" val1={t1.stats.scoring.scoringMargin} val2={t2.stats.scoring.scoringMargin} />
              <StatBar label="A/TO" val1={t1.stats.ballControl.astToRatio} val2={t2.stats.ballControl.astToRatio} />
            </>
          )}
        </div>
      </SectionCard>

      {/* Pick + reasoning */}
      <SectionCard style={{ borderLeft: "4px solid #22c55e" }}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={16} color="#22c55e" />
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "white" }}>
            RotoBot picks {pick.shortName} ({conf}%)
          </span>
        </div>
        {game.pickReasoning && (
          <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: 0 }}>
            {game.pickReasoning.replace(/committee score/gi, "RotoBot Score").replace(/power rating/gi, "RotoBot Score").replace(/\b(\d+\.\d{3,})\b/g, (m) => parseFloat(m).toFixed(1))}
          </p>
        )}
      </SectionCard>

      {/* Key edges */}
      {(game.proTeam1?.length > 0 || game.proTeam2?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { team: t1, pros: game.proTeam1, color: CYAN },
            { team: t2, pros: game.proTeam2, color: BLUE },
          ].map(({ team, pros, color }) => (
            <SectionCard key={team.id}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} color={color} />
                <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: "white" }}>
                  {team.shortName} Edges
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {(pros || []).slice(0, 3).map((pro, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={10} color={color} className="mt-0.5 shrink-0" />
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                      {pro}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Recent form */}
      <div className="grid grid-cols-2 gap-4">
        {[t1, t2].map((team) => (
          <SectionCard key={team.id}>
            <div className="flex items-center gap-2 mb-3">
              <TeamLogo teamSlug={team.id} teamShortName={team.shortName} teamColor={team.color} size={16} />
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: "white" }}>
                {team.shortName} — L{team.recentForm.length > 0 ? team.recentForm.length : "10"}
              </span>
            </div>
            {(team.recentForm || []).length > 0 ? (
              <div className="flex gap-1.5 flex-wrap">
                {team.recentForm.map((r, j) => <FormBadge key={j} result={r} />)}
              </div>
            ) : (
              <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                No recent game data
              </div>
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ game }: { game: Game }) {
  const t1 = game.team1, t2 = game.team2;

  const radarData = [
    { stat: "PPG", t1: t1.ppg, t2: t2.ppg },
    { stat: "Def", t1: 100 - (t1.oppg / 1), t2: 100 - (t2.oppg / 1) },
    { stat: "eFG%", t1: t1.eFGPct, t2: t2.eFGPct },
    { stat: "Pace", t1: t1.pace, t2: t2.pace },
    { stat: "OREB/G", t1: t1.orebPerGame || 0, t2: t2.orebPerGame || 0 },
    { stat: "TOV/G", t1: t1.tovPerGame || 0, t2: t2.tovPerGame || 0 },
  ];

  const stats1 = t1.stats, stats2 = t2.stats;

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <SectionTitle icon={BarChart2}>Radar Comparison</SectionTitle>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 15, fontFamily: "Rubik" }} />
              <Radar name={t1.shortName} dataKey="t1" stroke={CYAN} fill={CYAN} fillOpacity={0.15} strokeWidth={2} />
              <Radar name={t2.shortName} dataKey="t2" stroke={BLUE} fill={BLUE} fillOpacity={0.15} strokeWidth={2} />
              <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "Rubik" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon={Zap}>Head-to-Head Stats</SectionTitle>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: CYAN }}>{t1.shortName}</span>
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: BLUE }}>{t2.shortName}</span>
        </div>
        <div className="flex flex-col gap-3">
          <StatBar label="PPG" val1={t1.ppg} val2={t2.ppg} />
          <StatBar label="Opp PPG" val1={t1.oppg} val2={t2.oppg} higherIsBetter={false} />
          <StatBar label="eFG%" val1={t1.eFGPct} val2={t2.eFGPct} />
          <StatBar label="Pace" val1={t1.pace} val2={t2.pace} />
          {stats1 && stats2 && (
            <>
              <StatBar label="FG% Def" val1={stats1.shooting.fgPctDefense} val2={stats2.shooting.fgPctDefense} higherIsBetter={false} />
              <StatBar label="3PT%" val1={stats1.shooting.threePtPct} val2={stats2.shooting.threePtPct} />
              <StatBar label="FT%" val1={stats1.shooting.ftPct} val2={stats2.shooting.ftPct} />
              <StatBar label="Scoring Margin" val1={stats1.scoring.scoringMargin} val2={stats2.scoring.scoringMargin} />
              <StatBar label="RPG" val1={stats1.rebounding.rpg} val2={stats2.rebounding.rpg} />
              <StatBar label="APG" val1={stats1.ballControl.apg} val2={stats2.ballControl.apg} />
              <StatBar label="A/TO" val1={stats1.ballControl.astToRatio} val2={stats2.ballControl.astToRatio} />
              <StatBar label="BPG" val1={stats1.defense.bpg} val2={stats2.defense.bpg} />
              <StatBar label="SPG" val1={stats1.defense.spg} val2={stats2.defense.spg} />
              <StatBar label="Bench PPG" val1={stats1.scoring.benchPPG} val2={stats2.scoring.benchPPG} />
            </>
          )}
          <StatBar label="NET Rank" val1={t1.netRank} val2={t2.netRank} higherIsBetter={false} />
        </div>
      </SectionCard>
    </div>
  );
}

function StyleTab({ game }: { game: Game }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Style Matchup headline */}
      <SectionCard>
        <SectionTitle icon={Shield}>How These Teams Play</SectionTitle>
        <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
          Understanding each team's identity — how they score, defend, and attack — reveals how this matchup will play out beyond the stats.
        </p>
      </SectionCard>

      {/* Per-team style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { team: game.team1, color: CYAN },
          { team: game.team2, color: BLUE },
        ].map(({ team, color }) => {
          const s = team.stats;
          return (
            <SectionCard key={team.id}>
              <div className="flex items-center gap-3 mb-4">
                <TeamLogo teamSlug={team.id} teamShortName={team.shortName} teamColor={team.color} size={24} />
                <div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700, color: "white" }}>
                    {team.shortName}
                  </div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                    #{team.seed} seed · {team.conference}
                  </div>
                </div>
              </div>

              {/* Style tags */}
              {team.styleTags && team.styleTags.filter(t => t && t !== "nan").length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {team.styleTags.filter(t => t && t !== "nan").map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full" style={{
                      background: `${color}15`, border: `1px solid ${color}30`,
                      fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Identity */}
              {team.styleIdentity && (
                <div className="mb-4">
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                    Identity
                  </div>
                  <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
                    {team.styleIdentity}
                  </p>
                </div>
              )}

              {/* Style summary (distinct from identity) */}
              {team.styleSummary && team.styleSummary !== team.styleIdentity && (
                <div className="mb-4">
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                    Game Plan
                  </div>
                  <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
                    {team.styleSummary}
                  </p>
                </div>
              )}

              {/* Style bullets */}
              {team.styleBullets && (
                <div className="mb-4">
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    Key Traits
                  </div>
                  <div className="flex flex-col gap-2">
                    {team.styleBullets.split(/[;|•\n]/).filter(b => b.trim()).slice(0, 4).map((bullet, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                        <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                          {bullet.trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distinct style stats — color-coded vs opponent */}
              {s && (() => {
                const opp = team.id === game.team1.id ? game.team2 : game.team1;
                const os = opp.stats;
                if (!os) return null;

                type StyleStat = { label: string; val: string; raw: number; oppRaw: number; higherIsBetter: boolean };
                const styleStats: StyleStat[] = [
                  { label: "Fastbreak PPG", val: fmt(s.scoring.fastbreakPPG), raw: s.scoring.fastbreakPPG, oppRaw: os.scoring.fastbreakPPG, higherIsBetter: true },
                  { label: "3PA/G", val: fmt(s.shooting.threePtAttemptsPG), raw: s.shooting.threePtAttemptsPG, oppRaw: os.shooting.threePtAttemptsPG, higherIsBetter: true },
                  { label: "3PT% Def", val: `${fmt(s.shooting.threePtPctDefense)}%`, raw: s.shooting.threePtPctDefense, oppRaw: os.shooting.threePtPctDefense, higherIsBetter: false },
                  { label: "TOV Forced/G", val: fmt(s.ballControl.turnoversForcedPG), raw: s.ballControl.turnoversForcedPG, oppRaw: os.ballControl.turnoversForcedPG, higherIsBetter: true },
                  { label: "OREB/G", val: fmt(s.rebounding.orebPG), raw: s.rebounding.orebPG, oppRaw: os.rebounding.orebPG, higherIsBetter: true },
                  { label: "FT Made/G", val: fmt(s.shooting.ftMadePG), raw: s.shooting.ftMadePG, oppRaw: os.shooting.ftMadePG, higherIsBetter: true },
                  { label: "Fouls/G", val: fmt(s.defense.fpg), raw: s.defense.fpg, oppRaw: os.defense.fpg, higherIsBetter: false },
                  { label: "Win %", val: `${Math.round(s.tempo.winPct * 100)}%`, raw: s.tempo.winPct, oppRaw: os.tempo.winPct, higherIsBetter: true },
                ];

                return (
                  <div className="mb-4">
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      Style Numbers
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {styleStats.map(({ label, val, raw, oppRaw, higherIsBetter }) => {
                        const isBetter = higherIsBetter ? raw > oppRaw : raw < oppRaw;
                        const isSame = Math.abs(raw - oppRaw) < 0.1;
                        const valColor = isSame ? "white" : isBetter ? "#22c55e" : "rgba(255,255,255,0.45)";
                        return (
                          <div key={label} className="p-2 rounded-lg text-center" style={{ background: isBetter && !isSame ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)" }}>
                            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: valColor }}>{val}</div>
                            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Star player */}
              {team.keyPlayer && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>
                    Star Player
                  </div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>{team.keyPlayer}</div>
                  {team.keyPlayerStat && (
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{team.keyPlayerStat}</div>
                  )}
                </div>
              )}

              {/* Scouting blurb */}
              {team.rotobotBlurb && (
                <div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                    Scouting Report
                  </div>
                  <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
                    {team.rotobotBlurb}
                  </p>
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>

      {/* Style Clash — how the styles collide */}
      <SectionCard>
        <SectionTitle icon={Zap}>Style Clash</SectionTitle>
        <div className="flex flex-col gap-3">
          {(() => {
            const clashStats = [
              {
                label: "TOV Forced/G",
                t1raw: game.team1.stats?.ballControl?.turnoversForcedPG ?? 0,
                t2raw: game.team2.stats?.ballControl?.turnoversForcedPG ?? 0,
                higherIsBetter: true,
                insight: (d: number) => d > 2
                  ? `${(game.team1.stats?.ballControl?.turnoversForcedPG ?? 0) > (game.team2.stats?.ballControl?.turnoversForcedPG ?? 0) ? game.team1.shortName : game.team2.shortName} creates havoc — ball security will be critical`
                  : "Both teams protect the ball well — expect a clean, structured game",
              },
              {
                label: "3PA/G",
                t1raw: game.team1.stats?.shooting?.threePtAttemptsPG ?? 0,
                t2raw: game.team2.stats?.shooting?.threePtAttemptsPG ?? 0,
                higherIsBetter: true,
                insight: () => (game.team1.stats?.shooting?.threePtAttemptsPG ?? 0) > 24 || (game.team2.stats?.shooting?.threePtAttemptsPG ?? 0) > 24
                  ? "Heavy three-point volume means high variance — either team can get hot from deep"
                  : "Neither team is three-point dependent — expect a more traditional inside-out game",
              },
              {
                label: "Fastbreak PPG",
                t1raw: game.team1.stats?.scoring?.fastbreakPPG ?? 0,
                t2raw: game.team2.stats?.scoring?.fastbreakPPG ?? 0,
                higherIsBetter: true,
                insight: (d: number) => d > 3
                  ? `${(game.team1.stats?.scoring?.fastbreakPPG ?? 0) > (game.team2.stats?.scoring?.fastbreakPPG ?? 0) ? game.team1.shortName : game.team2.shortName} thrives in transition — turnovers could be the difference`
                  : "Neither team relies heavily on transition — half-court execution will decide this",
              },
            ];
            return clashStats.map(({ label, t1raw, t2raw, higherIsBetter, insight }, i) => {
              const diff = Math.abs(t1raw - t2raw);
              const t1Better = higherIsBetter ? t1raw > t2raw : t1raw < t2raw;
              const t2Better = higherIsBetter ? t2raw > t1raw : t2raw < t1raw;
              const isSame = diff < 0.3;
              const t1Color = isSame ? CYAN : t1Better ? "#22c55e" : "rgba(255,255,255,0.45)";
              const t2Color = isSame ? BLUE : t2Better ? "#22c55e" : "rgba(255,255,255,0.45)";
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: t1Color }}>{fmt(t1raw)}</span>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{label}</span>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: t2Color }}>{fmt(t2raw)}</span>
                  </div>
                  <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>
                    {insight(diff)}
                  </p>
                  {i < 2 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginTop: 10 }} />}
                </div>
              );
            });
          })()}
        </div>
      </SectionCard>
    </div>
  );
}

function PlayerCard({ p, color, isBench, headshot }: { p: PlayerRecord; color: string; isBench: boolean; headshot?: string }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl" style={{
      background: isBench ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isBench ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)"}`,
    }}>
      {headshot && !imgErr ? (
        <img src={headshot} alt={p.name} onError={() => setImgErr(true)} loading="lazy"
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}33` }} />
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700, color }}>{p.position || "?"}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: "white" }}>{p.name}</span>
          {isBench && <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(245,158,11,0.8)", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 4 }}>BENCH</span>}
        </div>
        <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
          {p.height ? `${p.height} • ` : ""}{p.class ? `${p.class} • ` : ""}{p.gamesPlayed} GP • {p.stats.mpg} MPG
        </div>
        <div className="flex gap-2.5 mt-1.5">
          {[
            { label: "PPG", val: p.stats.ppg },
            { label: "RPG", val: p.stats.rpg },
            { label: "APG", val: p.stats.apg },
            { label: "FG%", val: p.stats.fgPct },
            { label: "3P%", val: p.stats.threePtPct },
            { label: "FT%", val: p.stats.ftPct },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>
                {val ?? "-"}
              </div>
              <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayersTab({ game }: { game: Game }) {
  const { state } = useBracket();
  const [players1, setPlayers1] = useState<PlayerRecord[]>([]);
  const [players2, setPlayers2] = useState<PlayerRecord[]>([]);
  const [headshots, setHeadshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug1 = game.team1.id;
    const slug2 = game.team2.id;
    const fromContext1 = state.players[slug1];
    const fromContext2 = state.players[slug2];

    if (fromContext1?.length !== undefined && fromContext2?.length !== undefined) {
      const sortByPpg = (p: PlayerRecord[]) =>
        [...p].sort((a, b) => (b.stats?.ppg ?? 0) - (a.stats?.ppg ?? 0)).slice(0, 8);
      setPlayers1(sortByPpg(fromContext1));
      setPlayers2(sortByPpg(fromContext2));
      setLoading(false);
    } else {
      setLoading(true);
      Promise.all([
        fetchTeamPlayers(slug1).catch(() => []),
        fetchTeamPlayers(slug2).catch(() => []),
      ]).then(([p1, p2]: [PlayerRecord[], PlayerRecord[]]) => {
        setPlayers1(p1);
        setPlayers2(p2);
        setLoading(false);
      });
    }

    Promise.all([
      fetchEspnRoster(slug1).catch(() => []),
      fetchEspnRoster(slug2).catch(() => []),
    ]).then(([r1, r2]: [{ name: string; headshot?: string }[], { name: string; headshot?: string }[]]) => {
      const map: Record<string, string> = {};
      for (const a of [...r1, ...r2]) {
        if (a.headshot) map[a.name.toLowerCase()] = a.headshot;
      }
      setHeadshots(map);
    });
  }, [game.team1.id, game.team2.id, state.players]);

  // Convert player slug (e.g. "camebooz1") to display name using ESPN roster
  const getDisplayName = (slug: string): string => {
    const lower = slug.toLowerCase().replace(/\d+$/, "");
    if (lower.length < 6) return slug;
    const firstChunk = lower.slice(0, 4);
    const lastChunk = lower.slice(4, 8);
    for (const fullName of Object.keys(headshots)) {
      const parts = fullName.split(" ");
      if (parts.length >= 2 && parts[0].startsWith(firstChunk) && parts[parts.length - 1].startsWith(lastChunk)) {
        return fullName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }
    // Fallback: try to make slug readable (camebooz1 → Came Booz)
    return lower.length >= 8
      ? `${lower.slice(0, 4).charAt(0).toUpperCase()}${lower.slice(1, 4)}. ${lower.slice(4, 8).charAt(0).toUpperCase()}${lower.slice(5, 8)}.`
      : slug;
  };

  const getHeadshot = (name: string) => {
    const lower = name.toLowerCase();
    // Direct match (if name is a full name)
    if (headshots[lower]) return headshots[lower];

    // Slug format: first4_of_firstname + first4_of_lastname + digit (e.g. "camebooz1")
    // ESPN key format: "cameron boozer" (lowercase full name)
    const slug = lower.replace(/\d+$/, ""); // strip trailing digits
    if (slug.length >= 6) {
      const firstChunk = slug.slice(0, 4);
      const lastChunk = slug.slice(4, 8);
      for (const [fullName, url] of Object.entries(headshots)) {
        const parts = fullName.split(" ");
        if (parts.length >= 2) {
          const fn = parts[0];
          const ln = parts[parts.length - 1];
          if (fn.startsWith(firstChunk) && ln.startsWith(lastChunk)) return url;
        }
      }
    }

    // Fallback: any partial match on chunks
    const lastName = slug.slice(4, 8) || slug.slice(-4);
    for (const [k, v] of Object.entries(headshots)) {
      if (lastName.length >= 3 && k.split(" ").pop()?.startsWith(lastName)) return v;
    }
    return undefined;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" color={CYAN} /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[
        { team: game.team1, players: players1, color: CYAN },
        { team: game.team2, players: players2, color: BLUE },
      ].map(({ team, players, color }) => {
        const starters = players.filter(p => p.gamesStarted > (p.gamesPlayed * 0.4));
        const bench = players.filter(p => p.gamesStarted <= (p.gamesPlayed * 0.4));
        return (
          <SectionCard key={team.id}>
            <div className="flex items-center gap-2 mb-4">
              <TeamLogo teamSlug={team.id} teamShortName={team.shortName} teamColor={team.color} size={20} />
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>
                {team.shortName} Roster ({players.length})
              </span>
            </div>
            {players.length === 0 ? (
              <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.3)" }}>No player data available</p>
            ) : (
              <div className="flex flex-col gap-2">
                {starters.length > 0 && (
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                    Starters
                  </div>
                )}
                {starters.map((p) => <PlayerCard key={p.name} p={{ ...p, name: getDisplayName(p.name) }} color={color} isBench={false} headshot={getHeadshot(p.name)} />)}
                {bench.length > 0 && (
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(245,158,11,0.6)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4, marginBottom: 2 }}>
                    Key Bench
                  </div>
                )}
                {bench.map((p) => <PlayerCard key={p.name} p={{ ...p, name: getDisplayName(p.name) }} color={color} isBench={true} headshot={getHeadshot(p.name)} />)}
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

function PicksTab({ game }: { game: Game }) {
  const t1 = game.team1, t2 = game.team2;
  const isPick1 = game.rotobotPick === t1.name || game.rotobotPick === t1.id;
  const pick = isPick1 ? t1 : t2;
  const underdog = isPick1 ? t2 : t1;
  const conf = Math.round(game.rotobotConfidence);
  const isUpset = pick.seed > underdog.seed;

  type SwingStat = { label: string; t1val: string; t2val: string; winner: "t1" | "t2" | "push"; why: string };
  const swingStats: SwingStat[] = [];

  if (Math.abs(t1.eFGPct - t2.eFGPct) > 1) {
    swingStats.push({
      label: "eFG%",
      t1val: `${fmt(t1.eFGPct)}%`,
      t2val: `${fmt(t2.eFGPct)}%`,
      winner: t1.eFGPct > t2.eFGPct ? "t1" : "t2",
      why: "Effective field goal % is the single best shooting predictor for March Madness outcomes",
    });
  }

  const sm1 = t1.stats?.scoring?.scoringMargin ?? (t1.ppg - t1.oppg);
  const sm2 = t2.stats?.scoring?.scoringMargin ?? (t2.ppg - t2.oppg);
  swingStats.push({
    label: "Scoring Margin",
    t1val: sm1 >= 0 ? `+${fmt(sm1)}` : fmt(sm1),
    t2val: sm2 >= 0 ? `+${fmt(sm2)}` : fmt(sm2),
    winner: sm1 > sm2 ? "t1" : sm2 > sm1 ? "t2" : "push",
    why: "Points per game margin separates good teams from great ones in the tournament",
  });

  const defEfg1 = t1.stats?.shooting?.fgPctDefense;
  const defEfg2 = t2.stats?.shooting?.fgPctDefense;
  if (defEfg1 && defEfg2) {
    swingStats.push({
      label: "FG% Allowed",
      t1val: `${fmt(defEfg1)}%`,
      t2val: `${fmt(defEfg2)}%`,
      winner: defEfg1 < defEfg2 ? "t1" : defEfg2 < defEfg1 ? "t2" : "push",
      why: "Elite defenses win one-and-done games — opponent shooting % reflects defensive quality",
    });
  }

  const tov1 = t1.stats?.ballControl?.turnoverMargin ?? 0;
  const tov2 = t2.stats?.ballControl?.turnoverMargin ?? 0;
  if (Math.abs(tov1 - tov2) > 1) {
    swingStats.push({
      label: "Turnover Margin",
      t1val: tov1 >= 0 ? `+${fmt(tov1)}` : fmt(tov1),
      t2val: tov2 >= 0 ? `+${fmt(tov2)}` : fmt(tov2),
      winner: tov1 > tov2 ? "t1" : tov2 > tov1 ? "t2" : "push",
      why: "Teams that protect the ball and force turnovers thrive in tournament pressure",
    });
  }

  const reb1 = t1.stats?.rebounding?.rebMargin ?? 0;
  const reb2 = t2.stats?.rebounding?.rebMargin ?? 0;
  if (Math.abs(reb1 - reb2) > 1) {
    swingStats.push({
      label: "Rebound Margin",
      t1val: reb1 >= 0 ? `+${fmt(reb1)}` : fmt(reb1),
      t2val: reb2 >= 0 ? `+${fmt(reb2)}` : fmt(reb2),
      winner: reb1 > reb2 ? "t1" : reb2 > reb1 ? "t2" : "push",
      why: "Second chance points and limiting opponent possessions are critical in close tournament games",
    });
  }

  const threePct1 = t1.stats?.shooting?.threePtPct ?? 0;
  const threePct2 = t2.stats?.shooting?.threePtPct ?? 0;
  if (threePct1 > 0 && threePct2 > 0 && Math.abs(threePct1 - threePct2) > 2) {
    swingStats.push({
      label: "3PT%",
      t1val: `${fmt(threePct1)}%`,
      t2val: `${fmt(threePct2)}%`,
      winner: threePct1 > threePct2 ? "t1" : "t2",
      why: "Three-point shooting is the great equalizer in March — hot shooting nights fuel upsets",
    });
  }

  const bench1 = t1.stats?.scoring?.benchPPG ?? 0;
  const bench2 = t2.stats?.scoring?.benchPPG ?? 0;
  if (Math.abs(bench1 - bench2) > 4) {
    swingStats.push({
      label: "Bench PPG",
      t1val: fmt(bench1),
      t2val: fmt(bench2),
      winner: bench1 > bench2 ? "t1" : "t2",
      why: "Deeper teams sustain energy across 40 minutes — foul trouble and fatigue magnify bench gaps",
    });
  }

  const wins1 = (t1.recentForm || []).filter(r => r === "W").length;
  const wins2 = (t2.recentForm || []).filter(r => r === "W").length;
  if (t1.recentForm.length >= 3 || t2.recentForm.length >= 3) {
    swingStats.push({
      label: "Recent Form",
      t1val: t1.recentForm.length > 0 ? `${wins1}-${t1.recentForm.length - wins1} L${t1.recentForm.length}` : "—",
      t2val: t2.recentForm.length > 0 ? `${wins2}-${t2.recentForm.length - wins2} L${t2.recentForm.length}` : "—",
      winner: wins1 > wins2 ? "t1" : wins2 > wins1 ? "t2" : "push",
      why: "Hot teams carry momentum into March — conference tournament form matters a lot",
    });
  }

  const topSwing = swingStats.slice(0, 5);

  // Upset case
  const underdogWins = (underdog.recentForm || []).filter(r => r === "W").length;
  const underdogMomentum = underdog.recentForm.length >= 3 && underdogWins >= underdog.recentForm.length * 0.7;
  const efgClose = Math.abs(pick.eFGPct - underdog.eFGPct) < 3;
  const netClose = Math.abs(pick.netRank - underdog.netRank) < 40;

  const upsetFactors: string[] = [];
  if (underdogMomentum) {
    upsetFactors.push(`${underdog.shortName} is on a hot streak (${underdogWins}-${underdog.recentForm.length - underdogWins} L${underdog.recentForm.length})`);
  }
  if (netClose) {
    upsetFactors.push(`NET rankings are closer than seeding suggests — #${pick.netRank} vs #${underdog.netRank}`);
  }
  if (efgClose) {
    upsetFactors.push(`Shooting efficiency is nearly identical (${fmt(pick.eFGPct)}% vs ${fmt(underdog.eFGPct)}% eFG%)`);
  }
  if (underdog.pace > pick.pace + 3) {
    upsetFactors.push(`${underdog.shortName} plays at a faster tempo — could disrupt ${pick.shortName}'s rhythm in a chaotic game`);
  }
  const benchDiff = (underdog.stats?.scoring?.benchPPG ?? 0) - (pick.stats?.scoring?.benchPPG ?? 0);
  if (benchDiff > 5) {
    upsetFactors.push(`${underdog.shortName} has a significantly deeper bench (+${fmt(benchDiff)} bench PPG)`);
  }

  const bettingQuestions = [
    { q: `Compare ${t1.shortName} vs ${t2.shortName} — who has the edge and why?`, icon: "🔍" },
    { q: `What's the key matchup to watch in ${t1.shortName} vs ${t2.shortName}?`, icon: "🏀" },
    { q: `Who covers the spread — ${t1.shortName} or ${t2.shortName}?`, icon: "📊" },
    { q: `Any injury concerns for ${t1.shortName} or ${t2.shortName}?`, icon: "🩺" },
    { q: `What does historical #${t1.seed} vs #${t2.seed} seed data say?`, icon: "📋" },
    { q: `Break down the ${t1.shortName} vs ${t2.shortName} over/under`, icon: "📈" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* RotoBot's Call */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Crosshair size={14} color="#22c55e" />
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>
            RotoBot's Call
          </span>
          {isUpset && (
            <span className="px-2 py-0.5 rounded-full" style={{
              background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
              fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 700, color: "#f59e0b",
            }}>
              UPSET PICK
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mb-4 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <TeamLogo teamSlug={pick.id} teamShortName={pick.shortName} teamColor={pick.color} size={48} />
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 20, fontWeight: 800, color: "white" }}>
              {pick.shortName} wins
            </div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
              #{pick.seed} seed · {pick.record} · {pick.conference}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 32, fontWeight: 800, color: "#22c55e" }}>{conf}%</div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>confidence</div>
          </div>
        </div>
        {game.pickReasoning && (
          <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>
            {game.pickReasoning
              .replace(/committee score/gi, "RotoBot power rating")
              .replace(/\b(\d+\.\d{3,})\b/g, (m) => parseFloat(m).toFixed(1))}
          </p>
        )}
      </SectionCard>

      {/* Swing Stats */}
      {topSwing.length > 0 && (
        <SectionCard>
          <SectionTitle icon={Zap}>Stats That Could Decide This Game</SectionTitle>
          <div className="flex flex-col gap-4">
            {topSwing.map(({ label, t1val, t2val, winner, why }, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: winner === "t1" ? 700 : 400, color: winner === "t1" ? CYAN : "rgba(255,255,255,0.5)" }}>
                      {t1val}
                    </span>
                    {winner === "t1" && <TrendingUp size={10} color={CYAN} />}
                  </div>
                  <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {winner === "t2" && <TrendingUp size={10} color={BLUE} />}
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: winner === "t2" ? 700 : 400, color: winner === "t2" ? BLUE : "rgba(255,255,255,0.5)" }}>
                      {t2val}
                    </span>
                  </div>
                </div>
                <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, margin: 0 }}>
                  {why}
                </p>
                {i < topSwing.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginTop: 12 }} />}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Quad Record Comparison */}
      {t1.stats?.schedule && t2.stats?.schedule && (
        <SectionCard>
          <SectionTitle icon={Shield}>Tournament Resume</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              { team: t1, color: CYAN },
              { team: t2, color: BLUE },
            ].map(({ team, color }) => {
              const sched = team.stats.schedule;
              const quads = [
                { label: "Q1", val: sched.q1Record },
                { label: "Q2", val: sched.q2Record },
                { label: "Q3", val: sched.q3Record },
                { label: "Q4", val: sched.q4Record },
              ].filter(q => q.val);
              return (
                <div key={team.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <TeamLogo teamSlug={team.id} teamShortName={team.shortName} teamColor={team.color} size={14} />
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color }}>{team.shortName}</span>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>NET #{team.netRank}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {quads.map(({ label, val }) => (
                      <div key={label} className="flex-1 text-center p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>{val}</div>
                        <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Upset Case */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} color="#f59e0b" />
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>
            The {underdog.shortName} Upset Case
          </span>
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.3)" }}>
            #{underdog.seed} seed
          </span>
        </div>
        {upsetFactors.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {upsetFactors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#f59e0b" }} />
                <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  {factor}
                </span>
              </div>
            ))}
            <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
              RotoBot still favors {pick.shortName} ({conf}%), but the data shows {underdog.shortName} has a real path.
            </p>
          </div>
        ) : (
          <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
            The data doesn't surface a strong upset scenario here. {pick.shortName} holds clear advantages across the board — this one is unlikely to be close.
          </p>
        )}
      </SectionCard>

      {/* Ask RotoBot */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,184,219,0.2)", background: "linear-gradient(135deg, rgba(0,184,219,0.05) 0%, rgba(60,132,255,0.03) 100%)" }}>
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <RotoBotLogo size={34} className="shrink-0" />
          <div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 700, color: "white" }}>Ask RotoBot</div>
            <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Live lines · Spreads · O/U · Parlays · Injuries</div>
          </div>
        </div>
        <div className="px-5 pb-3 flex flex-col gap-1.5">
          {bettingQuestions.map(({ q, icon }) => (
            <a key={q} href={ROTOBOT_APP_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-2.5 rounded-xl no-underline transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, fontStyle: "italic" }}>"{q}"</span>
            </a>
          ))}
        </div>
        <div className="flex gap-2 px-5 pb-4 pt-1">
          <a href={ROTOBOT_APP_STORE_URL} target="_blank" rel="noopener noreferrer"
            className="no-underline flex-1 py-2 rounded-xl text-center transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.07)", fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "white" }}>
            🍎 iOS
          </a>
          <a href={ROTOBOT_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
            className="no-underline flex-1 py-2 rounded-xl text-center transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.07)", fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "white" }}>
            🤖 Android
          </a>
          <a href={ROTOBOT_WEB_URL} target="_blank" rel="noopener noreferrer"
            className="no-underline flex-1 py-2 rounded-xl text-center transition-all hover:opacity-80"
            style={{ background: "rgba(0,184,219,0.15)", border: "1px solid rgba(0,184,219,0.25)", fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "#00b8db" }}>
            🌐 Web
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Tabs Config ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "stats", label: "Stats", icon: BarChart2 },
  { id: "style", label: "Style", icon: Shield },
  { id: "players", label: "Players", icon: Users },
  { id: "picks", label: "Picks", icon: Crosshair },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Main Component ──────────────────────────────────────────────────────────

export function MatchupScreen() {
  const { id } = useParams();
  const { findGameById, makePick, state } = useBracket();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const game = id ? findGameById(id) : undefined;

  if (!state.dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
        <Loader2 size={32} className="animate-spin" color={CYAN} />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#030712" }}>
        <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 18, fontWeight: 700, color: "white" }}>
          Matchup not found
        </span>
        <Link to="/bracket" className="no-underline" style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, color: CYAN }}>
          Back to bracket
        </Link>
      </div>
    );
  }

  const t1 = game.team1, t2 = game.team2;
  const isPick1 = game.rotobotPick === t1.name || game.rotobotPick === t1.id;
  const conf = Math.round(game.rotobotConfidence);

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-8"
      style={{ background: "linear-gradient(160deg, #010c2a 0%, #030712 40%, #00081e 100%)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative">
        {/* Back */}
        <Link to="/bracket" className="no-underline flex items-center gap-1.5 mb-6"
          style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
          <ChevronLeft size={14} /> Back to bracket
        </Link>

        {/* Team headers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { team: t1, color: CYAN, isPick: isPick1, side: "left" as const },
            { team: t2, color: BLUE, isPick: !isPick1, side: "right" as const },
          ].map(({ team, color, isPick, side }) => (
            <div key={team.id} className="rounded-2xl p-4" style={{
              background: `linear-gradient(135deg, ${color}08, ${color}03)`,
              border: `1px solid ${color}${isPick ? "44" : "22"}`,
            }}>
              <div className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
                <TeamLogo teamSlug={team.id} teamShortName={team.shortName} teamColor={team.color} size={52} />
                <div style={{ textAlign: side === "right" ? "right" : "left", flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2" style={{ justifyContent: side === "right" ? "flex-end" : "flex-start" }}>
                    <span className="px-1.5 py-0.5 rounded" style={{
                      background: `${color}22`, fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color,
                    }}>
                      #{team.seed}
                    </span>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 17, fontWeight: 800, color: "white" }}>
                      {team.shortName}
                    </span>
                    {isPick && <Brain size={13} color={color} />}
                  </div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                    {team.record} · {team.conference}
                  </div>
                  <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.3)" }}>
                    NET #{team.netRank}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {[
                  { label: "PPG", val: Number(team.ppg).toFixed(1) },
                  { label: "eFG%", val: Number(team.eFGPct).toFixed(1) },
                  { label: "NET", val: `#${team.netRank}` },
                  { label: "RotoBot", val: Number(team.rotobotScore).toFixed(1), highlight: true },
                ].map(({ label, val, highlight }) => (
                  <div key={label} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{label}</span>
                    <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 700, color: highlight ? color : "white" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Style tags */}
              {team.styleTags && team.styleTags.filter(t => t && t !== "nan").length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {team.styleTags.filter(t => t && t !== "nan").slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full" style={{
                      background: `${color}10`, border: `1px solid ${color}25`,
                      fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 500, color: `${color}cc`,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Pick button */}
              <button
                onClick={() => makePick(game.id, team.id)}
                className="w-full mt-3 py-2 rounded-xl transition-all hover:opacity-80"
                style={{
                  background: state.userPicks[game.id] === team.id ? `${color}33` : "rgba(255,255,255,0.05)",
                  border: state.userPicks[game.id] === team.id ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600,
                  color: state.userPicks[game.id] === team.id ? color : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                }}
              >
                {state.userPicks[game.id] === team.id ? "✓ Your Pick" : `Pick ${team.shortName}`}
              </button>
            </div>
          ))}
        </div>

        {/* RotoBot pick summary strip */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <Brain size={14} color="#22c55e" />
          <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.6)" }}>
            RotoBot picks{" "}
            <span style={{ fontWeight: 700, color: "white" }}>
              {isPick1 ? t1.shortName : t2.shortName}
            </span>
            {" "}with{" "}
            <span style={{ fontWeight: 700, color: "#22c55e" }}>{conf}%</span>
            {" "}confidence
          </span>
          <button
            onClick={() => setActiveTab("picks")}
            style={{ marginLeft: "auto", fontFamily: "Rubik, sans-serif", fontSize: 15, fontWeight: 600, color: "#22c55e", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            See why →
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap"
              style={{
                fontFamily: "Rubik, sans-serif", fontSize: 16,
                fontWeight: activeTab === tabId ? 600 : 400,
                color: activeTab === tabId ? "white" : "rgba(255,255,255,0.4)",
                background: activeTab === tabId ? "rgba(0,184,219,0.12)" : "transparent",
                border: activeTab === tabId ? "1px solid rgba(0,184,219,0.2)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab game={game} />}
        {activeTab === "stats" && <StatsTab game={game} />}
        {activeTab === "style" && <StyleTab game={game} />}
        {activeTab === "players" && <PlayersTab game={game} />}
        {activeTab === "picks" && <PicksTab game={game} />}
      </div>
    </div>
  );
}
