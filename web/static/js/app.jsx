/* ================================================================
   xAssassin — Editorial Exhibition React App
   ================================================================ */
const { useState, useEffect, useCallback, useMemo, useRef } = React;

const API = "/api";
async function api(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error("" + r.status);
  return r.json();
}

/* ---- Hash Routing ---- */
function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const h = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return route;
}

/* ---- Coordinate helpers (Opta 0-100 → SVG pitch) ---- */
const Y = (y) => (parseFloat(y) / 100) * 68;
const X = (x) => parseFloat(x);

/* ================================================================
   DATA FIELD HERO — Editorial Pitch Visualization
   Animated pitch with drifting player dots and pass connections
   ================================================================ */
function DataFieldHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let w, h;

    // Colors matching editorial palette
    const CREAM = "#F5EADB";
    const LINE_COLOR = "rgba(120, 110, 95, 0.25)";
    const DOT_COLOR = "#C8102E";
    const PASS_COLOR = "rgba(200, 16, 46, 0.15)";
    const GOLD = "#B8860B";

    // Player positions (approximate 4-3-3 formation, normalized 0-1)
    const formations = {
      home: [
        { x: 0.06, y: 0.5 }, // GK
        { x: 0.18, y: 0.2 },
        { x: 0.18, y: 0.4 },
        { x: 0.18, y: 0.6 },
        { x: 0.18, y: 0.8 }, // DEF
        { x: 0.38, y: 0.3 },
        { x: 0.38, y: 0.5 },
        { x: 0.38, y: 0.7 }, // MID
        { x: 0.58, y: 0.2 },
        { x: 0.58, y: 0.5 },
        { x: 0.58, y: 0.8 }, // FWD
      ],
      away: [
        { x: 0.94, y: 0.5 },
        { x: 0.82, y: 0.2 },
        { x: 0.82, y: 0.4 },
        { x: 0.82, y: 0.6 },
        { x: 0.82, y: 0.8 },
        { x: 0.62, y: 0.3 },
        { x: 0.62, y: 0.5 },
        { x: 0.62, y: 0.7 },
        { x: 0.42, y: 0.2 },
        { x: 0.42, y: 0.5 },
        { x: 0.42, y: 0.8 },
      ],
    };

    // Create players with drift offsets
    const players = [];
    formations.home.forEach((pos, i) => {
      players.push({
        baseX: pos.x,
        baseY: pos.y,
        x: pos.x,
        y: pos.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        radius: i === 0 ? 4 : 3,
        team: "home",
      });
    });
    formations.away.forEach((pos, i) => {
      players.push({
        baseX: pos.x,
        baseY: pos.y,
        x: pos.x,
        y: pos.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        radius: i === 0 ? 4 : 3,
        team: "away",
      });
    });

    // Pass lines that animate
    const passes = [];
    const maxPasses = 3;

    function spawnPass() {
      if (passes.length >= maxPasses) return;
      const teamPlayers = players.filter(
        (p) => p.team === (Math.random() > 0.5 ? "home" : "away"),
      );
      const from = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
      const to = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
      if (from === to) return;
      passes.push({
        from,
        to,
        progress: 0,
        speed: 0.008 + Math.random() * 0.008,
        opacity: 0.4 + Math.random() * 0.3,
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    function drawPitch() {
      const pitchW = w * 0.75;
      const pitchH = pitchW * 0.68;
      const offsetX = (w - pitchW) / 2;
      const offsetY = (h - pitchH) / 2;

      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 1;

      // Outer boundary
      ctx.strokeRect(offsetX, offsetY, pitchW, pitchH);

      // Center line
      ctx.beginPath();
      ctx.moveTo(w / 2, offsetY);
      ctx.lineTo(w / 2, offsetY + pitchH);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, pitchH * 0.13, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = LINE_COLOR;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Penalty areas
      const penW = pitchW * 0.16;
      const penH = pitchH * 0.44;
      const penY = offsetY + (pitchH - penH) / 2;
      ctx.strokeRect(offsetX, penY, penW, penH);
      ctx.strokeRect(offsetX + pitchW - penW, penY, penW, penH);

      // Goal areas
      const goalW = pitchW * 0.055;
      const goalH = pitchH * 0.2;
      const goalY = offsetY + (pitchH - goalH) / 2;
      ctx.strokeRect(offsetX, goalY, goalW, goalH);
      ctx.strokeRect(offsetX + pitchW - goalW, goalY, goalW, goalH);
    }

    function getPlayerScreenPos(p) {
      const pitchW = w * 0.75;
      const pitchH = pitchW * 0.68;
      const offsetX = (w - pitchW) / 2;
      const offsetY = (h - pitchH) / 2;
      return {
        x: offsetX + p.x * pitchW,
        y: offsetY + p.y * pitchH,
      };
    }

    function drawPlayers(time) {
      players.forEach((p) => {
        // Subtle drift animation
        const drift = 0.015;
        p.x = p.baseX + Math.sin(time * p.speed + p.phase) * drift;
        p.y = p.baseY + Math.cos(time * p.speed * 0.7 + p.phase) * drift;

        const pos = getPlayerScreenPos(p);

        // Outer glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle =
          p.team === "home"
            ? "rgba(200, 16, 46, 0.08)"
            : "rgba(184, 134, 11, 0.08)";
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.team === "home" ? DOT_COLOR : GOLD;
        ctx.fill();
      });
    }

    function drawPasses() {
      passes.forEach((pass, i) => {
        const fromPos = getPlayerScreenPos(pass.from);
        const toPos = getPlayerScreenPos(pass.to);

        // Draw partial line based on progress
        const currentX = fromPos.x + (toPos.x - fromPos.x) * pass.progress;
        const currentY = fromPos.y + (toPos.y - fromPos.y) * pass.progress;

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle =
          pass.from.team === "home"
            ? `rgba(200, 16, 46, ${pass.opacity * (1 - pass.progress * 0.5)})`
            : `rgba(184, 134, 11, ${pass.opacity * (1 - pass.progress * 0.5)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Animate
        pass.progress += pass.speed;
        if (pass.progress >= 1) {
          passes.splice(i, 1);
        }
      });
    }

    let lastSpawn = 0;
    function animate(time) {
      time *= 0.001; // Convert to seconds

      ctx.clearRect(0, 0, w, h);

      drawPitch();
      drawPasses();
      drawPlayers(time);

      // Spawn new passes periodically
      if (time - lastSpawn > 1.5 + Math.random() * 2) {
        spawnPass();
        lastSpawn = time;
      }

      animId = requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener("resize", resize);
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="data-field-canvas" />;
}

/* ================================================================
   SHARED UI COMPONENTS
   ================================================================ */
function Loading() {
  return <div className="loading">Loading data…</div>;
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon || "—"}</div>
      <p>{message || "No data available."}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  if (!rows || !rows.length) return <EmptyState message="No rows." />;
  const tableRef = useRef(null);

  useEffect(() => {
    if (typeof gsap === "undefined" || !tableRef.current) return;
    const trs = tableRef.current.querySelectorAll("tbody tr");
    if (!trs.length) return;
    gsap.fromTo(
      trs,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: "power2.out" },
    );
  }, [rows]);

  return (
    <div className="table-container">
      <table className="data-table" ref={tableRef}>
        <thead>
          <tr>
            <th className="rank">#</th>
            {columns.map(function (c) {
              return <th key={c.key}>{c.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(function (row, i) {
            return (
              <tr key={i}>
                <td className="rank">{i + 1}</td>
                {columns.map(function (c) {
                  return (
                    <td key={c.key} className={c.numeric ? "value-cell" : ""}>
                      {row[c.key]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================
   PITCH SVG — Editorial Palette
   ================================================================ */
var LC = "rgba(120,110,95,0.35)";
var LW = "0.25";

function PitchMarkings({ half }) {
  return (
    <g>
      <rect x="0" y="0" width="100" height="68" fill="#F0E8DA" />
      <rect
        x="0"
        y="0"
        width="100"
        height="68"
        fill="none"
        stroke={LC}
        strokeWidth={LW}
      />
      {!half && (
        <line x1="50" y1="0" x2="50" y2="68" stroke={LC} strokeWidth={LW} />
      )}
      {!half && (
        <circle
          cx="50"
          cy="34"
          r="9.15"
          fill="none"
          stroke={LC}
          strokeWidth={LW}
        />
      )}
      {!half && <circle cx="50" cy="34" r="0.5" fill={LC} />}
      <rect
        x="0"
        y="13.84"
        width="17"
        height="40.32"
        fill="none"
        stroke={LC}
        strokeWidth={LW}
      />
      <rect
        x="0"
        y="24.84"
        width="5.5"
        height="18.32"
        fill="none"
        stroke={LC}
        strokeWidth={LW}
      />
      <circle cx="11" cy="34" r="0.4" fill={LC} />
      {!half && (
        <rect
          x="83"
          y="13.84"
          width="17"
          height="40.32"
          fill="none"
          stroke={LC}
          strokeWidth={LW}
        />
      )}
      {!half && (
        <rect
          x="94.5"
          y="24.84"
          width="5.5"
          height="18.32"
          fill="none"
          stroke={LC}
          strokeWidth={LW}
        />
      )}
      {!half && <circle cx="89" cy="34" r="0.4" fill={LC} />}
    </g>
  );
}

function PitchSVG({ children, half }) {
  var vb = half ? "-2 -3 56 74" : "-4 -3 108 74";
  return (
    <div className="pitch-container">
      <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker
            id="arr-crimson"
            markerWidth="3"
            markerHeight="2.4"
            refX="3"
            refY="1.2"
            orient="auto"
          >
            <polygon points="0 0, 3 1.2, 0 2.4" fill="#C8102E" />
          </marker>
          <marker
            id="arr-gold"
            markerWidth="3"
            markerHeight="2.4"
            refX="3"
            refY="1.2"
            orient="auto"
          >
            <polygon points="0 0, 3 1.2, 0 2.4" fill="#B8860B" />
          </marker>
        </defs>
        <PitchMarkings half={half || false} />
        {children}
      </svg>
    </div>
  );
}

function PassArrows({ passes, color, alpha, markerId, limit }) {
  var c = color || "#C8102E";
  var a = alpha != null ? alpha : 0.7;
  var m = markerId || "arr-crimson";
  var data = (passes || []).slice(0, limit || 4000);
  return (
    <g>
      {data.map(function (p, i) {
        var x1 = X(p.x),
          y1 = Y(p.y),
          x2 = X(p.end_x),
          y2 = Y(p.end_y);
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={c}
            strokeWidth="0.25"
            opacity={a}
            markerEnd={"url(#" + m + ")"}
          />
        );
      })}
    </g>
  );
}

/* ================================================================
   RADAR CHART — Warm Palette
   ================================================================ */
function RadarChart({ labels, seriesA, seriesB, nameA, nameB }) {
  var cx = 160,
    cy = 160,
    R = 120,
    n = labels.length;
  var maxV = labels.map(function (_, i) {
    return Math.max(seriesA[i], seriesB[i], 1);
  });
  var nA = seriesA.map(function (v, i) {
    return v / maxV[i];
  });
  var nB = seriesB.map(function (v, i) {
    return v / maxV[i];
  });
  var ang = function (i) {
    return (Math.PI * 2 * i) / n - Math.PI / 2;
  };
  var px = function (f, i) {
    return cx + R * f * Math.cos(ang(i));
  };
  var py = function (f, i) {
    return cy + R * f * Math.sin(ang(i));
  };
  var poly = function (ns) {
    return ns
      .map(function (f, i) {
        return px(f, i) + "," + py(f, i);
      })
      .join(" ");
  };

  return (
    <div className="radar-container">
      <svg width="360" height="360" viewBox="0 0 320 320">
        {[0.25, 0.5, 0.75, 1].map(function (r) {
          return (
            <polygon
              key={r}
              points={labels
                .map(function (_, i) {
                  return px(r, i) + "," + py(r, i);
                })
                .join(" ")}
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.5"
            />
          );
        })}
        {labels.map(function (_, i) {
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={px(1, i)}
              y2={py(1, i)}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.5"
            />
          );
        })}
        <polygon
          points={poly(nA)}
          fill="rgba(200,16,46,0.1)"
          stroke="#C8102E"
          strokeWidth="1.5"
        />
        <polygon
          points={poly(nB)}
          fill="rgba(184,134,11,0.1)"
          stroke="#B8860B"
          strokeWidth="1.5"
        />
        {labels.map(function (l, i) {
          var lx = cx + (R + 20) * Math.cos(ang(i)),
            ly = cy + (R + 20) * Math.sin(ang(i));
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#818180"
              fontSize="7"
            >
              {l}
            </text>
          );
        })}
        <rect
          x="10"
          y="8"
          width="8"
          height="8"
          rx="2"
          fill="#C8102E"
          opacity="0.7"
        />
        <text x="22" y="15" fill="#2c2c2c" fontSize="7">
          {nameA}
        </text>
        <rect
          x="10"
          y="22"
          width="8"
          height="8"
          rx="2"
          fill="#B8860B"
          opacity="0.7"
        />
        <text x="22" y="29" fill="#2c2c2c" fontSize="7">
          {nameB}
        </text>
      </svg>
    </div>
  );
}

/* ================================================================
   DASHBOARD PAGES — SVG ICON DEFINITIONS
   ================================================================ */

function PassIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17 C6 7, 11 6, 14 11 C17 16, 19 10, 21 7" />
      <path d="M18.5 5.5 L21 7 L19.5 9.5" />
      <circle cx="3.8" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SCAIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M13 2.5 L6.5 12.5 H11 L11 21.5 L17.5 11.5 H13 Z" />
    </svg>
  );
}

function XTIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 22 22"
      fill="currentColor"
      stroke="none"
    >
      <rect x="1" y="1" width="5" height="5" rx="1" opacity="0.20" />
      <rect x="8" y="1" width="5" height="5" rx="1" opacity="0.42" />
      <rect x="15" y="1" width="5" height="5" rx="1" opacity="0.65" />
      <rect x="1" y="8" width="5" height="5" rx="1" opacity="0.45" />
      <rect x="8" y="8" width="5" height="5" rx="1" opacity="0.72" />
      <rect x="15" y="8" width="5" height="5" rx="1" opacity="0.88" />
      <rect x="1" y="15" width="5" height="5" rx="1" opacity="0.68" />
      <rect x="8" y="15" width="5" height="5" rx="1" opacity="0.90" />
      <rect x="15" y="15" width="5" height="5" rx="1" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="3" y="15" width="4.5" height="7" rx="1" />
      <rect x="9.5" y="9" width="4.5" height="13" rx="1" opacity="0.82" />
      <rect x="16" y="4" width="4.5" height="18" rx="1" opacity="0.65" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    >
      <circle cx="8.5" cy="12" r="5.5" opacity="0.88" />
      <circle cx="15.5" cy="12" r="5.5" opacity="0.88" />
    </svg>
  );
}

/* ================================================================
   HOME PAGE — Editorial Hub
   ================================================================ */
function HomePage() {
  var s = useState(null),
    matchCount = s[0],
    setMatchCount = s[1];
  var s2 = useState([]),
    teams = s2[0],
    setTeams = s2[1];
  useEffect(function () {
    api("/matches")
      .then(function (ids) {
        setMatchCount(ids.length);
      })
      .catch(function () {});
    api("/teams")
      .then(setTeams)
      .catch(function () {});
  }, []);

  var tools = [
    {
      icon: <PassIcon />,
      title: "Pass Maps",
      desc: "Visualize every successful pass across a match or full season.",
      route: "/pass-maps",
      idx: "01",
    },
    {
      icon: <SCAIcon />,
      title: "Shot-Creating Actions",
      desc: "Identify players who engineer the most dangerous chances.",
      route: "/sca",
      idx: "02",
    },
    {
      icon: <XTIcon />,
      title: "Expected Threat",
      desc: "Measure ball progression into high-value zones.",
      route: "/xt",
      idx: "03",
    },
    {
      icon: <StatsIcon />,
      title: "Match Summary",
      desc: "Full event breakdown with shot map and momentum chart.",
      route: "/match-summary",
      idx: "04",
    },
    {
      icon: <CompareIcon />,
      title: "Team Comparison",
      desc: "Compare two squads across passing, chance creation, and threat.",
      route: "/team-comparison",
      idx: "05",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="2" />
          <circle cx="16" cy="8" r="2" />
          <circle cx="8" cy="16" r="2" />
          <circle cx="16" cy="16" r="2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      ),
      title: "Average Touches",
      desc: "Standardized player positioning heatmap with touch counts.",
      route: "/average-touches",
      idx: "06",
    },
  ];

  return (
    <div className="home-editorial">
      <div className="home-header">
        <h1 className="home-title">
          The Architecture
          <br />
          of the Game.
        </h1>
        <p className="home-subtitle">
          Tactical intelligence for the modern analyst. Six lenses into Premier
          League match data.
        </p>
      </div>

      <div className="home-metrics-row">
        <div className="home-metric">
          <span className="home-metric-value">
            {matchCount != null ? matchCount : "—"}
          </span>
          <span className="home-metric-label">Matches</span>
        </div>
        <div className="home-metric-divider" />
        <div className="home-metric">
          <span className="home-metric-value">{teams.length || "—"}</span>
          <span className="home-metric-label">Clubs</span>
        </div>
        <div className="home-metric-divider" />
        <div className="home-metric">
          <span className="home-metric-value">6</span>
          <span className="home-metric-label">Tools</span>
        </div>
      </div>

      <div className="home-tools-grid">
        {tools.map(function (t) {
          return (
            <a key={t.route} className="home-tool-card" href={"#" + t.route}>
              <span className="tool-card-index">{t.idx}</span>
              <div className="tool-card-icon">{t.icon}</div>
              <h3 className="tool-card-title">{t.title}</h3>
              <p className="tool-card-desc">{t.desc}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ---- PASS MAPS ---- */
function PassMapsPage() {
  var s1 = useState("single"),
    mode = s1[0],
    setMode = s1[1];
  var s2 = useState([]),
    matchIndex = s2[0],
    setMatchIndex = s2[1];
  var s3 = useState(""),
    season = s3[0],
    setSeason = s3[1];
  var s4 = useState(""),
    matchId = s4[0],
    setMatchId = s4[1];
  var s5 = useState([]),
    teams = s5[0],
    setTeams = s5[1];
  var s6 = useState(""),
    team = s6[0],
    setTeam = s6[1];
  var s7 = useState([]),
    players = s7[0],
    setPlayers = s7[1];
  var s8 = useState(""),
    player = s8[0],
    setPlayer = s8[1];
  var s9 = useState([]),
    passes = s9[0],
    setPasses = s9[1];
  var s10 = useState(false),
    loading = s10[0],
    setLoading = s10[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  // Derive all seasons from matchIndex
  var allSeasons = useMemo(
    function () {
      return matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
    },
    [matchIndex],
  );

  // Derive teams for selected season from matchIndex
  var seasonTeams = useMemo(
    function () {
      if (!season) return [];
      var teamsSet = {};
      matchIndex.forEach(function (m) {
        if (m.season === season) {
          if (m.home) teamsSet[m.home] = true;
          if (m.away) teamsSet[m.away] = true;
        }
      });
      return Object.keys(teamsSet).sort();
    },
    [matchIndex, season],
  );

  // Set default season when matchIndex loads
  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      if (allSeasons.length) setSeason(allSeasons[allSeasons.length - 1]);
    },
    [matchIndex, allSeasons],
  );

  // Set default match when season changes (for single mode)
  useEffect(
    function () {
      if (mode !== "single" || !matchIndex.length || !season) return;
      var first = matchIndex.filter(function (m) {
        return m.season === season;
      })[0];
      if (first) setMatchId("" + first.id);
    },
    [season, matchIndex, mode],
  );

  // Set default team when season changes (for season mode)
  useEffect(
    function () {
      if (mode !== "season" || !seasonTeams.length) return;
      setTeam(
        seasonTeams.indexOf("Liverpool") >= 0 ? "Liverpool" : seasonTeams[0],
      );
    },
    [mode, season, seasonTeams],
  );

  // Load teams for single match mode
  useEffect(
    function () {
      if (mode !== "single" || !matchId) return;
      setLoading(true);
      api("/match/" + matchId + "/events")
        .then(function (ev) {
          var t = [];
          ev.forEach(function (e) {
            if (e.team && t.indexOf(e.team) < 0) t.push(e.team);
          });
          t.sort();
          setTeams(t);
          setTeam(t[0] || "");
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [matchId, mode],
  );

  // Load players for single match mode
  useEffect(
    function () {
      if (mode !== "single" || !matchId || !team) return;
      api("/match/" + matchId + "/events").then(function (ev) {
        var p = [];
        ev.forEach(function (e) {
          if (e.team === team && e.player && p.indexOf(e.player) < 0)
            p.push(e.player);
        });
        p.sort();
        setPlayers(p);
        setPlayer(p[0] || "");
      });
    },
    [team, matchId, mode],
  );

  // Load players for season mode (with season filter)
  useEffect(
    function () {
      if (mode !== "season" || !team || !season) return;
      setLoading(true);
      api(
        "/team/" +
          encodeURIComponent(team) +
          "/passes?season=" +
          encodeURIComponent(season),
      )
        .then(function (d) {
          var p = [];
          d.forEach(function (e) {
            if (e.player && p.indexOf(e.player) < 0) p.push(e.player);
          });
          p.sort();
          setPlayers(p);
          setPlayer(p[0] || "");
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [team, mode, season],
  );

  // Load passes
  useEffect(
    function () {
      if (!player) {
        setPasses([]);
        return;
      }
      setLoading(true);
      var url =
        mode === "single"
          ? "/match/" +
            matchId +
            "/passes?team=" +
            encodeURIComponent(team) +
            "&player=" +
            encodeURIComponent(player)
          : "/team/" +
            encodeURIComponent(team) +
            "/passes?player=" +
            encodeURIComponent(player) +
            "&season=" +
            encodeURIComponent(season);
      api(url)
        .then(function (d) {
          setPasses(d);
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [player, team, matchId, mode, season],
  );

  var filteredMatches = matchIndex.filter(function (m) {
    return m.season === season;
  });
  var alpha = mode === "single" ? 0.75 : 0.12;

  return (
    <div>
      <div className="page-header">
        <h2>Pass Maps</h2>
        <p>Visualize every successful pass on the pitch.</p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Mode</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={"btn " + (mode === "single" ? "active" : "")}
              onClick={function () {
                setMode("single");
              }}
            >
              Single Match
            </button>
            <button
              className={"btn " + (mode === "season" ? "active" : "")}
              onClick={function () {
                setMode("season");
              }}
            >
              Full Season
            </button>
          </div>
        </div>
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        {mode === "single" && (
          <div className="control-group">
            <label>Match</label>
            <select
              value={matchId}
              onChange={function (e) {
                setMatchId(e.target.value);
              }}
              style={{ minWidth: 260 }}
            >
              {filteredMatches.map(function (m) {
                return (
                  <option key={m.id} value={"" + m.id}>
                    {m.home + " (H)  vs  " + m.away + " (A)"}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        <div className="control-group">
          <label>Team</label>
          <select
            value={team}
            onChange={function (e) {
              setTeam(e.target.value);
            }}
          >
            {(mode === "single" ? teams : seasonTeams).map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Player</label>
          <select
            value={player}
            onChange={function (e) {
              setPlayer(e.target.value);
            }}
          >
            {players.map(function (p) {
              return (
                <option key={p} value={p}>
                  {p}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {player && (
        <div className="metrics-row">
          <MetricCard label="Player" value={player} />
          <MetricCard label="Passes" value={passes.length} />
          <MetricCard
            label="Mode"
            value={mode === "single" ? "Single Match" : "Full Season"}
          />
        </div>
      )}
      {loading ? (
        <Loading />
      ) : passes.length > 0 ? (
        <PitchSVG>
          <PassArrows passes={passes} alpha={alpha} />
        </PitchSVG>
      ) : (
        <EmptyState message="Select a player to generate the pass map." />
      )}
    </div>
  );
}

/* ---- SCA ---- */
function SCAPage() {
  var s1 = useState([]),
    matchIndex = s1[0],
    setMatchIndex = s1[1];
  var s2 = useState(""),
    season = s2[0],
    setSeason = s2[1];
  var s3 = useState(""),
    selectedTeam = s3[0],
    setSelectedTeam = s3[1];
  var s4 = useState(""),
    matchId = s4[0],
    setMatchId = s4[1];
  var s5 = useState([]),
    players = s5[0],
    setPlayers = s5[1];
  var s6 = useState("All Players"),
    player = s6[0],
    setPlayer = s6[1];
  var s7 = useState([]),
    scaBoard = s7[0],
    setScaBoard = s7[1];
  var s8 = useState([]),
    scaEvents = s8[0],
    setScaEvents = s8[1];
  var s9 = useState(false),
    loading = s9[0],
    setLoading = s9[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  // Derive all seasons from matchIndex
  var allSeasons = useMemo(
    function () {
      return matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
    },
    [matchIndex],
  );

  // Derive teams for selected season from matchIndex
  var seasonTeams = useMemo(
    function () {
      if (!season) return [];
      var teamsSet = {};
      matchIndex.forEach(function (m) {
        if (m.season === season) {
          if (m.home) teamsSet[m.home] = true;
          if (m.away) teamsSet[m.away] = true;
        }
      });
      return Object.keys(teamsSet).sort();
    },
    [matchIndex, season],
  );

  // Filter matches by season AND team (where team played home or away)
  var teamMatches = useMemo(
    function () {
      if (!season || !selectedTeam) return [];
      return matchIndex.filter(function (m) {
        return (
          m.season === season &&
          (m.home === selectedTeam || m.away === selectedTeam)
        );
      });
    },
    [matchIndex, season, selectedTeam],
  );

  // Set default season when matchIndex loads
  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      if (allSeasons.length) setSeason(allSeasons[allSeasons.length - 1]);
    },
    [matchIndex, allSeasons],
  );

  // Set default team when season changes
  useEffect(
    function () {
      if (!seasonTeams.length) return;
      setSelectedTeam(
        seasonTeams.indexOf("Liverpool") >= 0 ? "Liverpool" : seasonTeams[0],
      );
    },
    [season, seasonTeams],
  );

  // Set default match when team changes
  useEffect(
    function () {
      if (!teamMatches.length) return;
      setMatchId("" + teamMatches[0].id);
    },
    [selectedTeam, teamMatches],
  );

  // Load SCA data when match and team are selected
  useEffect(
    function () {
      if (!matchId || !selectedTeam) return;
      setLoading(true);
      api(
        "/match/" + matchId + "/sca?team=" + encodeURIComponent(selectedTeam),
      ).then(setScaBoard);
      api("/match/" + matchId + "/events").then(function (ev) {
        var p = [];
        ev.forEach(function (e) {
          if (e.team === selectedTeam && e.player && p.indexOf(e.player) < 0)
            p.push(e.player);
        });
        p.sort();
        setPlayers(p);
        setPlayer("All Players");
        setLoading(false);
      });
    },
    [matchId, selectedTeam],
  );

  // Load SCA events when player filter changes
  useEffect(
    function () {
      if (!matchId || !selectedTeam) return;
      var pp =
        player !== "All Players" ? "&player=" + encodeURIComponent(player) : "";
      api(
        "/match/" +
          matchId +
          "/sca_events?team=" +
          encodeURIComponent(selectedTeam) +
          pp,
      ).then(setScaEvents);
    },
    [matchId, selectedTeam, player],
  );

  // Format match display with opponent and H/A indicator
  var formatMatch = function (m) {
    if (m.home === selectedTeam) {
      return "vs " + m.away + " (H)";
    } else {
      return "vs " + m.home + " (A)";
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Shot-Creating Actions</h2>
        <p>Identify players who engineer the most dangerous chances.</p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Team</label>
          <select
            value={selectedTeam}
            onChange={function (e) {
              setSelectedTeam(e.target.value);
            }}
          >
            {seasonTeams.map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Match</label>
          <select
            value={matchId}
            onChange={function (e) {
              setMatchId(e.target.value);
            }}
            style={{ minWidth: 200 }}
          >
            {teamMatches.map(function (m) {
              return (
                <option key={m.id} value={"" + m.id}>
                  {formatMatch(m)}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Highlight</label>
          <select
            value={player}
            onChange={function (e) {
              setPlayer(e.target.value);
            }}
          >
            <option value="All Players">All Players</option>
            {players.map(function (p) {
              return (
                <option key={p} value={p}>
                  {p}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <div className="split-layout">
          <div>
            <p className="section-title">Leaderboard</p>
            <DataTable
              columns={[
                { key: "Player", label: "Player" },
                { key: "SCA", label: "SCA", numeric: true },
              ]}
              rows={scaBoard}
            />
          </div>
          <div>
            <p className="section-title">SCA Pitch Map</p>
            <PitchSVG>
              <g>
                {scaEvents.map(function (e, i) {
                  var x1 = X(e.x),
                    y1 = Y(e.y),
                    x2 = X(e.end_x),
                    y2 = Y(e.end_y);
                  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2))
                    return null;
                  return (
                    <g key={i}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#C8102E"
                        strokeWidth="0.3"
                        opacity="0.7"
                        markerEnd="url(#arr-crimson)"
                      />
                      <circle
                        cx={x2}
                        cy={y2}
                        r="0.8"
                        fill="#B8860B"
                        fillOpacity="0.8"
                        stroke="#fff"
                        strokeWidth="0.15"
                      />
                    </g>
                  );
                })}
              </g>
            </PitchSVG>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- EXPECTED THREAT ---- */
function XTPage() {
  var s1 = useState("single"),
    mode = s1[0],
    setMode = s1[1];
  var s2 = useState([]),
    matchIndex = s2[0],
    setMatchIndex = s2[1];
  var s3 = useState(""),
    season = s3[0],
    setSeason = s3[1];
  var s4 = useState(""),
    matchId = s4[0],
    setMatchId = s4[1];
  var s5 = useState([]),
    teams = s5[0],
    setTeams = s5[1];
  var s6 = useState(""),
    team = s6[0],
    setTeam = s6[1];
  var s7 = useState("All Players"),
    player = s7[0],
    setPlayer = s7[1];
  var s8 = useState([]),
    players = s8[0],
    setPlayers = s8[1];
  var s9 = useState([]),
    xtBoard = s9[0],
    setXtBoard = s9[1];
  var s10 = useState([]),
    passes = s10[0],
    setPasses = s10[1];
  var s11 = useState(false),
    loading = s11[0],
    setLoading = s11[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  // Derive all seasons from matchIndex
  var allSeasons = useMemo(
    function () {
      return matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
    },
    [matchIndex],
  );

  // Derive teams for selected season from matchIndex
  var seasonTeams = useMemo(
    function () {
      if (!season) return [];
      var teamsSet = {};
      matchIndex.forEach(function (m) {
        if (m.season === season) {
          if (m.home) teamsSet[m.home] = true;
          if (m.away) teamsSet[m.away] = true;
        }
      });
      return Object.keys(teamsSet).sort();
    },
    [matchIndex, season],
  );

  // Set default season when matchIndex loads
  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      if (allSeasons.length) setSeason(allSeasons[allSeasons.length - 1]);
    },
    [matchIndex, allSeasons],
  );

  // Set default match when season changes (for single mode)
  useEffect(
    function () {
      if (mode !== "single" || !matchIndex.length || !season) return;
      var first = matchIndex.filter(function (m) {
        return m.season === season;
      })[0];
      if (first) setMatchId("" + first.id);
    },
    [season, matchIndex, mode],
  );

  // Set default team when season changes (for season mode)
  useEffect(
    function () {
      if (mode !== "season" || !seasonTeams.length) return;
      setTeam(
        seasonTeams.indexOf("Liverpool") >= 0 ? "Liverpool" : seasonTeams[0],
      );
    },
    [mode, season, seasonTeams],
  );

  // Load teams for single match mode
  useEffect(
    function () {
      if (mode !== "single" || !matchId) return;
      api("/match/" + matchId + "/events").then(function (ev) {
        var t = [];
        ev.forEach(function (e) {
          if (e.team && t.indexOf(e.team) < 0) t.push(e.team);
        });
        t.sort();
        setTeams(t);
        setTeam(t[0] || "");
      });
    },
    [matchId, mode],
  );

  // Load xT and passes data
  useEffect(
    function () {
      if (!team || !season) return;
      setLoading(true);
      var xtU =
        mode === "single"
          ? "/match/" + matchId + "/xt?team=" + encodeURIComponent(team)
          : "/team/" +
            encodeURIComponent(team) +
            "/xt?season=" +
            encodeURIComponent(season);
      var pU =
        mode === "single"
          ? "/match/" + matchId + "/passes?team=" + encodeURIComponent(team)
          : "/team/" +
            encodeURIComponent(team) +
            "/passes?season=" +
            encodeURIComponent(season);
      Promise.all([api(xtU), api(pU)])
        .then(function (r) {
          setXtBoard(r[0]);
          setPasses(r[1]);
          var p = [];
          r[1].forEach(function (e) {
            if (e.player && p.indexOf(e.player) < 0) p.push(e.player);
          });
          p.sort();
          setPlayers(p);
          setPlayer("All Players");
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [team, matchId, mode, season],
  );

  var filteredMatches = matchIndex.filter(function (m) {
    return m.season === season;
  });
  // Use 8x12 grid to match the xT grid values from TacticalEngine
  var ROWS = 8,
    COLS = 12;

  var heatGrid = useMemo(
    function () {
      var g = Array.from({ length: ROWS }, function () {
        return Array(COLS).fill(0);
      });
      var src =
        player === "All Players"
          ? passes
          : passes.filter(function (p) {
              return p.player === player;
            });
      src.forEach(function (p) {
        var ex = parseFloat(p.end_x),
          ey = parseFloat(p.end_y);
        if (isNaN(ex) || isNaN(ey)) return;
        var ci = Math.min(Math.floor((ex / 100) * COLS), COLS - 1);
        var ri = Math.min(Math.floor((ey / 100) * ROWS), ROWS - 1);
        g[ri][ci]++;
      });
      return g;
    },
    [passes, player],
  );

  var maxH = Math.max(1, Math.max.apply(null, [].concat.apply([], heatGrid)));

  /* Warm crimson heatmap: warm grey → rose → deep crimson */
  var heatC = function (v) {
    var t = v / maxH;
    if (t < 0.012) return "transparent";
    var r, g2, b, a;
    if (t < 0.3) {
      var f = t / 0.3;
      r = Math.round(180 + f * 40);
      g2 = Math.round(160 - f * 80);
      b = Math.round(140 - f * 60);
      a = 0.15 + f * 0.25;
    } else if (t < 0.65) {
      var f = (t - 0.3) / 0.35;
      r = Math.round(220 - f * 20);
      g2 = Math.round(80 - f * 50);
      b = Math.round(80 - f * 30);
      a = 0.4 + f * 0.25;
    } else {
      var f = (t - 0.65) / 0.35;
      r = 200;
      g2 = Math.round(30 - f * 14);
      b = Math.round(50 - f * 4);
      a = 0.65 + f * 0.25;
    }
    return "rgba(" + r + "," + g2 + "," + b + "," + a.toFixed(2) + ")";
  };

  return (
    <div>
      <div className="page-header">
        <h2>Expected Threat (xT)</h2>
        <p>Measure ball progression into dangerous zones.</p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Mode</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={"btn " + (mode === "single" ? "active" : "")}
              onClick={function () {
                setMode("single");
              }}
            >
              Single Match
            </button>
            <button
              className={"btn " + (mode === "season" ? "active" : "")}
              onClick={function () {
                setMode("season");
              }}
            >
              Full Season
            </button>
          </div>
        </div>
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        {mode === "single" && (
          <div className="control-group">
            <label>Match</label>
            <select
              value={matchId}
              onChange={function (e) {
                setMatchId(e.target.value);
              }}
              style={{ minWidth: 260 }}
            >
              {filteredMatches.map(function (m) {
                return (
                  <option key={m.id} value={"" + m.id}>
                    {m.home + " (H)  vs  " + m.away + " (A)"}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        <div className="control-group">
          <label>Team</label>
          <select
            value={team}
            onChange={function (e) {
              setTeam(e.target.value);
            }}
          >
            {(mode === "single" ? teams : seasonTeams).map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Player</label>
          <select
            value={player}
            onChange={function (e) {
              setPlayer(e.target.value);
            }}
          >
            <option value="All Players">All Players</option>
            {players.map(function (p) {
              return (
                <option key={p} value={p}>
                  {p}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <div className="split-layout">
          <div>
            <p className="section-title">xT Leaderboard</p>
            <DataTable
              columns={[
                { key: "player", label: "Player" },
                { key: "xt_added", label: "xT Added", numeric: true },
              ]}
              rows={xtBoard}
            />
          </div>
          <div>
            <p className="section-title">Pass Destination Heatmap</p>
            <PitchSVG>
              <defs>
                <filter
                  id="heat-blur"
                  x="-8%"
                  y="-8%"
                  width="116%"
                  height="116%"
                >
                  <feGaussianBlur stdDeviation="1.3" />
                </filter>
              </defs>
              <g filter="url(#heat-blur)">
                {heatGrid.map(function (row, ri) {
                  return row.map(function (val, ci) {
                    if (!val) return null;
                    return (
                      <rect
                        key={ri + "-" + ci}
                        x={(ci * 100) / COLS}
                        y={(ri * 68) / ROWS}
                        width={100 / COLS + 0.15}
                        height={68 / ROWS + 0.15}
                        fill={heatC(val)}
                      />
                    );
                  });
                })}
              </g>
            </PitchSVG>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- MATCH SUMMARY ---- */
function MatchSummaryPage() {
  var s0 = useState([]),
    matchIndex = s0[0],
    setMatchIndex = s0[1];
  var s1 = useState(""),
    season = s1[0],
    setSeason = s1[1];
  var s2 = useState(""),
    filterTeam = s2[0],
    setFilterTeam = s2[1];
  var s3 = useState(""),
    matchId = s3[0],
    setMatchId = s3[1];
  var s4 = useState(null),
    stats = s4[0],
    setStats = s4[1];
  var s5 = useState([]),
    shots = s5[0],
    setShots = s5[1];
  var s6 = useState([]),
    timeline = s6[0],
    setTimeline = s6[1];
  var s7 = useState(false),
    loading = s7[0],
    setLoading = s7[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      var seasons = matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
      if (seasons.length) setSeason(seasons[seasons.length - 1]);
    },
    [matchIndex],
  );

  useEffect(
    function () {
      if (!matchIndex.length || !season) return;
      var filtered = matchIndex.filter(function (m) {
        return (
          m.season === season &&
          (!filterTeam || m.home === filterTeam || m.away === filterTeam)
        );
      });
      setMatchId(filtered.length ? "" + filtered[0].id : "");
    },
    [season, filterTeam, matchIndex],
  );

  useEffect(
    function () {
      if (!matchId) return;
      setLoading(true);
      Promise.all([
        api("/match/" + matchId + "/stats"),
        api("/match/" + matchId + "/shots"),
        api("/match/" + matchId + "/timeline"),
      ])
        .then(function (r) {
          setStats(r[0]);
          setShots(r[1]);
          setTimeline(r[2]);
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [matchId],
  );

  var allSeasons = matchIndex
    .map(function (m) {
      return m.season;
    })
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    })
    .sort();
  var seasonMatches = matchIndex.filter(function (m) {
    return m.season === season;
  });
  var allTeams = seasonMatches
    .flatMap(function (m) {
      return [m.home, m.away];
    })
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    })
    .sort();
  var filteredMatches = filterTeam
    ? seasonMatches.filter(function (m) {
        return m.home === filterTeam || m.away === filterTeam;
      })
    : seasonMatches;

  var tNames = stats ? Object.keys(stats).sort() : [];
  var tA = tNames[0],
    tB = tNames[1];
  var sLabels = [
    { key: "passes", label: "Total Passes" },
    { key: "passAccuracy", label: "Pass Accuracy %" },
    { key: "shots", label: "Shots" },
    { key: "goals", label: "Goals" },
    { key: "fouls", label: "Fouls" },
    { key: "tackles", label: "Tackles" },
    { key: "corners", label: "Corners" },
  ];
  var shotCA = {
    Goal: "#C8102E",
    SavedShots: "#a00d24",
    MissedShots: "#d4a0a8",
    ShotOnPost: "#e06070",
  };
  var shotCB = {
    Goal: "#B8860B",
    SavedShots: "#8a6508",
    MissedShots: "#d4c4a0",
    ShotOnPost: "#c8a840",
  };

  return (
    <div>
      <div className="page-header">
        <h2>Match Summary</h2>
        <p>Full event breakdown for any match.</p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
              setFilterTeam("");
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Team</label>
          <select
            value={filterTeam}
            onChange={function (e) {
              setFilterTeam(e.target.value);
            }}
          >
            <option value="">All Teams</option>
            {allTeams.map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Match</label>
          <select
            value={matchId}
            onChange={function (e) {
              setMatchId(e.target.value);
            }}
            disabled={!filteredMatches.length}
            style={{ minWidth: 260 }}
          >
            {filteredMatches.map(function (m) {
              return (
                <option key={m.id} value={"" + m.id}>
                  {m.home + " (H)  vs  " + m.away + " (A)"}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : !stats || tNames.length < 2 ? (
        <EmptyState message="No match data found." />
      ) : (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="h2h-header">
              <div className="team-name">{tA}</div>
              <div className="vs">VS</div>
              <div className="team-name">{tB}</div>
            </div>
            <div className="h2h-grid">
              {sLabels.map(function (s) {
                return (
                  <div className="h2h-row" key={s.key}>
                    <div className="val-left">{stats[tA][s.key]}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="val-right">{stats[tB][s.key]}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="section-title">Shot Map</p>
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            <PitchSVG>
              <g>
                <text
                  x="25"
                  y="-0.6"
                  textAnchor="middle"
                  fill="rgba(200,16,46,0.65)"
                  fontSize="2.8"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                >
                  {tA}
                </text>
                <text
                  x="75"
                  y="-0.6"
                  textAnchor="middle"
                  fill="rgba(184,134,11,0.65)"
                  fontSize="2.8"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                >
                  {tB}
                </text>
                {shots.map(function (s, i) {
                  var sx = parseFloat(s.x),
                    sy = parseFloat(s.y);
                  if (isNaN(sx) || isNaN(sy)) return null;
                  var isA = s.team === tA;
                  if (isA) {
                    sx = 100 - sx;
                    sy = 100 - sy;
                  }
                  var clr = isA
                    ? shotCA[s.type] || "#C8102E"
                    : shotCB[s.type] || "#B8860B";
                  return (
                    <circle
                      key={i}
                      cx={X(sx)}
                      cy={Y(sy)}
                      r="1.3"
                      fill={clr}
                      fillOpacity="0.88"
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth="0.2"
                    />
                  );
                })}
              </g>
            </PitchSVG>
            <div
              style={{
                display: "flex",
                gap: 28,
                marginTop: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(200,16,46,0.7)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    marginBottom: 2,
                  }}
                >
                  {tA}
                </span>
                {Object.entries(shotCA).map(function (e) {
                  return (
                    <div
                      key={e[0]}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.68rem",
                        color: "#818180",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: e[1],
                        }}
                      />
                      {e[0]}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  width: 1,
                  background: "rgba(0,0,0,0.07)",
                  alignSelf: "stretch",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(184,134,11,0.7)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    marginBottom: 2,
                  }}
                >
                  {tB}
                </span>
                {Object.entries(shotCB).map(function (e) {
                  return (
                    <div
                      key={e[0]}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.68rem",
                        color: "#818180",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: e[1],
                        }}
                      />
                      {e[0]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="divider" />
          <p className="section-title">Match Momentum</p>
          <p
            style={{
              fontSize: "0.68rem",
              color: "#818180",
              fontFamily: "var(--font-mono)",
              marginTop: -6,
              marginBottom: 14,
            }}
          >
            Weighted activity per 5-min window
          </p>
          {(function () {
            var WEIGHTS = {
              Pass: 1,
              SavedShots: 3,
              MissedShots: 2,
              Goal: 5,
              Foul: 0.5,
              Tackle: 1.5,
            };
            var mom = {},
              goalEvts = [];
            timeline.forEach(function (t) {
              var min = parseInt(t.minute);
              if (isNaN(min) || !t.team) return;
              var bucket = Math.floor(min / 5) * 5;
              var sc = (parseInt(t.count) || 0) * (WEIGHTS[t.type] || 1);
              if (!mom[bucket]) mom[bucket] = {};
              mom[bucket][t.team] = (mom[bucket][t.team] || 0) + sc;
              if (t.type === "Goal") goalEvts.push({ min: min, team: t.team });
            });
            var buckets = Object.keys(mom)
              .map(Number)
              .sort(function (a, b) {
                return a - b;
              });
            if (!buckets.length)
              return (
                <div
                  style={{
                    color: "#818180",
                    textAlign: "center",
                    padding: "20px 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                  }}
                >
                  No timeline data available
                </div>
              );
            var maxB = Math.max.apply(
              null,
              [1].concat(
                buckets.map(function (b) {
                  return Math.max(mom[b][tA] || 0, mom[b][tB] || 0);
                }),
              ),
            );
            var maxMin = Math.max(95, buckets[buckets.length - 1] + 5);
            var VW = 560,
              VH = 170,
              CY = 82,
              ML = 10,
              MR = 10,
              MT = 20,
              MB = 16;
            var PW = VW - ML - MR,
              PH_UP = CY - MT,
              PH_DN = VH - CY - MB;
            function bx(m) {
              return ML + (m / maxMin) * PW;
            }
            var BW = Math.max(4, (5 / maxMin) * PW - 2);
            return (
              <div className="card" style={{ padding: "14px 14px 10px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    marginBottom: 10,
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.65rem",
                      color: "#818180",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 6,
                        background: "rgba(200,16,46,0.65)",
                        display: "inline-block",
                        borderRadius: 1,
                      }}
                    />
                    {tA}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.65rem",
                      color: "#818180",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 6,
                        background: "rgba(184,134,11,0.65)",
                        display: "inline-block",
                        borderRadius: 1,
                      }}
                    />
                    {tB}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.65rem",
                      color: "#818180",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: "rgba(200,16,46,0.88)",
                        display: "inline-block",
                        borderRadius: "50%",
                      }}
                    />
                    Goal
                  </div>
                </div>
                <svg
                  viewBox={"0 0 " + VW + " " + VH}
                  style={{ width: "100%", display: "block" }}
                >
                  <defs>
                    <linearGradient id="mgA" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#C8102E"
                        stopOpacity="0.85"
                      />
                      <stop
                        offset="100%"
                        stopColor="#C8102E"
                        stopOpacity="0.12"
                      />
                    </linearGradient>
                    <linearGradient id="mgB" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#B8860B"
                        stopOpacity="0.12"
                      />
                      <stop
                        offset="100%"
                        stopColor="#B8860B"
                        stopOpacity="0.85"
                      />
                    </linearGradient>
                  </defs>
                  <rect
                    x={ML}
                    y={MT}
                    width={PW}
                    height={PH_UP}
                    fill="rgba(200,16,46,0.02)"
                  />
                  <rect
                    x={ML}
                    y={CY}
                    width={PW}
                    height={PH_DN}
                    fill="rgba(184,134,11,0.02)"
                  />
                  {[0.33, 0.67, 1].map(function (f) {
                    return [
                      <line
                        key={"u" + f}
                        x1={ML}
                        y1={CY - f * PH_UP}
                        x2={VW - MR}
                        y2={CY - f * PH_UP}
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth="0.5"
                      />,
                      <line
                        key={"d" + f}
                        x1={ML}
                        y1={CY + f * PH_DN}
                        x2={VW - MR}
                        y2={CY + f * PH_DN}
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth="0.5"
                      />,
                    ];
                  })}
                  <text
                    x={ML + 2}
                    y={MT + 7}
                    fill="rgba(200,16,46,0.45)"
                    fontSize="4.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {tA}
                  </text>
                  <text
                    x={ML + 2}
                    y={VH - MB - 3}
                    fill="rgba(184,134,11,0.45)"
                    fontSize="4.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {tB}
                  </text>
                  <line
                    x1={ML}
                    y1={CY}
                    x2={VW - MR}
                    y2={CY}
                    stroke="rgba(0,0,0,0.12)"
                    strokeWidth="0.7"
                  />
                  <line
                    x1={bx(45)}
                    y1={MT - 4}
                    x2={bx(45)}
                    y2={VH - MB + 4}
                    stroke="rgba(0,0,0,0.15)"
                    strokeWidth="0.6"
                    strokeDasharray="2.5 2"
                  />
                  <text
                    x={bx(45)}
                    y={MT - 6}
                    textAnchor="middle"
                    fill="rgba(0,0,0,0.3)"
                    fontSize="4"
                    fontFamily="var(--font-mono)"
                  >
                    HT
                  </text>
                  {[0, 15, 30, 45, 60, 75, 90].map(function (m) {
                    return (
                      <text
                        key={m}
                        x={bx(m)}
                        y={VH - 2}
                        textAnchor="middle"
                        fill="rgba(0,0,0,0.22)"
                        fontSize="4"
                        fontFamily="var(--font-mono)"
                      >
                        {m}'
                      </text>
                    );
                  })}
                  {buckets.map(function (b) {
                    var sA = mom[b][tA] || 0,
                      sB = mom[b][tB] || 0;
                    var hA = (sA / maxB) * PH_UP,
                      hB = (sB / maxB) * PH_DN;
                    var x = bx(b);
                    return (
                      <g key={b}>
                        {sA > 0 && (
                          <rect
                            x={x}
                            y={CY - hA}
                            width={BW}
                            height={hA}
                            fill="url(#mgA)"
                            rx="1.5"
                          />
                        )}
                        {sB > 0 && (
                          <rect
                            x={x}
                            y={CY}
                            width={BW}
                            height={hB}
                            fill="url(#mgB)"
                            rx="1.5"
                          />
                        )}
                      </g>
                    );
                  })}
                  {goalEvts.map(function (g, i) {
                    var gx = bx(g.min) + BW / 2;
                    var isA = g.team === tA;
                    return (
                      <g key={i}>
                        <line
                          x1={gx}
                          y1={MT - 2}
                          x2={gx}
                          y2={VH - MB + 2}
                          stroke="rgba(200,16,46,0.4)"
                          strokeWidth="0.8"
                          strokeDasharray="2 1.5"
                        />
                        <circle
                          cx={gx}
                          cy={isA ? MT + 1 : VH - MB - 1}
                          r="3.2"
                          fill="rgba(200,16,46,0.88)"
                        />
                        <text
                          x={gx}
                          y={isA ? MT - 3 : VH - MB + 7}
                          textAnchor="middle"
                          fill="rgba(200,16,46,0.72)"
                          fontSize="3.5"
                          fontFamily="var(--font-mono)"
                        >
                          G
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* ---- TEAM COMPARISON ---- */
function TeamComparisonPage() {
  var s1 = useState([]),
    matchIndex = s1[0],
    setMatchIndex = s1[1];
  var s2 = useState(""),
    season = s2[0],
    setSeason = s2[1];
  var s3 = useState(""),
    teamA = s3[0],
    setTeamA = s3[1];
  var s4 = useState(""),
    teamB = s4[0],
    setTeamB = s4[1];
  var s5 = useState(null),
    statsA = s5[0],
    setStatsA = s5[1];
  var s6 = useState(null),
    statsB = s6[0],
    setStatsB = s6[1];
  var s7 = useState([]),
    xtA = s7[0],
    setXtA = s7[1];
  var s8 = useState([]),
    xtB = s8[0],
    setXtB = s8[1];
  var s9 = useState(false),
    loading = s9[0],
    setLoading = s9[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  // Derive all seasons from matchIndex
  var allSeasons = useMemo(
    function () {
      return matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
    },
    [matchIndex],
  );

  // Derive teams for selected season from matchIndex
  var seasonTeams = useMemo(
    function () {
      if (!season) return [];
      var teamsSet = {};
      matchIndex.forEach(function (m) {
        if (m.season === season) {
          if (m.home) teamsSet[m.home] = true;
          if (m.away) teamsSet[m.away] = true;
        }
      });
      return Object.keys(teamsSet).sort();
    },
    [matchIndex, season],
  );

  // Set default season when matchIndex loads
  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      if (allSeasons.length) setSeason(allSeasons[allSeasons.length - 1]);
    },
    [matchIndex, allSeasons],
  );

  // Set default teams when season changes
  useEffect(
    function () {
      if (!seasonTeams.length) return;
      setTeamA(
        seasonTeams.indexOf("Liverpool") >= 0
          ? "Liverpool"
          : seasonTeams[0] || "",
      );
      setTeamB(
        seasonTeams.indexOf("Arsenal") >= 0 ? "Arsenal" : seasonTeams[1] || "",
      );
    },
    [season, seasonTeams],
  );

  // Load stats when teams or season change
  useEffect(
    function () {
      if (!teamA || !teamB || teamA === teamB || !season) return;
      setLoading(true);
      var seasonParam = "&season=" + encodeURIComponent(season);
      Promise.all([
        api(
          "/team/" +
            encodeURIComponent(teamA) +
            "/stats?season=" +
            encodeURIComponent(season),
        ),
        api(
          "/team/" +
            encodeURIComponent(teamB) +
            "/stats?season=" +
            encodeURIComponent(season),
        ),
        api(
          "/team/" +
            encodeURIComponent(teamA) +
            "/xt?season=" +
            encodeURIComponent(season),
        ),
        api(
          "/team/" +
            encodeURIComponent(teamB) +
            "/xt?season=" +
            encodeURIComponent(season),
        ),
      ])
        .then(function (r) {
          setStatsA(r[0]);
          setStatsB(r[1]);
          setXtA(r[2]);
          setXtB(r[3]);
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [teamA, teamB, season],
  );

  var rLabels = [
    "Passes",
    "Accuracy",
    "Shots",
    "Goals",
    "Fouls",
    "Tackles",
    "xT",
  ];
  var rA = statsA
    ? [
        statsA.passes,
        statsA.passAccuracy,
        statsA.shots,
        statsA.goals,
        statsA.fouls,
        statsA.tackles,
        statsA.totalXt || 0,
      ]
    : [0, 0, 0, 0, 0, 0, 0];
  var rB = statsB
    ? [
        statsB.passes,
        statsB.passAccuracy,
        statsB.shots,
        statsB.goals,
        statsB.fouls,
        statsB.tackles,
        statsB.totalXt || 0,
      ]
    : [0, 0, 0, 0, 0, 0, 0];
  var mLabels = [
    { key: "passes", label: "Total Passes" },
    { key: "passAccuracy", label: "Pass Acc %" },
    { key: "shots", label: "Shots" },
    { key: "goals", label: "Goals" },
    { key: "fouls", label: "Fouls" },
    { key: "tackles", label: "Tackles" },
    { key: "totalXt", label: "Total xT" },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Team Comparison</h2>
        <p>
          Compare two squads across passing, chance creation, and threat
          metrics.
        </p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Team A</label>
          <select
            value={teamA}
            onChange={function (e) {
              setTeamA(e.target.value);
            }}
          >
            {seasonTeams.map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div
          style={{
            alignSelf: "flex-end",
            padding: "8px 0",
            color: "#818180",
            fontSize: "0.8rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          vs
        </div>
        <div className="control-group">
          <label>Team B</label>
          <select
            value={teamB}
            onChange={function (e) {
              setTeamB(e.target.value);
            }}
          >
            {seasonTeams.map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {teamA === teamB && <EmptyState message="Select two different teams." />}
      {loading ? (
        <Loading />
      ) : (
        statsA &&
        statsB &&
        teamA !== teamB && (
          <div>
            <div className="metrics-row">
              {mLabels.map(function (m) {
                return (
                  <div
                    className="metric-card"
                    key={m.key}
                    style={{ textAlign: "center" }}
                  >
                    <div className="label">{m.label}</div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          color: "#C8102E",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                        }}
                      >
                        {statsA[m.key] != null ? statsA[m.key] : "—"}
                      </span>
                      <span style={{ color: "#818180", fontSize: "0.7rem" }}>
                        vs
                      </span>
                      <span
                        style={{
                          color: "#B8860B",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                        }}
                      >
                        {statsB[m.key] != null ? statsB[m.key] : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="divider" />
            <p className="section-title">Radar Comparison</p>
            <div className="card">
              <RadarChart
                labels={rLabels}
                seriesA={rA}
                seriesB={rB}
                nameA={teamA}
                nameB={teamB}
              />
            </div>
            <div className="divider" />
            <p className="section-title">Top xT Players</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <p
                  style={{
                    color: "#C8102E",
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: "0.82rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {teamA}
                </p>
                <DataTable
                  columns={[
                    { key: "player", label: "Player" },
                    { key: "xt_added", label: "xT Added", numeric: true },
                  ]}
                  rows={xtA.slice(0, 8)}
                />
              </div>
              <div>
                <p
                  style={{
                    color: "#B8860B",
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: "0.82rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {teamB}
                </p>
                <DataTable
                  columns={[
                    { key: "player", label: "Player" },
                    { key: "xt_added", label: "xT Added", numeric: true },
                  ]}
                  rows={xtB.slice(0, 8)}
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ================================================================
   NAVIGATION — Site Header + Overlay Menu
   ================================================================ */
var NAV_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/pass-maps", label: "Pass Maps" },
  { path: "/sca", label: "Shot-Creating Actions" },
  { path: "/xt", label: "Expected Threat" },
  { path: "/match-summary", label: "Match Summary" },
  { path: "/team-comparison", label: "Team Comparison" },
  { path: "/average-touches", label: "Average Touches" },
];

function SiteHeader({ route, onBack }) {
  var s = useState(false),
    menuOpen = s[0],
    setMenuOpen = s[1];
  var s2 = useState(false),
    scrolled = s2[0],
    setScrolled = s2[1];

  useEffect(function () {
    var onScroll = function () {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return function () {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(
    function () {
      setMenuOpen(false);
    },
    [route],
  );

  return (
    <React.Fragment>
      <header className={"site-header" + (scrolled ? " scrolled" : "")}>
        <a
          className="site-logo"
          href="#/"
          onClick={function (e) {
            if (onBack) {
              e.preventDefault();
              onBack();
            }
          }}
        >
          xAssassin.
        </a>
        <button
          className={"menu-toggle" + (menuOpen ? " active" : "")}
          onClick={function () {
            setMenuOpen(!menuOpen);
          }}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>
      <NavOverlay
        open={menuOpen}
        route={route}
        onClose={function () {
          setMenuOpen(false);
        }}
      />
    </React.Fragment>
  );
}

function NavOverlay({ open, route, onClose }) {
  return (
    <div className={"nav-overlay" + (open ? " open" : "")}>
      <nav className="nav-overlay-inner">
        {NAV_ITEMS.map(function (item, i) {
          return (
            <a
              key={item.path}
              className={
                "nav-overlay-link" + (route === item.path ? " active" : "")
              }
              href={"#" + item.path}
              onClick={onClose}
              style={{ transitionDelay: open ? i * 0.06 + "s" : "0s" }}
            >
              <span className="nav-link-index">{"0" + (i + 1)}</span>
              <span className="nav-link-text">{item.label}</span>
              {route === item.path && <span className="nav-link-active" />}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

/* ================================================================
   PAGE TRANSITION (GSAP fade-in)
   ================================================================ */
function PageTransition({ children, routeKey }) {
  var ref = useRef(null);

  useEffect(
    function () {
      if (typeof gsap === "undefined" || !ref.current) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      );
    },
    [routeKey],
  );

  return <div ref={ref}>{children}</div>;
}

/* ================================================================
   LANDING PAGE — Editorial + Three.js Hero
   ================================================================ */
function LandingPage({ onStart }) {
  var heroRef = useRef(null);
  var titleRef = useRef(null);
  var previewRefs = useRef([]);
  var matchCountState = useState(null);
  var matchCount = matchCountState[0];
  var setMatchCount = matchCountState[1];
  var seasonState = useState("2024/2025");
  var latestSeason = seasonState[0];
  var setLatestSeason = seasonState[1];

  // Fetch match count and latest season
  useEffect(function () {
    api("/matches")
      .then(function (ids) {
        setMatchCount(ids.length);
      })
      .catch(function () {});
    api("/match-index")
      .then(function (idx) {
        if (idx && idx.length) {
          var seasons = idx
            .map(function (m) {
              return m.season;
            })
            .filter(function (v, i, a) {
              return a.indexOf(v) === i;
            })
            .sort();
          if (seasons.length) {
            setLatestSeason(seasons[seasons.length - 1]);
          }
        }
      })
      .catch(function () {});
  }, []);

  useEffect(function () {
    if (typeof gsap === "undefined") return;

    // Initial title animation
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current.querySelectorAll(".hero-title-line"),
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.15,
          delay: 0.3,
        },
      );
      gsap.fromTo(
        titleRef.current.querySelector(".hero-tagline"),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power2.out", delay: 0.8 },
      );
      gsap.fromTo(
        titleRef.current.querySelector(".hero-edition"),
        { opacity: 0 },
        { opacity: 1, duration: 0.6, delay: 1.2 },
      );
    }

    if (typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);

      if (heroRef.current) {
        gsap.to(heroRef.current, {
          opacity: 0,
          y: -60,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      previewRefs.current.forEach(function (el) {
        if (!el) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    }

    return function () {
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.getAll().forEach(function (st) {
          st.kill();
        });
      }
    };
  }, []);

  var previews = [
    {
      num: "01",
      title: "Pass Networks",
      desc: "Every successful pass rendered on the pitch. Single match or full season aggregates.",
    },
    {
      num: "02",
      title: "Shot-Creating Actions",
      desc: "The two actions preceding every shot. Who engineers the chances?",
    },
    {
      num: "03",
      title: "Expected Threat",
      desc: "A heatmap of ball progression value. Where does the pitch light up?",
    },
    {
      num: "04",
      title: "Match Summary",
      desc: "Goals, shots, momentum — a complete narrative of 90 minutes.",
    },
    {
      num: "05",
      title: "Team Comparison",
      desc: "Radar charts and head-to-head metrics across entire seasons.",
    },
    {
      num: "06",
      title: "Average Touches",
      desc: "Standardized player positioning heatmap showing team shape and individual influence.",
    },
  ];

  return (
    <div className="landing-editorial">
      <div className="landing-hero" ref={heroRef}>
        <DataFieldHero />

        <div className="hero-masthead">
          <span className="masthead-label">Premier League Analytics</span>
          <span className="masthead-year">{latestSeason ? latestSeason.replace("/", " — ").slice(2) : "2024 — 25"}</span>
        </div>

        <div className="hero-content" ref={titleRef}>
          <div className="hero-title-wrap">
            <h1 className="hero-title">
              <span className="hero-title-line">
                <span className="hero-x">x</span>Assassin
              </span>
            </h1>
          </div>
          <p className="hero-tagline">The Architecture of the Beautiful Game</p>
          <span className="hero-edition">
            Data Visualization Suite — Vol. I
          </span>
        </div>

        <div className="hero-corner-info">
          <span className="corner-stat">{matchCount != null ? matchCount : "—"}</span>
          <span className="corner-label">Matches Analyzed</span>
        </div>

        <div className="hero-scroll-hint">
          <div className="scroll-line"></div>
          <span className="scroll-text">Scroll</span>
        </div>
      </div>

      <div className="landing-manifesto">
        <div className="manifesto-content">
          <p className="manifesto-lead">Football is data in motion.</p>
          <p className="manifesto-body">
            Every pass, every touch, every decision — captured, analyzed, and
            rendered into the visual language of the sport. xAssassin transforms
            raw match data into intuitive visualizations that reveal the hidden
            architecture of Premier League football.
          </p>
        </div>
      </div>

      <div className="preview-sections">
        <div className="preview-header">
          <span className="preview-overline">The Tools</span>
          <h2 className="preview-headline">Six Lenses on the Game</h2>
        </div>
        {previews.map(function (p, i) {
          return (
            <div
              key={p.num}
              className="preview-item"
              ref={function (el) {
                previewRefs.current[i] = el;
              }}
            >
              <span className="preview-num">{p.num}</span>
              <div className="preview-text">
                <h3 className="preview-title">{p.title}</h3>
                <p className="preview-desc">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="landing-cta-section">
        <button className="landing-cta" onClick={onStart}>
          <span className="cta-text">Enter Dashboard</span>
          <svg
            className="cta-arrow"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="4" y1="10" x2="16" y2="10" />
            <polyline points="11,5 16,10 11,15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   AVERAGE TOUCHES — Player Positioning Heatmap
   ================================================================ */
function AverageTouchesPage() {
  var s1 = useState([]),
    matchIndex = s1[0],
    setMatchIndex = s1[1];
  var s2 = useState(""),
    season = s2[0],
    setSeason = s2[1];
  var s3 = useState(""),
    selectedTeam = s3[0],
    setSelectedTeam = s3[1];
  var s4 = useState(""),
    matchId = s4[0],
    setMatchId = s4[1];
  var s5 = useState([]),
    avgPositions = s5[0],
    setAvgPositions = s5[1];
  var s6 = useState(false),
    loading = s6[0],
    setLoading = s6[1];
  var s7 = useState(false),
    showSubs = s7[0],
    setShowSubs = s7[1];
  var s8 = useState({}),
    formationData = s8[0],
    setFormationData = s8[1];
  var s9 = useState(""),
    teamASummary = s9[0],
    setTeamASummary = s9[1];
  var s10 = useState(""),
    teamBSummary = s10[0],
    setTeamBSummary = s10[1];
  var s11 = useState(false),
    summaryLoading = s11[0],
    setSummaryLoading = s11[1];

  useEffect(function () {
    api("/match-index").then(function (idx) {
      setMatchIndex(idx);
    });
  }, []);

  // Derive all seasons
  var allSeasons = useMemo(
    function () {
      return matchIndex
        .map(function (m) {
          return m.season;
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .sort();
    },
    [matchIndex],
  );

  // Derive teams for selected season
  var seasonTeams = useMemo(
    function () {
      if (!season) return [];
      var teamsSet = {};
      matchIndex.forEach(function (m) {
        if (m.season === season) {
          if (m.home) teamsSet[m.home] = true;
          if (m.away) teamsSet[m.away] = true;
        }
      });
      return Object.keys(teamsSet).sort();
    },
    [matchIndex, season],
  );

  // Filter matches by season AND team
  var teamMatches = useMemo(
    function () {
      if (!season || !selectedTeam) return [];
      return matchIndex.filter(function (m) {
        return (
          m.season === season &&
          (m.home === selectedTeam || m.away === selectedTeam)
        );
      });
    },
    [matchIndex, season, selectedTeam],
  );

  // Set default season
  useEffect(
    function () {
      if (!matchIndex.length || season) return;
      if (allSeasons.length) setSeason(allSeasons[allSeasons.length - 1]);
    },
    [matchIndex, allSeasons],
  );

  // Set default team
  useEffect(
    function () {
      if (!seasonTeams.length) return;
      setSelectedTeam(
        seasonTeams.indexOf("Liverpool") >= 0 ? "Liverpool" : seasonTeams[0],
      );
    },
    [season, seasonTeams],
  );

  // Set default match
  useEffect(
    function () {
      if (!teamMatches.length) return;
      setMatchId("" + teamMatches[0].id);
    },
    [selectedTeam, teamMatches],
  );

  // Load average touches data (all players including subs) + formation connections
  useEffect(
    function () {
      if (!matchId) return;
      setLoading(true);

      // Load both regular positions (all players) and formation data (connections)
      Promise.all([
        api("/match/" + matchId + "/average-touches"),
        api("/match/" + matchId + "/formation-enhanced"),
      ])
        .then(function (results) {
          var avgPositionsData = results[0];
          var formationEnhancedData = results[1];

          console.log("Loaded positions:", avgPositionsData.length, "players");
          console.log("Starters:", avgPositionsData.filter(function (p) { return p.is_starter; }).length);
          console.log("Subs:", avgPositionsData.filter(function (p) { return !p.is_starter; }).length);

          setAvgPositions(avgPositionsData);
          setFormationData(formationEnhancedData);
          setLoading(false);
        })
        .catch(function (err) {
          console.error("Error loading data:", err);
          setLoading(false);
        });
    },
    [matchId],
  );

  // Format match display
  var formatMatch = function (m) {
    if (m.home === selectedTeam) {
      return "vs " + m.away + " (H)";
    } else {
      return "vs " + m.home + " (A)";
    }
  };

  // Get teams from data
  var teams = useMemo(
    function () {
      if (!avgPositions.length) return [];
      var teamsSet = {};
      avgPositions.forEach(function (p) {
        if (p.team) teamsSet[p.team] = true;
      });
      var teamsList = Object.keys(teamsSet).sort();
      console.log("Teams detected:", teamsList);
      return teamsList;
    },
    [avgPositions],
  );

  // Load AI summaries when teams are detected
  useEffect(
    function () {
      if (!teams.length || !matchId) return;
      setSummaryLoading(true);

      Promise.all([
        api("/match/" + matchId + "/ai-summary?team=" + teams[0]).catch(
          function () {
            return null;
          }
        ),
        api("/match/" + matchId + "/ai-summary?team=" + teams[1]).catch(
          function () {
            return null;
          }
        ),
      ])
        .then(function (results) {
          if (results[0] && results[0].summary) {
            setTeamASummary(results[0].summary);
          }
          if (results[1] && results[1].summary) {
            setTeamBSummary(results[1].summary);
          }
          setSummaryLoading(false);
        })
        .catch(function () {
          setSummaryLoading(false);
        });
    },
    [teams, matchId],
  );

  // Filter data based on showSubs toggle
  var filteredPositions = useMemo(
    function () {
      var result;
      if (showSubs) {
        result = avgPositions;
        console.log("Toggle ON (All Players):", result.length);
      } else {
        result = avgPositions.filter(function (p) {
          return p.is_starter;
        });
        console.log("Toggle OFF (Starters only):", result.length);
      }
      return result;
    },
    [avgPositions, showSubs],
  );

  var teamAData = filteredPositions.filter(function (p) {
    return p.team === teams[0];
  });
  var teamBData = filteredPositions.filter(function (p) {
    return p.team === teams[1];
  });

  // Debug: Log render state
  console.log("RENDER STATE:", {
    loading,
    avgPositionsLength: avgPositions.length,
    teamsLength: teams.length,
    filteredLength: filteredPositions.length,
    teamAData: teamAData.length,
    teamBData: teamBData.length,
    showSubs,
    subsCount,
    shouldRender: avgPositions.length > 0 && teams.length === 2,
  });
  var maxTouches = Math.max(
    1,
    Math.max.apply(
      null,
      filteredPositions.map(function (p) {
        return p.touches_count || 0;
      }),
    ),
  );

  // Count subs
  var subsCount = avgPositions.filter(function (p) {
    return !p.is_starter;
  }).length;

  // Formation detection function
  function detectFormation(players) {
    if (players.length < 10) return "—";
    // Sort by x position (excluding goalkeeper - player with lowest x)
    var sorted = players.slice().sort(function (a, b) {
      return a.avg_x - b.avg_x;
    });
    var outfield = sorted.slice(1); // Remove goalkeeper
    if (outfield.length < 9) return "—";

    // Cluster players into lines based on x position gaps
    var lines = [];
    var currentLine = [outfield[0]];
    var threshold = 8; // x distance threshold - smaller for cleaner lines

    for (var i = 1; i < outfield.length; i++) {
      var lastX = currentLine[currentLine.length - 1].avg_x;
      if (outfield[i].avg_x - lastX < threshold) {
        currentLine.push(outfield[i]);
      } else {
        lines.push(currentLine.length);
        currentLine = [outfield[i]];
      }
    }
    lines.push(currentLine.length);

    // Simplify to standard formation (combine small groups)
    if (lines.length > 4) {
      // Too many lines - merge adjacent small ones
      var simplified = [];
      var i = 0;
      while (i < lines.length) {
        if (lines[i] === 1 && i + 1 < lines.length) {
          simplified.push(lines[i] + lines[i + 1]);
          i += 2;
        } else {
          simplified.push(lines[i]);
          i++;
        }
      }
      lines = simplified;
    }

    var formationStr = lines.join("-");
    return formationStr;
  }

  var teamAFormation = useMemo(
    function () {
      return detectFormation(teamAData);
    },
    [teamAData],
  );
  var teamBFormation = useMemo(
    function () {
      return detectFormation(teamBData);
    },
    [teamBData],
  );

  return (
    <div>
      <div className="page-header">
        <h2>Average Touches</h2>
        <p>
          Standardized player positioning with both teams attacking left to
          right.
        </p>
      </div>
      <div className="controls-row">
        <div className="control-group">
          <label>Season</label>
          <select
            value={season}
            onChange={function (e) {
              setSeason(e.target.value);
            }}
          >
            {allSeasons.map(function (s) {
              return (
                <option key={s} value={s}>
                  {s} Premier League
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Team</label>
          <select
            value={selectedTeam}
            onChange={function (e) {
              setSelectedTeam(e.target.value);
            }}
          >
            {seasonTeams.map(function (t) {
              return (
                <option key={t} value={t}>
                  {t}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Match</label>
          <select
            value={matchId}
            onChange={function (e) {
              setMatchId(e.target.value);
            }}
            style={{ minWidth: 200 }}
          >
            {teamMatches.map(function (m) {
              return (
                <option key={m.id} value={"" + m.id}>
                  {formatMatch(m)}
                </option>
              );
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Players</label>
          <button
            className={"toggle-btn" + (showSubs ? " active" : "")}
            onClick={function () {
              console.log("Toggle clicked! showSubs was:", showSubs, "now:", !showSubs);
              setShowSubs(!showSubs);
            }}
          >
            {showSubs ? "All Players" : "Starting XI"}
            {subsCount > 0 && !showSubs
              ? " (" + subsCount + " subs hidden)"
              : ""}
          </button>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : avgPositions.length > 0 && teams.length === 2 ? (
        <div className="avg-touches-container">
          {/* AI Summary Section */}
          {(teamASummary || teamBSummary) && (
            <div className="ai-summary-section">
              <h3>📊 Tactical Analysis</h3>
              <div className="summary-grid">
                {teamASummary && (
                  <div className="summary-card team-a">
                    <h4>{teams[0]}</h4>
                    <p>{teamASummary}</p>
                  </div>
                )}
                {teamBSummary && (
                  <div className="summary-card team-b">
                    <h4>{teams[1]}</h4>
                    <p>{teamBSummary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {summaryLoading && !teamASummary && !teamBSummary && (
            <div className="ai-summary-loading">
              <p>🤖 Generating tactical analysis...</p>
            </div>
          )}
          <div className="avg-touches-grid">
            {/* Team A Panel */}
            <div className="avg-touch-panel">
              <div
                className="avg-touch-panel-header"
                style={{ borderLeftColor: "#C8102E" }}
              >
                <h3>{teams[0]}</h3>
                <span className="attack-direction">Attacking →</span>
              </div>
              <svg viewBox="0 0 52 68" className="half-pitch-svg">
                {/* Half pitch background */}
                <rect x="0" y="0" width="52" height="68" fill="#1a472a" />
                {/* Pitch markings */}
                <rect
                  x="2"
                  y="2"
                  width="50"
                  height="64"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Penalty area */}
                <rect
                  x="2"
                  y="13"
                  width="16.5"
                  height="42"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* 6-yard box */}
                <rect
                  x="2"
                  y="24"
                  width="5.5"
                  height="20"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Goal */}
                <rect
                  x="0"
                  y="28"
                  width="2"
                  height="12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Penalty spot */}
                <circle cx="13" cy="34" r="0.4" fill="#fff" fillOpacity="0.6" />
                {/* Center circle arc */}
                <path
                  d="M 52 24 A 10 10 0 0 0 52 44"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Connections (from formation data) */}
                {formationData[teams[0]] && formationData[teams[0]].connections
                  ? formationData[teams[0]].connections.map(
                      function (conn, idx) {
                        var x1 = (conn.from.x / 100) * 50 + 2;
                        var y1 = (conn.from.y / 100) * 64 + 2;
                        var x2 = (conn.to.x / 100) * 50 + 2;
                        var y2 = (conn.to.y / 100) * 64 + 2;
                        return (
                          <line
                            key={"conn-" + idx}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#C8102E"
                            strokeWidth={
                              conn.type === "line_connection" ? "0.15" : "0.08"
                            }
                            strokeOpacity={
                              conn.type === "line_connection" ? 0.2 : 0.12
                            }
                            strokeDasharray={
                              conn.type === "line_connection"
                                ? "0.5,0.3"
                                : "none"
                            }
                          />
                        );
                      },
                    )
                  : null}
                {/* Players */}
                {teamAData.map(function (p, i) {
                  var x = (p.avg_x / 100) * 50 + 2;
                  var y = (p.avg_y / 100) * 64 + 2;
                  var radius =
                    Math.sqrt((p.touches_count / maxTouches) * 3) + 1;
                  var playerName = (p.player || "?").split(" ")[0].substring(0, 3);
                  return (
                    <g key={i}>
                      {/* Glow effect */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius + 0.5}
                        fill="#C8102E"
                        fillOpacity="0.15"
                        zIndex="3"
                      />
                      {/* Main circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill="#C8102E"
                        fillOpacity="0.95"
                        stroke="#fff"
                        strokeWidth="0.25"
                        zIndex="4"
                      />
                      {/* Player initial */}
                      <text
                        x={x}
                        y={y + radius / 3}
                        fill="#fff"
                        fontSize="1.2"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                        zIndex="5"
                      >
                        {playerName}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="avg-touch-formation">
                <span className="formation-label">Avg. Shape</span>
                <span className="formation-value">{teamAFormation}</span>
              </div>
            </div>
            {/* Team B Panel */}
            <div className="avg-touch-panel">
              <div
                className="avg-touch-panel-header"
                style={{ borderLeftColor: "#B8860B" }}
              >
                <h3>{teams[1]}</h3>
                <span className="attack-direction">← Attacking</span>
              </div>
              <svg viewBox="0 0 52 68" className="half-pitch-svg">
                {/* Half pitch background */}
                <rect x="0" y="0" width="52" height="68" fill="#1a472a" />
                {/* Pitch markings - mirrored */}
                <rect
                  x="0"
                  y="2"
                  width="50"
                  height="64"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Penalty area */}
                <rect
                  x="33.5"
                  y="13"
                  width="16.5"
                  height="42"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* 6-yard box */}
                <rect
                  x="44.5"
                  y="24"
                  width="5.5"
                  height="20"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Goal */}
                <rect
                  x="50"
                  y="28"
                  width="2"
                  height="12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Penalty spot */}
                <circle cx="39" cy="34" r="0.4" fill="#fff" fillOpacity="0.6" />
                {/* Center circle arc */}
                <path
                  d="M 0 24 A 10 10 0 0 1 0 44"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                />
                {/* Connections (from formation data) */}
                {formationData[teams[1]] && formationData[teams[1]].connections
                  ? formationData[teams[1]].connections.map(
                      function (conn, idx) {
                        var x1 = 50 - (conn.from.x / 100) * 50;
                        var y1 = (conn.from.y / 100) * 64 + 2;
                        var x2 = 50 - (conn.to.x / 100) * 50;
                        var y2 = (conn.to.y / 100) * 64 + 2;
                        return (
                          <line
                            key={"conn-" + idx}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#B8860B"
                            strokeWidth={
                              conn.type === "line_connection" ? "0.15" : "0.08"
                            }
                            strokeOpacity={
                              conn.type === "line_connection" ? 0.2 : 0.12
                            }
                            strokeDasharray={
                              conn.type === "line_connection"
                                ? "0.5,0.3"
                                : "none"
                            }
                          />
                        );
                      },
                    )
                  : null}
                {/* Players - flip x coordinate */}
                {teamBData.map(function (p, i) {
                  var x = 50 - (p.avg_x / 100) * 50;
                  var y = (p.avg_y / 100) * 64 + 2;
                  var radius =
                    Math.sqrt((p.touches_count / maxTouches) * 3) + 1;
                  var playerName = (p.player || "?").split(" ")[0].substring(0, 3);
                  return (
                    <g key={i}>
                      {/* Glow effect */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius + 0.5}
                        fill="#B8860B"
                        fillOpacity="0.15"
                        zIndex="3"
                      />
                      {/* Main circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill="#B8860B"
                        fillOpacity="0.95"
                        stroke="#fff"
                        strokeWidth="0.25"
                        zIndex="4"
                      />
                      {/* Player initial */}
                      <text
                        x={x}
                        y={y + radius / 3}
                        fill="#fff"
                        fontSize="1.2"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                        zIndex="5"
                      >
                        {playerName}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="avg-touch-formation">
                <span className="formation-label">Avg. Shape</span>
                <span className="formation-value">{teamBFormation}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState message="No touch data available for this match." />
      )}
    </div>
  );
}

/* ================================================================
   DASHBOARD SHELL — Editorial Layout
   ================================================================ */
function Dashboard({ onBack }) {
  var route = useRoute();

  var Page;
  switch (route) {
    case "/pass-maps":
      Page = PassMapsPage;
      break;
    case "/sca":
      Page = SCAPage;
      break;
    case "/xt":
      Page = XTPage;
      break;
    case "/match-summary":
      Page = MatchSummaryPage;
      break;
    case "/team-comparison":
      Page = TeamComparisonPage;
      break;
    case "/average-touches":
      Page = AverageTouchesPage;
      break;
    default:
      Page = HomePage;
  }

  return (
    <div className="editorial-layout">
      <SiteHeader route={route} onBack={onBack} />
      <main className="main-content">
        <PageTransition routeKey={route}>
          <Page />
        </PageTransition>
      </main>
    </div>
  );
}

/* ================================================================
   APP STATE MACHINE — Landing → Dashboard (no void)
   ================================================================ */
function App() {
  var s1 = useState("landing"),
    phase = s1[0],
    setPhase = s1[1];

  var showDashboard = useCallback(function () {
    window.location.hash = "/";
    setPhase("dashboard");
    window.scrollTo(0, 0);
  }, []);

  var backToLanding = useCallback(function () {
    window.location.hash = "/";
    setPhase("landing");
    window.scrollTo(0, 0);
  }, []);

  if (phase === "landing") return <LandingPage onStart={showDashboard} />;
  return <Dashboard onBack={backToLanding} />;
}

/* ================================================================
   MOUNT
   ================================================================ */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
