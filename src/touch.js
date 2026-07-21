// ============================================================
//  FUTUREME — controlli touch (joystick + pulsante azione)
// ============================================================

export function isTouchDevice() {
  return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

// Collega il joystick e il pulsante azione al gioco.
export function setupTouch(game) {
  const wrap = document.getElementById("touch-controls");
  const stick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  const action = document.getElementById("btn-action");
  if (!wrap) return { show() {}, hide() {} };

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
    // vettore normalizzato: x = destra, z = giù (indietro) — coerente con la tastiera
    game.setTouchMove(dx / len * (clamped / R), dy / len * (clamped / R));
  };

  stick.addEventListener("pointerdown", (e) => {
    activeId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    onMove(e);
  });
  stick.addEventListener("pointermove", onMove);
  stick.addEventListener("pointerup", reset);
  stick.addEventListener("pointercancel", reset);

  action.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    game.interact();
  });

  return {
    show() { wrap.classList.remove("hidden"); },
    hide() { wrap.classList.add("hidden"); },
  };
}
