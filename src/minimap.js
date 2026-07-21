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

// Mappa a schermo intero (nord in alto, centrata sull'origine del mondo)
export function renderFullMap(game, canvas) {
  const ctx = canvas.getContext("2d");
  const S = canvas.width, R = S / 2;
  const worldR = game.worldSize;
  const scale = (R - 20) / worldR;
  const W = (wx, wz) => [R + wx * scale, R + wz * scale];
  const dot = (wx, wz, color, size, glow) => {
    const [x, y] = W(wx, wz);
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  };

  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "rgba(6,8,20,0.96)"; ctx.fillRect(0, 0, S, S);
  // griglia
  ctx.strokeStyle = "rgba(120,160,255,0.08)"; ctx.lineWidth = 1;
  for (let g = -worldR; g <= worldR; g += 10) { const [gx] = W(g, 0); const [, gy] = W(0, g); ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, S); ctx.moveTo(0, gy); ctx.lineTo(S, gy); ctx.stroke(); }

  const o = game.objects;
  for (const it of o.items) dot(it.position.x, it.position.z, (it.userData.type === "key" || it.userData.type === "passport") ? "#ffd35c" : "#9fb", 3);
  if (o.spheres) for (const s of o.spheres) dot(s.position.x, s.position.z, "#4df3ff", 6, true);
  if (o.charges) for (const c of o.charges) dot(c.position.x, c.position.z, "#2aa0ff", 4);
  if (o.powerups) for (const p of o.powerups) dot(p.position.x, p.position.z, "#b96bff", 4, true);
  for (const p of o.portals) dot(p.position.x, p.position.z, p.userData.dest === "invasion" ? (p.userData.closed ? "#556" : "#ff3355") : "#4df3ff", 6, true);
  for (const n of o.npcs) dot(n.position.x, n.position.z, "#b96bff", 5);
  if (game.remotes) for (const [, r] of game.remotes) dot(r.group.position.x, r.group.position.z, "#4dd39a", 7, true);
  const sphereOn = game.sphere && game.sphere.active && game.sphere.energy > 0;
  const px = game.player.position.x, pz = game.player.position.z;
  for (const m of o.monsters) {
    const near = Math.hypot(m.position.x - px, m.position.z - pz) < 16;
    if (sphereOn || near) dot(m.position.x, m.position.z, "#ff2020", 5, sphereOn);
  }
  if (game.alter) dot(game.alter.position.x, game.alter.position.z, game.alter.userData.evil ? "#ff2040" : "#4df3ff", 8, true);
  if (game.boss) dot(game.boss.position.x, game.boss.position.z, "#ff3366", 10, true);

  // giocatore (freccia orientata)
  const [pxs, pys] = W(px, pz);
  ctx.save(); ctx.translate(pxs, pys); ctx.rotate(-game.player.rotation.y + Math.PI);
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-7, 8); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();

  ctx.strokeStyle = "rgba(120,160,255,0.6)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.stroke();
}
