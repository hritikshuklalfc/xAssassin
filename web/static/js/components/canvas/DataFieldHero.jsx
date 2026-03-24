/* Data Field Hero - Animated pitch visualization for landing page */

function DataFieldHero() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
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

window.DataFieldHero = DataFieldHero;
