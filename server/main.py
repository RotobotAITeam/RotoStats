"""BracketBuilder API Server (Postgres-backed)."""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from server.ai import (
    PerplexityClient,
    _cache_path,
    _write_cache,
    fetch_matchup_trends,
    fetch_team_news,
)
from server.data_access import (
    get_all_players,
    get_bracket,
    get_conferences,
    get_health,
    get_news_context,
    get_power_rankings,
    get_summary,
    get_teams,
)

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ESPN_MANIFEST_PATH = Path(os.getenv("ESPN_MANIFEST_PATH", str(PROJECT_ROOT / "data" / "export" / "espn_manifest.json")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="BracketBuilder API", version="2.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://bracketbuilder.vercel.app",
]
_extra_origin = os.getenv("CORS_ORIGIN", "")
if _extra_origin:
    ALLOWED_ORIGINS.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "BracketBuilder API", "docs": "/docs", "health": "/api/health"}


_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL = int(os.getenv("API_CACHE_TTL_SECONDS", "60"))
BRACKET_CACHE_TTL = int(os.getenv("BRACKET_CACHE_TTL_SECONDS", "3600"))


def _cached(key: str, loader, ttl: int | None = None):
    now = time.time()
    effective_ttl = ttl if ttl is not None else CACHE_TTL
    cached = _cache.get(key)
    if cached and now - cached[0] < effective_ttl:
        return cached[1]
    value = loader()
    _cache[key] = (now, value)
    return value


def _teams() -> dict[str, dict[str, Any]]:
    return _cached("teams", get_teams)


def _players() -> dict[str, list[dict[str, Any]]]:
    return _cached("players", get_all_players)


def _bracket() -> dict[str, Any]:
    return _cached("bracket", lambda: get_bracket(_teams()), ttl=BRACKET_CACHE_TTL)


def _summary() -> dict[str, Any]:
    return _cached("summary", lambda: get_summary(_teams(), _players(), _bracket()))


def _conferences() -> dict[str, list[str]]:
    return _cached("conferences", lambda: get_conferences(_teams()))


def _power_rankings() -> list[dict[str, Any]]:
    return _cached("power_rankings", lambda: get_power_rankings(_teams()))


_news_cache: dict[str, str] = {}
_trends_cache: dict[str, str] = {}
_espn_manifest: dict[str, Any] | None = None


@app.get("/api/teams")
def api_teams():
    return _teams()


@app.get("/api/bracket")
def api_bracket():
    return _bracket()


@app.get("/api/players")
def api_players():
    full = _players()
    return {slug: players[:8] for slug, players in full.items()}


@app.get("/api/players/{team_slug}")
def api_team_players(team_slug: str):
    players = _players().get(team_slug)
    if players is None:
        raise HTTPException(status_code=404, detail=f"No players found for team: {team_slug}")
    return players[:8]


@app.get("/api/summary")
def api_summary():
    return _summary()


@app.get("/api/conferences")
def api_conferences():
    return _conferences()


@app.get("/api/power-rankings")
def api_power_rankings():
    return _power_rankings()


def _load_news_cache() -> dict[str, str]:
    global _news_cache
    if _news_cache:
        return _news_cache

    _news_cache.update(get_news_context(_teams()))
    cache_dir = PROJECT_ROOT / "data" / "gemini_cache" / "news"
    if cache_dir.exists():
        for f in cache_dir.glob("*.json"):
            try:
                payload = json.loads(f.read_text(encoding="utf-8"))
                if payload.get("content"):
                    _news_cache[f.stem] = str(payload["content"])
            except Exception:
                continue
    return _news_cache


@app.get("/api/news")
def api_all_news():
    return _load_news_cache()


@app.get("/api/news/{team_slug}")
def api_team_news(team_slug: str):
    return {"slug": team_slug, "news": _load_news_cache().get(team_slug, "")}


class NewsFetchRequest(BaseModel):
    teamSlug: str
    force: bool = False


@app.post("/api/news/fetch")
def api_news_fetch(req: NewsFetchRequest):
    news = _load_news_cache()
    if news.get(req.teamSlug) and not req.force:
        return {"slug": req.teamSlug, "news": news[req.teamSlug], "cached": True}

    team = _teams().get(req.teamSlug)
    if not team:
        raise HTTPException(status_code=404, detail=f"Team not found: {req.teamSlug}")

    if req.force:
        try:
            cache_file = _cache_path("news", req.teamSlug)
            if cache_file.exists():
                cache_file.unlink()
        except Exception:
            pass
        _news_cache.pop(req.teamSlug, None)

    pplx_key = os.getenv("PERPLEXITY_API_KEY", "").strip()
    content = ""
    if pplx_key:
        content = fetch_team_news(
            PerplexityClient(pplx_key),
            str(team.get("name", "")),
            str(team.get("conference", "")),
            req.teamSlug,
        )
    _write_cache("news", req.teamSlug, {"content": content, "team": team.get("name", "")})
    _news_cache[req.teamSlug] = content
    return {"slug": req.teamSlug, "news": content, "cached": False}


class TrendsFetchRequest(BaseModel):
    team1Slug: str
    team2Slug: str


@app.post("/api/trends/fetch")
def api_trends_fetch(req: TrendsFetchRequest):
    key = f"{req.team1Slug}_vs_{req.team2Slug}"
    if key in _trends_cache:
        return {"key": key, "trends": _trends_cache[key], "cached": True}

    teams = _teams()
    team1 = teams.get(req.team1Slug)
    team2 = teams.get(req.team2Slug)
    if not team1 or not team2:
        raise HTTPException(status_code=404, detail="Team not found")

    pplx_key = os.getenv("PERPLEXITY_API_KEY", "").strip()
    content = ""
    if pplx_key:
        content = fetch_matchup_trends(
            PerplexityClient(pplx_key),
            str(team1.get("name", "")),
            str(team2.get("name", "")),
            int(team1.get("seed", 0) or 0),
            int(team2.get("seed", 0) or 0),
            str(team1.get("styleIdentity", "")),
            str(team2.get("styleIdentity", "")),
            key,
        )
    _write_cache("trends", key, {"content": content, "team1": team1.get("name", ""), "team2": team2.get("name", "")})
    _trends_cache[key] = content
    return {"key": key, "trends": content, "cached": False}


SLUG_ALIASES: dict[str, str] = {
    "south-florida": "south-fla",
    "south-alabama": "south-ala",
    "southeast-missouri-state": "southeast-mo-st",
    "south-dakota-state": "south-dakota-st",
    "southern-illinois": "southern-ill",
    "south-carolina-state": "south-carolina-st",
    "southern-indiana": "southern-ind",
    "southeastern-louisiana": "southeastern-la",
}


def _load_espn_manifest() -> dict[str, Any]:
    global _espn_manifest
    if _espn_manifest is not None:
        return _espn_manifest
    if ESPN_MANIFEST_PATH.exists():
        try:
            raw = json.loads(ESPN_MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            raw = {"logos": {}, "headshots": {}}
    else:
        raw = {"logos": {}, "headshots": {}}

    logos = raw.get("logos", {})
    headshots = raw.get("headshots", {})
    for db_slug, espn_slug in SLUG_ALIASES.items():
        if espn_slug in logos and db_slug not in logos:
            logos[db_slug] = logos[espn_slug]
        if espn_slug in headshots and db_slug not in headshots:
            headshots[db_slug] = headshots[espn_slug]

    # Override logos whose S3 images are wrong with ESPN CDN originals
    LOGO_OVERRIDES: dict[str, str] = {
        "ohio-st": "https://a.espncdn.com/i/teamlogos/ncaa/500/194.png",
        "south-fla": "https://a.espncdn.com/i/teamlogos/ncaa/500/58.png",
    }
    for slug, url in LOGO_OVERRIDES.items():
        logos[slug] = url

    raw["logos"] = logos
    raw["headshots"] = headshots
    _espn_manifest = raw
    return _espn_manifest


@app.get("/api/espn/logos")
def api_espn_logos():
    return _load_espn_manifest().get("logos", {})


@app.get("/api/espn/roster/{team_slug}")
def api_espn_roster(team_slug: str):
    resolved = SLUG_ALIASES.get(team_slug, team_slug)
    hs = _load_espn_manifest().get("headshots", {}).get(resolved, {})
    if not hs:
        hs = _load_espn_manifest().get("headshots", {}).get(team_slug, {})
    return [{"name": name, "headshot": url} for name, url in hs.items()]


@app.get("/api/health")
def api_health():
    health = get_health()
    health["cacheTtlSeconds"] = CACHE_TTL
    health["espnManifestPath"] = str(ESPN_MANIFEST_PATH)
    return health


@app.post("/api/cache/clear")
def api_clear_cache():
    _cache.clear()
    _news_cache.clear()
    _trends_cache.clear()
    return {"status": "cleared"}
