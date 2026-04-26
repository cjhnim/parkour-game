// Keyboard input. Side-effectful: attaches listeners to window.
// Exposes a snapshot() to read held state and a justPressed() for one-shot events.
// game.js interprets actions per mode (play vs editor).

const KEY_MAP = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'up',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyR: 'restart',
  Space: 'space',
  KeyE: 'editor',
  KeyP: 'setSpawn',
  KeyG: 'setGoal',
  KeyS: 'save',
  KeyT: 'toggleMode', // editor: switch between anchor (reach origin) and tile (brush) modes
  KeyN: 'newStage',   // editor: clear scratchStage to a blank arena
  Tab: 'testPlay',    // editor: toggle in-editor simulation
  Digit0: 'stage0', Digit1: 'stage1', Digit2: 'stage2',
  Digit3: 'stage3', Digit4: 'stage4', Digit5: 'stage5',
  Digit6: 'stage6', Digit7: 'stage7', Digit8: 'stage8', Digit9: 'stage9',
};

const PREVENT_DEFAULT = new Set(['up', 'down', 'left', 'right', 'space', 'restart', 'save', 'testPlay']);

export function createInput() {
  const held = new Set();
  const pressedThisFrame = new Set();

  window.addEventListener('keydown', (e) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (!held.has(action)) pressedThisFrame.add(action);
    held.add(action);
    if (PREVENT_DEFAULT.has(action)) e.preventDefault();
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
        up: held.has('up'),
        down: held.has('down'),
        jump: held.has('up'),  // play-mode alias for 'up'
        restart: held.has('restart'),
        next: held.has('space'),  // play mode: 'space' advances stage
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
