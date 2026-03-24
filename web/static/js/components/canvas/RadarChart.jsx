/* Radar Chart Component */

function RadarChart({ labels, seriesA, seriesB, nameA, nameB }) {
  var cx = 160,
    cy = 160,
    R = 120,
    n = labels.length;
  var maxV = labels.map(function (_, i) {
    return Math.max(seriesA[i] || 0, seriesB[i] || 0, 1);
  });
  function angle(i) {
    return (Math.PI * 2 * i) / n - Math.PI / 2;
  }
  function pt(i, v, mx) {
    var r = (v / mx) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  }
  function poly(series) {
    return series
      .map(function (v, i) {
        return pt(i, v, maxV[i]).join(",");
      })
      .join(" ");
  }
  var gridLevels = [0.25, 0.5, 0.75, 1];
  return (
    <svg width="340" height="340" viewBox="0 0 320 320">
      <g>
        {gridLevels.map(function (lv) {
          return (
            <polygon
              key={lv}
              points={labels
                .map(function (_, i) {
                  return pt(i, maxV[i] * lv, maxV[i]).join(",");
                })
                .join(" ")}
              fill="none"
              stroke="rgba(0,0,0,0.07)"
              strokeWidth="0.5"
            />
          );
        })}
        {labels.map(function (_, i) {
          var p = pt(i, maxV[i], maxV[i]);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p[0]}
              y2={p[1]}
              stroke="rgba(0,0,0,0.05)"
              strokeWidth="0.5"
            />
          );
        })}
      </g>
      <polygon
        points={poly(seriesA)}
        fill="rgba(200,16,46,0.18)"
        stroke="#C8102E"
        strokeWidth="1.5"
      />
      <polygon
        points={poly(seriesB)}
        fill="rgba(184,134,11,0.18)"
        stroke="#B8860B"
        strokeWidth="1.5"
      />
      {labels.map(function (lbl, i) {
        var p = pt(i, maxV[i] * 1.22, maxV[i]);
        return (
          <text
            key={i}
            x={p[0]}
            y={p[1]}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="7"
            fill="#666"
          >
            {lbl}
          </text>
        );
      })}
      <g transform="translate(10, 305)">
        <rect width="10" height="10" fill="rgba(200,16,46,0.5)" rx="1" />
        <text x="14" y="8" fontSize="8" fill="#333">
          {nameA || "Team A"}
        </text>
        <rect
          x="80"
          width="10"
          height="10"
          fill="rgba(184,134,11,0.5)"
          rx="1"
        />
        <text x="94" y="8" fontSize="8" fill="#333">
          {nameB || "Team B"}
        </text>
      </g>
    </svg>
  );
}

window.RadarChart = RadarChart;
