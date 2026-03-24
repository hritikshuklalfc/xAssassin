/* Pitch SVG Components */

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

// Export to window
window.PitchMarkings = PitchMarkings;
window.PitchSVG = PitchSVG;
window.PassArrows = PassArrows;
