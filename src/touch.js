// ============================================================
//  FUTUREME — controlli touch (joystick + pulsanti azione)
//  Layout stile mobile dei giochi popolari: joystick a sinistra
//  per muoversi, cluster di pulsanti a destra (attacca / salta /
//  interagisci / sfera / vista), trascina lo schermo per guardare.
// ============================================================

export function isTouchDevice() {
  return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

export function setupTouch(game) {
  const wrap = document.getElementById("touch-controls");
  const stick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  if (!wrap || !stick) return { show() {}, hide() {} };

  const R = 44; // raggio massimo del knob (px)
  let activeId = null;

  const reset = () => {
    activeId = null;
    knob.style.transform = "translate(0px, 0px)";
    game.setTouchMove(0, 0);
  };

  const onMove = (e) => {
    if (activeId === null) return;
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, R);
    const nx = (dx / len) * clamped, ny = (dy / len) * clamped;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    game.setTouchMove(dx / len * (clamped / R), dy / len * (clamped / R));
  };

  stick.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    activeId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    onMove(e);
  });
  stick.addEventListener("pointermove", onMove);
  stick.addEventListener("pointerup", reset);
  stick.addEventListener("pointercancel", reset);

  // Collega un pulsante a un'azione (evita che il tocco ruoti la telecamera)
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  };

  bind("btn-action", () => game.attack());       // 👊 attacco primario
  bind("tb-jump", () => game.jump());             // ⤴ salto
  bind("tb-interact", () => game.interact());     // ✋ interagisci (E)
  bind("tb-sphere", () => game.toggleSphere());   // 🔮 sfera
  bind("tb-cam", () => game.cycleCamera());       // 🎥 cambia vista

  return {
    show() { wrap.classList.remove("hidden"); },
    hide() { wrap.classList.add("hidden"); },
  };
}
