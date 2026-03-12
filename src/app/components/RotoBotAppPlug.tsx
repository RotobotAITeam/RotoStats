import { ArrowRight } from "lucide-react";
import { RotoBotLogo } from "./RotoBotLogo";
import { ROTOBOT_APP_STORE_URL, ROTOBOT_PLAY_STORE_URL, ROTOBOT_WEB_URL } from "../constants";

type Variant = "compact" | "banner" | "fullBanner" | "topBanner";

interface RotoBotAppPlugProps {
  variant?: Variant;
  /** Optional section headline above the plug (ignored for fullBanner) */
  sectionTitle?: string;
  className?: string;
}

const COPY = {
  headline: "RotoBot — AI Sports Insights",
  subline:
    "AI-powered matchup analysis, real-time injury reports, spreads, O/U, first-half bets, and parlay help. Available on iOS, Android, and the web.",
  fullBanner: {
    headline: "Get RotoBot",
    subline:
      "This bracket tool is from RotoBot. In the full app: live moneyline, spread & O/U for every matchup, first-half and parlay picks, AI matchup analysis, and injury reports.",
    cta: "Download free on iOS, Android, or use the web app.",
  },
};

export function RotoBotAppPlug({
  variant = "compact",
  sectionTitle,
  className = "",
}: RotoBotAppPlugProps) {
  const isBanner = variant === "banner";
  const isFullBanner = variant === "fullBanner";
  const isTopBanner = variant === "topBanner";

  // Full-width bar for top of every page — matches Navbar + app styling
  if (isTopBanner) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          background: "rgba(1, 16, 62, 0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 py-3 sm:py-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(0,184,219,0.12)", border: "1px solid rgba(0,184,219,0.2)" }}
            >
              <RotoBotLogo size={28} />
            </div>
            <div className="min-w-0">
              <h2
                style={{
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "white",
                  margin: 0,
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                }}
              >
                {COPY.fullBanner.headline}
              </h2>
              <p
                style={{
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.6)",
                  margin: "2px 0 0 0",
                  lineHeight: 1.35,
                }}
              >
                {COPY.fullBanner.subline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href={ROTOBOT_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all hover:opacity-90 min-h-[44px]"
              style={{
                fontFamily: "Rubik, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                background: "linear-gradient(135deg, #00b8db 0%, #3c84ff 100%)",
                color: "white",
              }}
            >
              App Store
            </a>
            <a
              href={ROTOBOT_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all hover:opacity-90 min-h-[44px]"
              style={{
                fontFamily: "Rubik, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                background: "linear-gradient(135deg, #00b8db 0%, #3c84ff 100%)",
                color: "white",
              }}
            >
              Google Play
            </a>
            <a
              href={ROTOBOT_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all hover:opacity-90 min-h-[44px]"
              style={{
                fontFamily: "Rubik, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                background: "rgba(0,184,219,0.1)",
                border: "1px solid rgba(0,184,219,0.25)",
                color: "#00b8db",
              }}
            >
              Open Web App <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isFullBanner) {
    return (
      <div className={className}>
        <div
          className="rounded-2xl overflow-hidden transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(0,184,219,0.14) 0%, rgba(60,132,255,0.12) 50%, rgba(0,184,219,0.08) 100%)",
            border: "1px solid rgba(0,184,219,0.35)",
            boxShadow: "0 4px 24px rgba(0,184,219,0.12)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:p-8">
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(0,184,219,0.25)" }}>
                <RotoBotLogo size={48} />
              </div>
              <div>
                <h3 style={{ fontFamily: "Rubik, sans-serif", fontSize: 22, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.5px" }}>
                  {COPY.fullBanner.headline}
                </h3>
                <p style={{ fontFamily: "Rubik, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                  {COPY.fullBanner.subline}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0" />
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={ROTOBOT_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #00b8db 0%, #0ea5c0 100%)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "white",
                }}
              >
                App Store
              </a>
              <a
                href={ROTOBOT_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #3c84ff 0%, #2563eb 100%)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "white",
                }}
              >
                Google Play
              </a>
              <a
                href={ROTOBOT_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(0,184,219,0.4)",
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#00b8db",
                }}
              >
                Open Web App <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div style={{ padding: "0 1.5rem 1rem", fontFamily: "Rubik, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)" }}>
            {COPY.fullBanner.cta}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {sectionTitle && (
        <div
          className="mb-2"
          style={{ fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}
        >
          {sectionTitle}
        </div>
      )}
      <div
        className="rounded-2xl"
        style={{
          background: isBanner
            ? "linear-gradient(135deg, rgba(0,184,219,0.08) 0%, rgba(60,132,255,0.08) 100%)"
            : "rgba(0,184,219,0.06)",
          border: "1px solid rgba(0,184,219,0.2)",
        }}
      >
        <div className={`flex items-center gap-4 ${isBanner ? "p-5" : "p-4"}`}>
          <RotoBotLogo size={isBanner ? 56 : 44} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div
              style={{ fontFamily: "Rubik, sans-serif", fontSize: isBanner ? 16 : 14, fontWeight: 700, color: "white", marginBottom: 4 }}
            >
              {COPY.headline}
            </div>
            <div
              style={{ fontFamily: "Rubik, sans-serif", fontSize: isBanner ? 13 : 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}
            >
              {COPY.subline}
            </div>
            {/* Platform links */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { href: ROTOBOT_APP_STORE_URL, label: "iOS" },
                { href: ROTOBOT_PLAY_STORE_URL, label: "Android" },
                { href: ROTOBOT_WEB_URL, label: "Web" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline px-3 py-1 rounded-lg transition-all hover:opacity-80"
                  style={{
                    background: "rgba(0,184,219,0.15)",
                    border: "1px solid rgba(0,184,219,0.25)",
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#00b8db",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
