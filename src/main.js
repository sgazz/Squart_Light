import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateBoard, ORIENTATION, GAME_STATUS, placeDomino, countAvailableMoves } from './game/board.js';
import { buildBoardGroup, addDominoMesh } from './three/boardRenderer.js';
import { createWinnerBanner, updateWinnerBanner, disposeWinnerBanner } from './three/winnerBanner.js';

const canvasWrapper = document.getElementById('canvas-wrapper');
const canvas = document.getElementById('squart-canvas');
const rowSlider = document.getElementById('board-rows');
const rowValue = document.getElementById('board-rows-value');
const colSlider = document.getElementById('board-cols');
const colValue = document.getElementById('board-cols-value');
const seedInput = document.getElementById('seed-input');
const percentageSlider = document.getElementById('inactive-percentage');
const percentageDisplay = document.getElementById('percentage-display');
const regenerateButton = document.getElementById('regenerate-btn');
const defaultPercentageButton = document.getElementById('default-percentage-btn');
const guideButton = document.getElementById('guide-btn');
const statsElement = document.getElementById('board-stats');
const turnIndicator = document.getElementById('turn-indicator');
const movesHorizontalElement = document.getElementById('moves-horizontal');
const movesVerticalElement = document.getElementById('moves-vertical');
const boardFeedback = document.getElementById('board-feedback');
const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardingDismiss = document.getElementById('onboarding-dismiss');
const guideOverlay = document.getElementById('guide-overlay');
const guideDismiss = document.getElementById('guide-dismiss');

const ORIENTATION_LABELS = {
  [ORIENTATION.HORIZONTAL]: 'Horizontal (Blue)',
  [ORIENTATION.VERTICAL]: 'Vertical (Red)',
};

const BOARD_FEEDBACK_DURATION = 2200;
const REGENERATE_DEBOUNCE_MS = 250;
const ONBOARDING_KEY = 'squart:onboarding:v1';
const FAIRNESS_MAX_ABS_DIFF = 1;
const FAIRNESS_MAX_ATTEMPTS = 40;

const scene = new THREE.Scene();
scene.background = createBackgroundTexture();
scene.fog = new THREE.Fog(0x050812, 20, 80);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const hemiLight = new THREE.HemisphereLight(0x7aa8ff, 0x0b0f1c, 0.45);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x96b5ff, 0.45);
fillLight.position.set(-6, 6.5, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffb86c, 0.3);
rimLight.position.set(0, 4, 7);
scene.add(rimLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let boardData = null;
let boardGroup = null;
let cellMeshes = [];
let customInactivePercentage = null;
let winnerBanner = null;
let regenerateTimeoutId = null;
let feedbackTimeoutId = null;
const dominoAnimations = [];
const inactiveAnimations = [];
let lastFairnessInfo = null;

function init() {
  initDimensionSliders();
  regenerateBoard();
  window.addEventListener('resize', handleResize);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  regenerateButton.addEventListener('click', () => scheduleRegenerateBoard(true));
  percentageSlider.addEventListener('input', handlePercentageChange);
  defaultPercentageButton.addEventListener('click', handleDefaultPercentage);
  rowSlider.addEventListener('input', handleDimensionChange);
  colSlider.addEventListener('input', handleDimensionChange);
  document.addEventListener('keydown', handleShortcutKeys);
  if (guideButton) {
    guideButton.addEventListener('click', showGuideOverlay);
  }
  if (guideDismiss) {
    guideDismiss.addEventListener('click', hideGuideOverlay);
  }
  if (guideOverlay) {
    guideOverlay.addEventListener('click', (event) => {
      if (event.target === guideOverlay) {
        hideGuideOverlay();
      }
    });
  }
  if (onboardingDismiss) {
    onboardingDismiss.addEventListener('click', () => hideOnboarding(true));
  }
  if (onboardingOverlay) {
    onboardingOverlay.addEventListener('click', (event) => {
      if (event.target === onboardingOverlay) {
        hideOnboarding(true);
      }
    });
  }
  showOnboardingIfNeeded();
  updatePercentageDisplay();
  handleResize();
  animate();
}

function initDimensionSliders() {
  rowSlider.min = '5';
  rowSlider.max = '20';
  colSlider.min = '5';
  colSlider.max = '20';
  if (!rowSlider.value) {
    rowSlider.value = '10';
  }
  if (!colSlider.value) {
    colSlider.value = '10';
  }
  updateDimensionDisplay();
}

function regenerateBoard() {
  clearWinnerBanner();
  const rows = Number(rowSlider.value);
  const cols = Number(colSlider.value);
  const seedValue = seedInput.value.trim();
  const seed = seedValue ? seedValue : undefined;

  const { board, stats, attempts } = generateBalancedBoard({
    rows,
    cols,
    seed,
    inactivePercentage: customInactivePercentage ?? undefined,
  });

  boardData = board;
  lastFairnessInfo = {
    horizontalMoves: stats.horizontalMoves,
    verticalMoves: stats.verticalMoves,
    diff: stats.diff,
    attempts,
    seedProvided: Boolean(seed),
  };

  updateBoardGroup();
  updateTurnIndicator();
  updateStats();
  updateRemainingMoves();
  syncWinnerBanner();
  updateCamera(rows, cols);

  if (lastFairnessInfo.seedProvided) {
    if (lastFairnessInfo.diff > FAIRNESS_MAX_ABS_DIFF) {
      showFeedback(
        `Seed ${seed} yields imbalance (Δ=${lastFairnessInfo.diff}). Try another seed for equal chances.`,
        'warning'
      );
    } else {
      showFeedback('Board updated with current seed.', 'info', 1200);
    }
  } else if (lastFairnessInfo.diff <= FAIRNESS_MAX_ABS_DIFF) {
    if (lastFairnessInfo.attempts > 1) {
      showFeedback(
        `Balanced board after ${lastFairnessInfo.attempts} attempts (Δ=${lastFairnessInfo.diff}).`,
        'info',
        1500
      );
    } else {
      showFeedback('Board updated (balanced moves).', 'success', 1200);
    }
  } else {
    showFeedback(
      `Closest balance found (Δ=${lastFairnessInfo.diff}). Adjust inactive percentage if needed.`,
      'warning'
    );
  }
}

function updateBoardGroup() {
  if (boardGroup) {
    scene.remove(boardGroup);
  }

  boardGroup = buildBoardGroup(boardData);
  cellMeshes = boardGroup.userData?.cellMeshes ?? [];
  scene.add(boardGroup);
  dominoAnimations.length = 0;
  inactiveAnimations.length = 0;
  queueInactiveWave(boardGroup, boardData);
}

function updateStats() {
  if (!boardData) {
    statsElement.textContent = '';
    return;
  }

  const inactivePercentage = boardData.actualInactivePercentage;
  const placementCount = boardData.placements.length;
  const baseInfo = `Inactive squares: <strong>${boardData.inactiveCount}</strong> (${inactivePercentage.toFixed(
    1
  )}%)<br />Board size: ${boardData.cols} × ${boardData.rows}<br />Dominoes placed: ${placementCount}`;

  const modeInfo =
    boardData.requestedInactivePercentage === null
      ? 'Mode: Default random (17–19%)'
      : `Custom target: ${boardData.requestedInactivePercentage}%`;

  const statusInfo =
    boardData.status === GAME_STATUS.FINISHED
      ? boardData.winner
        ? `Result: <strong>${ORIENTATION_LABELS[boardData.winner]} wins</strong>`
        : '<strong>Result: Draw</strong>'
      : 'Game status: <strong>In progress</strong>';

  const fairnessInfo = lastFairnessInfo
    ? `Move balance: <strong>Δ=${lastFairnessInfo.diff}</strong> (H=${lastFairnessInfo.horizontalMoves}, V=${lastFairnessInfo.verticalMoves}${
        lastFairnessInfo.attempts > 1 ? `, attempts ${lastFairnessInfo.attempts}` : ''
      }${lastFairnessInfo.seedProvided ? ', seed' : ''})`
    : '';

  statsElement.innerHTML = `${baseInfo}<br />${modeInfo}<br />${statusInfo}${
    fairnessInfo ? `<br />${fairnessInfo}` : ''
  }`;
}

function updateCamera(rows, cols) {
  const maxDimension = Math.max(rows, cols);
  const distance = Math.max(7.5, maxDimension * 1.75);
  camera.position.set(distance, distance * 0.82, distance * 0.95);
  controls.target.set(0, 0, 0);
  controls.maxDistance = distance * 2.2;
  controls.minDistance = Math.max(4, maxDimension * 1.1);
  controls.update();
}

function handleResize() {
  const width = canvasWrapper.clientWidth;
  const height = canvasWrapper.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function handlePercentageChange(event) {
  customInactivePercentage = Number(event.target.value);
  updatePercentageDisplay();
  scheduleRegenerateBoard();
}

function handleDefaultPercentage() {
  customInactivePercentage = null;
  percentageSlider.value = '17';
  updatePercentageDisplay();
  scheduleRegenerateBoard(true);
}

function updatePercentageDisplay() {
  if (customInactivePercentage === null) {
    percentageDisplay.textContent = 'Default random (17–19%)';
  } else {
    percentageDisplay.textContent = `Custom inactive percentage: ${customInactivePercentage}%`;
  }
}

function handleDimensionChange() {
  updateDimensionDisplay();
  scheduleRegenerateBoard();
}

function generateBalancedBoard({ rows, cols, seed, inactivePercentage }) {
  if (seed !== undefined) {
    const board = generateBoard({ rows, cols, seed, inactivePercentage });
    const stats = measureMoveBalance(board);
    return { board, stats, attempts: 1 };
  }

  let bestBoard = null;
  let bestStats = null;
  let bestDiff = Infinity;

  for (let attempt = 1; attempt <= FAIRNESS_MAX_ATTEMPTS; attempt += 1) {
    const board = generateBoard({ rows, cols, inactivePercentage });
    const stats = measureMoveBalance(board);
    if (stats.diff < bestDiff) {
      bestBoard = board;
      bestStats = stats;
      bestDiff = stats.diff;
    }
    if (stats.diff <= FAIRNESS_MAX_ABS_DIFF) {
      return { board, stats, attempts: attempt };
    }
  }

  return { board: bestBoard, stats: bestStats, attempts: FAIRNESS_MAX_ATTEMPTS };
}

function measureMoveBalance(board) {
  const horizontalMoves = countAvailableMoves(board, ORIENTATION.HORIZONTAL);
  const verticalMoves = countAvailableMoves(board, ORIENTATION.VERTICAL);
  const diff = Math.abs(horizontalMoves - verticalMoves);
  return { horizontalMoves, verticalMoves, diff };
}

function updateDimensionDisplay() {
  rowValue.textContent = `${rowSlider.value}`;
  colValue.textContent = `${colSlider.value}`;
}

function scheduleRegenerateBoard(immediate = false) {
  if (regenerateTimeoutId) {
    window.clearTimeout(regenerateTimeoutId);
    regenerateTimeoutId = null;
  }

  if (immediate) {
    regenerateBoard();
    return;
  }

  regenerateTimeoutId = window.setTimeout(() => {
    regenerateBoard();
    regenerateTimeoutId = null;
  }, REGENERATE_DEBOUNCE_MS);
}

function updateRemainingMoves() {
  if (!movesHorizontalElement || !movesVerticalElement) {
    return;
  }

  if (!boardData) {
    movesHorizontalElement.textContent = '—';
    movesVerticalElement.textContent = '—';
    return;
  }

  const horizontalMoves = countAvailableMoves(boardData, ORIENTATION.HORIZONTAL);
  const verticalMoves = countAvailableMoves(boardData, ORIENTATION.VERTICAL);
  movesHorizontalElement.textContent = horizontalMoves.toString();
  movesVerticalElement.textContent = verticalMoves.toString();
}

function updateTurnIndicator() {
  if (!turnIndicator) {
    return;
  }

  if (!boardData) {
    turnIndicator.textContent = 'Preparing board...';
    turnIndicator.classList.remove('surge');
    return;
  }

  if (boardData.status === GAME_STATUS.FINISHED) {
    const winnerLabel = boardData.winner ? `${ORIENTATION_LABELS[boardData.winner]} wins` : 'Draw';
    turnIndicator.textContent = winnerLabel;
    turnIndicator.classList.remove('surge');
    return;
  }

  const label = boardData.currentPlayer === ORIENTATION.HORIZONTAL ? ORIENTATION_LABELS[ORIENTATION.HORIZONTAL] : ORIENTATION_LABELS[ORIENTATION.VERTICAL];
  turnIndicator.textContent = `${label} to move`;
  pulseTurnIndicator();
}

function pulseTurnIndicator() {
  if (!turnIndicator) {
    return;
  }
  turnIndicator.classList.remove('surge');
  // Force reflow to restart animation
  void turnIndicator.offsetWidth;
  turnIndicator.classList.add('surge');
}

function showFeedback(message, type = 'info', duration = BOARD_FEEDBACK_DURATION) {
  if (!boardFeedback) {
    return;
  }

  boardFeedback.className = '';
  boardFeedback.classList.add(type, 'visible');
  boardFeedback.textContent = message;

  if (feedbackTimeoutId) {
    window.clearTimeout(feedbackTimeoutId);
  }

  feedbackTimeoutId = window.setTimeout(() => {
    boardFeedback.classList.remove('visible', 'info', 'success', 'warning');
    feedbackTimeoutId = null;
  }, duration);
}

function handlePointerDown(event) {
  if (!boardGroup || !boardData) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cellMeshes, false);
  const hit = intersects.find((intersect) => intersect.object.userData);

  if (!hit) {
    showFeedback('Try placing dominoes on active squares within the board.', 'info', 1500);
    return;
  }

  const { row, col } = hit.object.userData;
  tryPlaceDomino(row, col);
}

function tryPlaceDomino(row, col) {
  if (!boardData) {
    return;
  }

  if (boardData.status !== GAME_STATUS.ACTIVE) {
    showFeedback('The round is over. Regenerate the board to play again.', 'warning');
    return;
  }

  const placement = placeDomino(boardData, { row, col });
  if (!placement) {
    showFeedback('Invalid move: domino cannot cover inactive or occupied squares.', 'warning');
    return;
  }

  const mesh = addDominoMesh(boardGroup, placement);
  if (mesh) {
    queueDominoAnimation(mesh);
  }
  updateTurnIndicator();
  updateStats();
  updateRemainingMoves();
  syncWinnerBanner();
  showFeedback('Domino placed!', 'success', 1000);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const now = performance.now();
  updateInactiveAnimations(now);
  updateDominoAnimations(now);
  renderer.render(scene, camera);
}

function syncWinnerBanner() {
  if (!boardData || !boardGroup) {
    clearWinnerBanner();
    return;
  }

  if (boardData.status !== GAME_STATUS.FINISHED) {
    clearWinnerBanner();
    return;
  }

  const label = boardData.winner ? `${ORIENTATION_LABELS[boardData.winner]} Wins!` : 'Draw';
  const color =
    boardData.winner === ORIENTATION.HORIZONTAL
      ? '#1f6feb'
      : boardData.winner === ORIENTATION.VERTICAL
      ? '#d73a49'
      : '#ffffff';

  const cellDimensions = boardGroup.userData?.cellDimensions ?? {};
  const cellSize = cellDimensions.cellSize ?? 1;
  const width = cellSize * boardData.cols * 0.9;

  if (!winnerBanner) {
    winnerBanner = createWinnerBanner({ text: label, color, width });
    scene.add(winnerBanner);
  } else {
    updateWinnerBanner(winnerBanner, { text: label, color, width });
  }

  const maxCellHeight = cellDimensions.maxCellHeight ?? 0.2;
  const verticalOffset = maxCellHeight + Math.max(boardData.rows, boardData.cols) * 0.35 + 0.8;
  winnerBanner.position.set(0, verticalOffset, 0);
}

function clearWinnerBanner() {
  if (!winnerBanner) {
    return;
  }

  scene.remove(winnerBanner);
  disposeWinnerBanner(winnerBanner);
  winnerBanner = null;
}

init();

function updateDominoAnimations(now) {
  for (let i = dominoAnimations.length - 1; i >= 0; i -= 1) {
    const anim = dominoAnimations[i];
    const progress = Math.min((now - anim.start) / anim.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const scale = 0.1 + eased * 0.9;
    anim.mesh.scale.set(scale, scale, scale);
    if (progress >= 1) {
      anim.mesh.scale.set(1, 1, 1);
      dominoAnimations.splice(i, 1);
    }
  }
}

function queueDominoAnimation(mesh) {
  if (!mesh) {
    return;
  }
  dominoAnimations.push({
    mesh,
    start: performance.now(),
    duration: 240,
  });
}

function queueInactiveWave(group, board) {
  if (!group || !board) {
    return;
  }

  const waveTargets = group.userData?.inactiveWaveTargets ?? [];
  if (!waveTargets.length) {
    return;
  }

  const midRow = (board.rows - 1) / 2;
  const midCol = (board.cols - 1) / 2;
  const baseTime = performance.now();

  waveTargets.forEach((target) => {
    const distance = Math.hypot(target.row - midRow, target.col - midCol);
    const delay = distance * 85;
    inactiveAnimations.push({
      mesh: target.mesh,
      start: baseTime + delay,
      duration: 420,
      fromScale: target.initialScale ?? target.mesh.scale.y,
      toScale: target.targetScale ?? 1,
    });
  });
}

function updateInactiveAnimations(now) {
  for (let i = inactiveAnimations.length - 1; i >= 0; i -= 1) {
    const anim = inactiveAnimations[i];
    if (now < anim.start) {
      continue;
    }
    const progress = Math.min((now - anim.start) / anim.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2.2);
    const scale = anim.fromScale + (anim.toScale - anim.fromScale) * eased;
    anim.mesh.scale.y = scale;
    if (progress >= 1) {
      anim.mesh.scale.y = anim.toScale;
      inactiveAnimations.splice(i, 1);
    }
  }
}

function handleShortcutKeys(event) {
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'r':
      showFeedback('Regenerating board...', 'info', 900);
      scheduleRegenerateBoard(true);
      break;
    case 'h':
      showFeedback('Horizontal player places horizontal dominoes automatically.', 'info', 1500);
      break;
    case 'v':
      showFeedback('Vertical player places vertical dominoes automatically.', 'info', 1500);
      break;
    case 'g':
      showGuideOverlay();
      break;
    case 'escape':
      hideOnboarding(false);
      hideGuideOverlay();
      break;
    default:
      break;
  }
}

function showOnboardingIfNeeded() {
  if (!onboardingOverlay) {
    return;
  }
  const seen = window.localStorage?.getItem(ONBOARDING_KEY);
  if (!seen) {
    onboardingOverlay.classList.remove('hidden');
  } else {
    onboardingOverlay.classList.add('hidden');
  }
}

function hideOnboarding(persist = false) {
  if (!onboardingOverlay) {
    return;
  }
  onboardingOverlay.classList.add('hidden');
  if (persist) {
    try {
      window.localStorage?.setItem(ONBOARDING_KEY, '1');
    } catch (error) {
      console.warn('Unable to persist onboarding state', error);
    }
  }
}

function showGuideOverlay() {
  if (!guideOverlay) {
    return;
  }
  guideOverlay.classList.remove('hidden');
}

function hideGuideOverlay() {
  if (!guideOverlay) {
    return;
  }
  guideOverlay.classList.add('hidden');
}

function createBackgroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#243d7b');
  gradient.addColorStop(0.4, '#1b2f5d');
  gradient.addColorStop(0.75, '#0d1530');
  gradient.addColorStop(1, '#050812');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.28,
    0,
    canvas.width * 0.5,
    canvas.height * 0.28,
    canvas.width * 0.6
  );
  glow.addColorStop(0, 'rgba(255, 184, 108, 0.35)');
  glow.addColorStop(1, 'rgba(255, 184, 108, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}
