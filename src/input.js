// Keyboard input. Side-effectful: attaches listeners to window.
// Exposes a snapshot() to read the current state and a justPressed() for one-shot events.

const KEY_MAP = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'jump',
  ArrowUp: 'jump',
  KeyR: 'restart',
  Space: 'next', // advance from tutorial → stage 1, or after clear
};

export function createInput() {
  const held = new Set();
  const pressedThisFrame = new Set();

  window.addEventListener('keydown', (e) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (!held.has(action)) pressedThisFrame.add(action);
    held.add(action);
    if (action === 'jump' || action === 'restart' || action === 'next') e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    held.delete(action);
  });

  return {
    snapshot() {
      return {
        left: held.has('left'),
        right: held.has('right'),
        jump: held.has('jump'),
        restart: held.has('restart'),
        next: held.has('next'),
      };
    },
    justPressed(action) {
      return pressedThisFrame.has(action);
    },
    endFrame() {
      pressedThisFrame.clear();
    },
  };
}
