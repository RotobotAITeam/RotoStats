import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Trophy, BarChart2, Home, ChevronDown, Smartphone, Globe, Link2 } from "lucide-react";
import { RotoBotLogo } from "./RotoBotLogo";
import { ROTOBOT_APP_STORE_URL, ROTOBOT_PLAY_STORE_URL, ROTOBOT_WEB_URL } from "../constants";

const LINKTREE_URL = "https://linktr.ee/rotobotai";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/bracket", label: "Bracket", icon: Trophy },
  { to: "/analysis", label: "Analysis", icon: BarChart2 },
];

const DROPDOWN_LINKS = [
  { href: ROTOBOT_APP_STORE_URL, icon: "🍎", label: "iOS App", sub: "App Store" },
  { href: ROTOBOT_PLAY_STORE_URL, icon: "🤖", label: "Android App", sub: "Google Play" },
  { href: ROTOBOT_WEB_URL, icon: "🌐", label: "Web App", sub: "app.rotobot.ai" },
  { href: LINKTREE_URL, icon: "🔗", label: "All Links", sub: "linktr.ee/rotobotai" },
];

export function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: "rgba(1, 16, 62, 0.92)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo + Brand */}
      <Link to="/" className="flex items-center gap-3 no-underline">
        <RotoBotLogo size={38} />
        <div className="flex flex-col leading-none">
          <span
            className="text-white"
            style={{ fontFamily: "Rubik, sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}
          >
            RotoBot
          </span>
          <span style={{ fontFamily: "Rubik, sans-serif", fontWeight: 400, fontSize: 14, color: "#00b8db", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            March Madness
          </span>
        </div>
      </Link>

      {/* Center nav links (desktop) */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 px-4 py-2 rounded-xl no-underline transition-all"
              style={{
                fontFamily: "Rubik, sans-serif",
                fontWeight: 500,
                fontSize: 14,
                color: active ? "#00b8db" : "rgba(255,255,255,0.6)",
                background: active ? "rgba(0,184,219,0.12)" : "transparent",
                border: active ? "1px solid rgba(0,184,219,0.3)" : "1px solid transparent",
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right: CTA */}
      <div className="flex items-center gap-3">
        {/* Get RotoBot dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:opacity-90"
            style={{
              fontFamily: "Rubik, sans-serif",
              fontWeight: 600,
              fontSize: 16,
              background: open ? "rgba(0,184,219,0.18)" : "rgba(0,184,219,0.1)",
              border: `1px solid ${open ? "rgba(0,184,219,0.4)" : "rgba(0,184,219,0.25)"}`,
              color: "#00b8db",
              cursor: "pointer",
            }}
          >
            <Smartphone size={13} />
            Get RotoBot
            <ChevronDown
              size={13}
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(4, 20, 70, 0.98)",
                border: "1px solid rgba(0,184,219,0.2)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                minWidth: 220,
                zIndex: 100,
              }}
            >
              <div className="px-4 pt-4 pb-2">
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Get the full experience
                </div>
              </div>
              {DROPDOWN_LINKS.map(({ href, icon, label, sub }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 no-underline transition-all hover:bg-[rgba(0,184,219,0.08)]"
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, fontWeight: 600, color: "white" }}>{label}</div>
                    <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)" }}>{sub}</div>
                  </div>
                </a>
              ))}
              <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                  AI matchup analysis · Spreads · O/U · Parlays
                </div>
              </div>
            </div>
          )}
        </div>

        <Link
          to="/bracket"
          className="no-underline px-4 py-2 rounded-xl transition-all"
          style={{
            fontFamily: "Rubik, sans-serif",
            fontWeight: 600,
            fontSize: 16,
            background: "linear-gradient(135deg, #00b8db 0%, #3c84ff 100%)",
            color: "white",
          }}
        >
          Build Bracket
        </Link>
      </div>
    </nav>
  );
}

// Mobile bottom nav
export function BottomNav() {
  const location = useLocation();
  return (
    <div
      className="fixed bottom-0 left-0 right-0 md:hidden flex items-center justify-around px-2 py-2 z-50"
      style={{
        background: "rgba(1, 16, 62, 0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl no-underline"
            style={{ color: active ? "#00b8db" : "rgba(255,255,255,0.4)" }}
          >
            <Icon size={20} />
            <span style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 500 }}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
