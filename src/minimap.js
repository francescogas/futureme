// ============================================================
//  FUTUREME — minimappa 2D (radar) disegnata su canvas
// ============================================================

export class Minimap {
  constructor() {
    this.canvas = document.getElementById("minimap");
    this.ctx = this.canvas.getContext("2d");
    this.size = this.canvas.width; // px (quadrato)
  }

  // worldSize = raggio del mondo; player = THREE.Object3D
  render(game) {
    const ctx = this.ctx;
    const S = this.size;
    const R = S / 2;
    const worldR = game.worldSize;
    const scale = (R - 6) / worldR;

    ctx.clearRect(0, 0, S, S);

    // sfondo circolare
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(8,10,24,0.82)";
    ctx.fillRect(0, 0, S, S);

    const px = game.player.position.x, pz = game.player.position.z;
    // il radar è centrato sul giocatore, ruotato con la telecamera
    const yaw = game.yaw;
    const cos = Math.cos(-yaw), sin = Math.sin(-yaw);

    const plot = (wx, wz) => {
      let dx = (wx - px) * scale, dz = (wz - pz) * scale;
      // ruota così che "avanti" sia in alto
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return [R + rx, R + rz];
    };

    const dot = (wx, wz, color, size = 3, glow = false) => {
      const [x, y] = plot(wx, wz);
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // oggetti
    for (const it of game.objects.items) {
      const t = it.userData.type;
      const col = (t === "key" || t === "passport") ? "#ffd35c"
        : ["garlic", "cross", "silver", "torch"].includes(t) ? "#d8dde8"
        : "#7fe08a";
      dot(it.position.x, it.position.z, col, 2.4);
    }
    // Sfera del Veggente e cariche (nel mondo)
    if (game.objects.spheres) for (const s of game.objects.spheres) dot(s.position.x, s.position.z, "#4df3ff", 4, true);
    if (game.objects.charges) for (const c of game.objects.charges) dot(c.position.x, c.position.z, "#2aa0ff", 2.4);
    // portali
    for (const p of game.objects.portals) {
      const col = p.userData.dest === "invasion" ? (p.userData.closed ? "#556" : "#ff3355") : "#4df3ff";
      dot(p.position.x, p.position.z, col, 3.2, true);
    }
    // NPC
    for (const n of game.objects.npcs) dot(n.position.x, n.position.z, "#b96bff", 3);
    // altri giocatori (multiplayer)
    if (game.remotes && game.remotes.size) {
      for (const [, r] of game.remotes) dot(r.group.position.x, r.group.position.z, "#4dd39a", 4, true);
    }
    // mostri: normalmente solo quelli vicini; con la Sfera del Veggente attiva, tutti
    const sphereOn = game.sphere && game.sphere.active && game.sphere.energy > 0;
    for (const m of game.objects.monsters) {
      const near = Math.hypot(m.position.x - px, m.position.z - pz) < 16;
      if (sphereOn || near) dot(m.position.x, m.position.z, "#ff2020", sphereOn ? 3.4 : 3, sphereOn);
    }
    // alter ego
    if (game.alter) dot(game.alter.position.x, game.alter.position.z, game.alter.userData.evil ? "#ff2040" : "#4df3ff", 4, true);
    // boss
    if (game.boss) dot(game.boss.position.x, game.boss.position.z, "#ff3366", 5, true);

    // giocatore al centro (triangolo che punta in alto)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(R, R - 6);
    ctx.lineTo(R - 4, R + 4);
    ctx.lineTo(R + 4, R + 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // bordo
    ctx.strokeStyle = "rgba(120,160,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(R, R, R - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
