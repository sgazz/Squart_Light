import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateBoard, ORIENTATION, GAME_STATUS, placeDomino, countAvailableMoves } from './game/board.js';
import { buildBoardGroup, addDominoMesh } from './three/boardRenderer.js';
import { createWinnerBanner, updateWinnerBanner, disposeWinnerBanner } from './three/winnerBanner.js';
import {
  initializeCampaignProgress,
  getCampaignState,
  setNeighborhoodStatus,
  findNeighborhood,
  NEIGHBORHOOD_STATUS,
  EXTRA_CITY_ID,
  EXTRA_MISSION,
} from './story/campaign.js';

const canvasWrapper = document.getElementById('canvas-wrapper');
const canvas = document.getElementById('squart-canvas');
const rowSlider = document.getElementById('board-rows');
const rowValue = document.getElementById('board-rows-value');
const colSlider = document.getElementById('board-cols');
const colValue = document.getElementById('board-cols-value');
const seedInput = document.getElementById('seed-input');
const percentageSlider = document.getElementById('inactive-percentage');
const percentageValue = document.getElementById('inactive-percentage-value');
const regenerateButton = document.getElementById('regenerate-btn');
const defaultPercentageButton = document.getElementById('default-percentage-btn');
const guideButton = document.getElementById('guide-btn');
const turnIndicator = document.getElementById('turn-indicator');
const panelBoardSummary = document.getElementById('panel-board-summary');
const panelStorySummary = document.getElementById('panel-story-summary');
const panelBalanceSummary = document.getElementById('panel-balance-summary');
const boardFeedback = document.getElementById('board-feedback');
const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardingDismiss = document.getElementById('onboarding-dismiss');
const guideOverlay = document.getElementById('guide-overlay');
const guideDismiss = document.getElementById('guide-dismiss');
const storyButton = document.getElementById('story-btn');
const storyOverlay = document.getElementById('story-overlay');
const storyCloseButton = document.getElementById('story-close');
const storyCityList = document.getElementById('story-city-list');
const storyCityName = document.getElementById('story-city-name');
const storyCityDescription = document.getElementById('story-city-description');
const storyCityMeta = document.getElementById('story-city-meta');
const storyNeighborhoodGrid = document.getElementById('story-neighborhood-grid');
const storyMissionDetail = document.getElementById('story-mission-detail');
const storyMap = document.getElementById('story-map');
const storyBriefingOverlay = document.getElementById('story-briefing-overlay');
const storyBriefingTitle = document.getElementById('story-briefing-title');
const storyBriefingSubtitle = document.getElementById('story-briefing-subtitle');
const storyBriefingIntro = document.getElementById('story-briefing-intro');
const storyBriefingDetails = document.getElementById('story-briefing-details');
const storyBriefingStart = document.getElementById('story-briefing-start');
const storyBriefingCancel = document.getElementById('story-briefing-cancel');
const storyDebriefOverlay = document.getElementById('story-debrief-overlay');
const storyDebriefTitle = document.getElementById('story-debrief-title');
const storyDebriefSubtitle = document.getElementById('story-debrief-subtitle');
const storyDebriefSummary = document.getElementById('story-debrief-summary');
const storyDebriefNext = document.getElementById('story-debrief-next');
const storyDebriefContinue = document.getElementById('story-debrief-continue');
const pvpButton = document.getElementById('pvp-btn');
const pvpModeOverlay = document.getElementById('pvp-mode-overlay');
const pvpModeTitle = document.getElementById('pvp-mode-title');
const pvpModeDescription = document.getElementById('pvp-mode-description');
const pvpStartingPlayer = document.getElementById('pvp-starting-player');
const pvpModeStart = document.getElementById('pvp-mode-start');
const pvpModeCancel = document.getElementById('pvp-mode-cancel');
const aivpButton = document.getElementById('aivp-btn');
const aiModeOverlay = document.getElementById('ai-mode-overlay');
const aiModeTitle = document.getElementById('ai-mode-title');
const aiModeDescription = document.getElementById('ai-mode-description');
const aiPlayerSide = document.getElementById('ai-player-side');
const aiTurnOrder = document.getElementById('ai-turn-order');
const aiModeStart = document.getElementById('ai-mode-start');
const aiModeCancel = document.getElementById('ai-mode-cancel');

const ORIENTATION_LABELS = {
  [ORIENTATION.HORIZONTAL]: 'Horizontal (Blue)',
  [ORIENTATION.VERTICAL]: 'Vertical (Red)',
};

const BOARD_FEEDBACK_DURATION = 2200;
const REGENERATE_DEBOUNCE_MS = 250;
const ONBOARDING_KEY = 'squart:onboarding:v1';
const FAIRNESS_MAX_ABS_DIFF = 1;
const FAIRNESS_MAX_ATTEMPTS = 40;

const MAP_PIN_RADIUS = 9;
const MAP_THEME_GRADIENTS = {
  'neo-aurora': {
    inner: '#1a233d',
    outer: '#070c17',
    accent: '#4f7dff',
  },
  'solstice-haven': {
    inner: '#2f1f1a',
    outer: '#140905',
    accent: '#ffb84d',
  },
  'astral-frontier': {
    inner: '#1a2b2f',
    outer: '#050b0d',
    accent: '#63ffd5',
  },
  'final-showdown': {
    inner: '#341a2f',
    outer: '#0c030f',
    accent: '#ff6f6b',
  },
  default: {
    inner: '#222',
    outer: '#0b0b0b',
    accent: '#9fa9d1',
  },
};
const ORIENTATION_COLORS = {
  horizontal: '#4f7dff',
  vertical: '#ff6f6b',
  tie: '#ffd76a',
};
const ORIENTATION_STROKES = {
  horizontal: '#dce9ff',
  vertical: '#ffd6d4',
  tie: '#ffe8a6',
};

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
let storyState = null;
let selectedStoryCityId = null;
let selectedStoryNeighborhoodId = null;
let storyMissionConfig = null;
let pendingStoryMission = null;
let storyDebriefVisible = false;
let randomOrientationChoice = null;
let aiModeConfig = null;

function init() {
  initDimensionSliders();
  initStoryMode();
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
  if (storyOverlay) {
    storyOverlay.addEventListener('click', (event) => {
      if (event.target === storyOverlay) {
        hideStoryOverlay();
      }
    });
  }
  if (storyBriefingOverlay) {
    storyBriefingOverlay.addEventListener('click', (event) => {
      if (event.target === storyBriefingOverlay) {
        cancelStoryBriefing(true);
      }
    });
  }
  if (storyDebriefOverlay) {
    storyDebriefOverlay.addEventListener('click', (event) => {
      if (event.target === storyDebriefOverlay) {
        hideStoryDebrief(true);
      }
    });
  }
  if (storyBriefingStart) {
    storyBriefingStart.addEventListener('click', launchStoryMission);
  }
  if (storyBriefingCancel) {
    storyBriefingCancel.addEventListener('click', () => cancelStoryBriefing(true));
  }
  if (storyDebriefContinue) {
    storyDebriefContinue.addEventListener('click', () => hideStoryDebrief(true));
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
  if (pvpButton) {
    pvpButton.addEventListener('click', showPvpModeConfig);
  }
  if (pvpModeOverlay) {
    pvpModeOverlay.addEventListener('click', (event) => {
      if (event.target === pvpModeOverlay) {
        hidePvpModeConfig();
      }
    });
  }
  if (pvpModeStart) {
    pvpModeStart.addEventListener('click', startPvpModeGame);
  }
  if (pvpModeCancel) {
    pvpModeCancel.addEventListener('click', hidePvpModeConfig);
  }
  if (aivpButton) {
    aivpButton.addEventListener('click', () => showAiModeConfig('aivp'));
  }
  if (aiModeOverlay) {
    aiModeOverlay.addEventListener('click', (event) => {
      if (event.target === aiModeOverlay) {
        hideAiModeConfig();
      }
    });
  }
  if (aiModeStart) {
    aiModeStart.addEventListener('click', startAiModeGame);
  }
  if (aiModeCancel) {
    aiModeCancel.addEventListener('click', hideAiModeConfig);
  }
  showOnboardingIfNeeded();
  updatePercentageDisplay();
  handleResize();
  animate();
}

function initStoryMode() {
  storyState = initializeCampaignProgress();
  if (storyButton) {
    storyButton.addEventListener('click', showStoryOverlay);
  }
  if (storyCloseButton) {
    storyCloseButton.addEventListener('click', hideStoryOverlay);
  }
  refreshStoryState();
  renderStoryMode();
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
    layoutMask: storyMissionConfig?.mask ?? null,
  });

  boardData = board;
  if (storyMissionConfig) {
    boardData.storyMission = { ...storyMissionConfig };
  } else if (boardData.storyMission) {
    delete boardData.storyMission;
  }
  if (!storyMissionConfig && randomOrientationChoice) {
    applyRandomOrientationToBoard(true);
  } else if (boardData) {
    delete boardData.startingPlayerLabel;
  }
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
  if (boardData.status === GAME_STATUS.FINISHED) {
    handleStoryMissionComplete(boardData);
  }
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

  const simpleInactive = !storyMissionConfig;
  boardGroup = buildBoardGroup(boardData, { simpleInactive });
  cellMeshes = boardGroup.userData?.cellMeshes ?? [];
  scene.add(boardGroup);
  dominoAnimations.length = 0;
  inactiveAnimations.length = 0;
  queueInactiveWave(boardGroup, boardData);
}

function updateStats() {
  if (!panelBoardSummary) {
    return;
  }

  if (!boardData) {
    panelBoardSummary.textContent = 'Board —';
    if (panelStorySummary) {
      panelStorySummary.textContent = '';
      panelStorySummary.classList.add('hidden');
    }
    if (panelBalanceSummary) {
      panelBalanceSummary.textContent = '';
    }
    return;
  }

  const inactivePercentage =
    typeof boardData.actualInactivePercentage === 'number' ? boardData.actualInactivePercentage : 0;
  const summaryParts = [
    `Board ${boardData.cols} × ${boardData.rows}`,
    `Inactive ${inactivePercentage.toFixed(1)}%`,
  ];
  if (boardData.seed) {
    summaryParts.push(`Seed ${boardData.seed}`);
  }
  if (!storyMissionConfig && boardData.startingPlayerLabel) {
    summaryParts.push(`Start ${boardData.startingPlayerLabel}`);
  }
  panelBoardSummary.textContent = summaryParts.join(' • ');

  if (panelStorySummary) {
    if (boardData.storyMission) {
      const mission = boardData.storyMission;
      const missionName =
        mission.neighborhoodName ?? mission.neighborhoodId ?? mission.id ?? 'Story mission';
      const cityLabel = mission.cityName ? `${mission.cityName} — ${missionName}` : missionName;
      panelStorySummary.textContent = `Story mission: ${cityLabel}`;
      panelStorySummary.classList.remove('hidden');
    } else {
      panelStorySummary.textContent = '';
      panelStorySummary.classList.add('hidden');
    }
  }
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
  clearStoryMissionContext();
  updatePercentageDisplay();
  scheduleRegenerateBoard();
}

function handleDefaultPercentage() {
  customInactivePercentage = null;
  percentageSlider.value = '17';
  clearStoryMissionContext();
  updatePercentageDisplay();
  scheduleRegenerateBoard(true);
}

function updatePercentageDisplay() {
  const percent =
    customInactivePercentage === null ? '17–19%' : `${customInactivePercentage}%`;
  if (percentageValue) {
    percentageValue.textContent =
      customInactivePercentage === null ? 'Auto' : `${customInactivePercentage}%`;
  }
}

function handleDimensionChange() {
  clearStoryMissionContext();
  updateDimensionDisplay();
  scheduleRegenerateBoard();
}

function generateBalancedBoard({ rows, cols, seed, inactivePercentage, layoutMask }) {
  if (seed !== undefined) {
    const board = generateBoard({ rows, cols, seed, inactivePercentage, layoutMask });
    const stats = measureMoveBalance(board);
    return { board, stats, attempts: 1 };
  }

  let bestBoard = null;
  let bestStats = null;
  let bestDiff = Infinity;

  for (let attempt = 1; attempt <= FAIRNESS_MAX_ATTEMPTS; attempt += 1) {
    const board = generateBoard({ rows, cols, inactivePercentage, layoutMask });
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
  if (!panelBalanceSummary) {
    return;
  }

  if (!boardData) {
    panelBalanceSummary.textContent = '';
    return;
  }

  if (boardData.status === GAME_STATUS.FINISHED) {
    const resultText = boardData.winner
      ? `Winner: ${ORIENTATION_LABELS[boardData.winner]}`
      : 'Result: Draw';
    panelBalanceSummary.textContent = resultText;
    return;
  }

  const horizontalMoves = countAvailableMoves(boardData, ORIENTATION.HORIZONTAL);
  const verticalMoves = countAvailableMoves(boardData, ORIENTATION.VERTICAL);
  let summary = `Moves available: H ${horizontalMoves} • V ${verticalMoves}`;
  if (lastFairnessInfo) {
    if (lastFairnessInfo.diff === 0) {
      summary += ' • Balanced';
    } else {
      summary += ` • Δ ${lastFairnessInfo.diff}`;
    }
  }
  panelBalanceSummary.textContent = summary;
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

  if (boardData.aiMode?.enabled) {
    const isPlayerTurn =
      boardData.currentPlayer === boardData.aiMode.playerOrientation;
    const currentLabel = isPlayerTurn
      ? ORIENTATION_LABELS[boardData.aiMode.playerOrientation]
      : 'AI';
    turnIndicator.textContent = `${currentLabel} to move`;
    pulseTurnIndicator();
    return;
  }

  const label =
    boardData.currentPlayer === ORIENTATION.HORIZONTAL
      ? ORIENTATION_LABELS[ORIENTATION.HORIZONTAL]
      : ORIENTATION_LABELS[ORIENTATION.VERTICAL];
  const placementCount = boardData.placements?.length ?? 0;
  const starterSuffix =
    placementCount === 0 && boardData.startingPlayerLabel
      ? ` — ${boardData.startingPlayerLabel}`
      : '';
  turnIndicator.textContent = `${label} to move${starterSuffix}`;
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
  if (boardData.status === GAME_STATUS.FINISHED) {
    handleStoryMissionComplete(boardData);
  }
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
    case 's':
      showStoryOverlay();
      break;
    case 'g':
      showGuideOverlay();
      break;
    case 'escape':
      hideOnboarding(false);
      hideGuideOverlay();
      cancelStoryBriefing(false);
      hideStoryDebrief(false);
      hideStoryOverlay();
      hidePvpModeConfig();
      hideAiModeConfig();
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

function showStoryOverlay() {
  if (!storyOverlay) {
    return;
  }
  refreshStoryState();
  renderStoryMode();
  storyOverlay.classList.remove('hidden');
}

function hideStoryOverlay() {
  if (!storyOverlay) {
    return;
  }
  storyOverlay.classList.add('hidden');
}

function refreshStoryState() {
  storyState = getCampaignState();
  const cities = storyState?.cities ?? [];
  const extra = storyState?.extraMission ?? null;
  const hasCities = cities.length > 0;
  const extraUnlocked = Boolean(extra?.unlocked);

  if (!hasCities && !extraUnlocked) {
    selectedStoryCityId = null;
    selectedStoryNeighborhoodId = null;
    return;
  }

  const citySelectedAndUnlocked = cities.some(
    (city) => city.id === selectedStoryCityId && city.unlocked
  );
  const extraSelected = selectedStoryCityId === EXTRA_CITY_ID;
  const extraAvailable = extraUnlocked && extra.status !== NEIGHBORHOOD_STATUS.LOCKED;

  if (extraSelected) {
    if (extraAvailable) {
      if (!selectedStoryNeighborhoodId) {
        selectedStoryNeighborhoodId = EXTRA_MISSION.id;
      }
      return;
    }
    selectedStoryCityId = null;
    selectedStoryNeighborhoodId = null;
  }

  if (citySelectedAndUnlocked) {
    return;
  }

  const fallbackCity = cities.find((city) => city.unlocked) ?? cities[0] ?? null;
  if (fallbackCity) {
    selectedStoryCityId = fallbackCity.id;
    selectedStoryNeighborhoodId = null;
    return;
  }

  if (extraAvailable) {
    selectedStoryCityId = EXTRA_CITY_ID;
    selectedStoryNeighborhoodId = EXTRA_MISSION.id;
    return;
  }

  selectedStoryCityId = null;
  selectedStoryNeighborhoodId = null;
}

function renderStoryMode() {
  renderStoryCityList();
  renderStoryCityDetail();
}

function renderStoryCityList() {
  if (!storyCityList || !storyState) {
    return;
  }
  storyCityList.innerHTML = '';

  if (!storyState.cities || storyState.cities.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.id = 'story-city-empty';
    emptyMessage.textContent = 'No cities defined yet.';
    storyCityList.appendChild(emptyMessage);
    return;
  }

  storyState.cities.forEach((city) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-city-button';
    if (city.id === selectedStoryCityId) {
      button.classList.add('active');
    }

    const title = document.createElement('span');
    title.className = 'story-city-title';
    title.textContent = city.name;
    button.appendChild(title);

    const progress = document.createElement('span');
    progress.className = 'story-progress';
    if (!city.unlocked) {
      progress.textContent = 'Locked — complete previous city';
      button.disabled = true;
    } else {
      if (city.completed && city.cityWinner) {
        progress.textContent = `Completed — Winner: ${getCityWinnerLabel(city.cityWinner)}`;
      } else {
        progress.textContent = `${city.completedCount}/${city.totalCount} completed`;
      }
      button.addEventListener('click', () => selectStoryCity(city.id));
    }
    button.appendChild(progress);

    storyCityList.appendChild(button);
  });

  const extra = storyState.extraMission;
  if (extra?.unlocked) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-city-button bonus-city-button';
    if (selectedStoryCityId === EXTRA_CITY_ID) {
      button.classList.add('active');
    }

    const title = document.createElement('span');
    title.className = 'story-city-title';
    title.textContent = 'Extra Mission';
    button.appendChild(title);

    const progress = document.createElement('span');
    progress.className = 'story-progress';
    if (extra.status === NEIGHBORHOOD_STATUS.COMPLETED && extra.winner) {
      progress.textContent = `Completed — Winner: ${getCityWinnerLabel(extra.winner)}`;
    } else if (extra.status === NEIGHBORHOOD_STATUS.COMPLETED) {
      progress.textContent = 'Completed';
    } else {
      progress.textContent = 'Tie-breaker available';
    }
    button.appendChild(progress);

    if (extra.status !== NEIGHBORHOOD_STATUS.LOCKED) {
      button.addEventListener('click', () => selectStoryCity(EXTRA_CITY_ID));
    } else {
      button.disabled = true;
    }

    storyCityList.appendChild(button);
  }
}

function selectStoryCity(cityId) {
  if (selectedStoryCityId === cityId) {
    return;
  }
  selectedStoryCityId = cityId;
  selectedStoryNeighborhoodId = cityId === EXTRA_CITY_ID ? EXTRA_MISSION.id : null;
  renderStoryMode();
}

function renderStoryCityDetail() {
  if (!storyState) {
    return;
  }
  const isExtraCity = selectedStoryCityId === EXTRA_CITY_ID;
  const city = isExtraCity
    ? getExtraMissionCity(storyState.extraMission)
    : storyState.cities?.find((item) => item.id === selectedStoryCityId) ?? null;

  if (!storyCityName || !storyCityDescription || !storyNeighborhoodGrid) {
    return;
  }

  if (!city) {
    storyCityName.textContent = 'Select a city';
    storyCityDescription.textContent = 'Choose a city to review its quarters and start a mission.';
    if (storyMap) {
      storyMap.textContent = 'City map';
    }
    if (storyCityMeta) {
      const cityStatus = document.getElementById('story-city-status');
      if (cityStatus) {
        cityStatus.textContent = '';
        cityStatus.classList.add('hidden');
      }
    }
    storyNeighborhoodGrid.innerHTML = '';
    renderStoryMissionDetail(null, null);
    return;
  }

  storyCityName.textContent = city.name;
  storyCityDescription.textContent = city.description;
  if (storyCityMeta) {
    let cityStatus = document.getElementById('story-city-status');
    if (!cityStatus) {
      cityStatus = document.createElement('p');
      cityStatus.id = 'story-city-status';
      cityStatus.className = 'story-subtitle';
      storyCityMeta.appendChild(cityStatus);
    }
    if (city.completed && city.cityWinner) {
      const winnerLabel = getCityWinnerLabel(city.cityWinner);
      const statusText =
        city.cityWinner === 'tie'
          ? `City outcome: Draw`
          : `City winner: ${winnerLabel}`;
      cityStatus.textContent = statusText;
      cityStatus.classList.remove('hidden');
    } else if (cityStatus) {
      cityStatus.textContent = '';
      cityStatus.classList.add('hidden');
    }
  }
  if (storyMap) {
    renderStoryMap(city, selectedStoryNeighborhoodId);
  }

  storyNeighborhoodGrid.innerHTML = '';

  if (
    !selectedStoryNeighborhoodId ||
    !city.neighborhoods.some((hood) => hood.id === selectedStoryNeighborhoodId)
  ) {
    const firstAccessible = city.neighborhoods.find(
      (hood) => hood.status !== NEIGHBORHOOD_STATUS.LOCKED
    );
    selectedStoryNeighborhoodId = firstAccessible ? firstAccessible.id : null;
  }

  city.neighborhoods.forEach((hood) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'neighborhood-card';
    if (hood.id === selectedStoryNeighborhoodId) {
      card.classList.add('selected');
    }
    if (hood.status === NEIGHBORHOOD_STATUS.LOCKED) {
      card.classList.add('locked');
      card.disabled = true;
    } else {
      card.addEventListener('click', () => selectStoryNeighborhood(city.id, hood.id));
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'neighborhood-name';
    nameEl.textContent = hood.name;
    card.appendChild(nameEl);

    const statusEl = document.createElement('span');
    statusEl.className = `neighborhood-status ${getNeighborhoodStatusClass(hood.status)}`;
    statusEl.textContent = getNeighborhoodStatusLabel(hood.status);
    card.appendChild(statusEl);

    storyNeighborhoodGrid.appendChild(card);
  });

  const selectedNeighborhood =
    city.neighborhoods.find((hood) => hood.id === selectedStoryNeighborhoodId) ?? null;
  renderStoryMissionDetail(city, selectedNeighborhood);
}

function selectStoryNeighborhood(cityId, neighborhoodId) {
  if (selectedStoryNeighborhoodId === neighborhoodId) {
    return;
  }
  selectedStoryCityId = cityId;
  selectedStoryNeighborhoodId = neighborhoodId;
  renderStoryMode();
}

function renderStoryMissionDetail(city, neighborhood) {
  if (!storyMissionDetail) {
    return;
  }
  storyMissionDetail.innerHTML = '';

  if (!city || !neighborhood) {
    const empty = document.createElement('p');
    empty.id = 'story-empty-state';
    empty.textContent = 'Select an available quarter to review mission details.';
    storyMissionDetail.appendChild(empty);
    return;
  }

  const title = document.createElement('h4');
  title.textContent = neighborhood.name;
  storyMissionDetail.appendChild(title);

  const intro = document.createElement('p');
  intro.textContent = neighborhood.intro ?? 'Prepare to secure this quarter.';
  storyMissionDetail.appendChild(intro);

  const metaList = document.createElement('ul');
  metaList.id = 'story-mission-meta';

  const sizeItem = document.createElement('li');
  sizeItem.textContent = `Board size: ${neighborhood.cols} × ${neighborhood.rows}`;
  metaList.appendChild(sizeItem);

  if (typeof neighborhood.inactivePercentage === 'number') {
    const inactiveItem = document.createElement('li');
    inactiveItem.textContent = `Inactive target: ${neighborhood.inactivePercentage}%`;
    metaList.appendChild(inactiveItem);
  }

  if (neighborhood.recommendedSeed) {
    const seedItem = document.createElement('li');
    seedItem.textContent = `Recommended seed: ${neighborhood.recommendedSeed}`;
    metaList.appendChild(seedItem);
  }

  if (neighborhood.mask) {
    const maskItem = document.createElement('li');
    maskItem.textContent = 'Custom layout mask enabled';
    metaList.appendChild(maskItem);
  }

  storyMissionDetail.appendChild(metaList);

  const actionButton = document.createElement('button');
  actionButton.id = 'story-start-btn';
  actionButton.type = 'button';
  actionButton.textContent =
    neighborhood.status === NEIGHBORHOOD_STATUS.COMPLETED ? 'Replay Mission' : 'Start Mission';
  actionButton.addEventListener('click', () => startStoryMission(city, neighborhood));
  storyMissionDetail.appendChild(actionButton);
}

function renderStoryMap(city, focusedNeighborhoodId) {
  if (!storyMap) {
    return;
  }

  const { mapMeta, neighborhoods } = city;
  if (!mapMeta || !mapMeta.size) {
    storyMap.textContent = `${city.name} map`;
    return;
  }

  const { width, height } = mapMeta.size;
  const canvasId = 'story-map-canvas';
  let canvas = storyMap.querySelector(`#${canvasId}`);
  if (!canvas) {
    storyMap.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.className = 'story-map-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    storyMap.appendChild(canvas);
  }

  const deviceRatio = window.devicePixelRatio || 1;
  canvas.width = width * deviceRatio;
  canvas.height = height * deviceRatio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(deviceRatio, deviceRatio);
  ctx.clearRect(0, 0, width, height);

  drawMapBackground(ctx, width, height, mapMeta.theme ?? 'default');
  drawMapContours(ctx, width, height, mapMeta.theme ?? 'default');
  drawNeighborhoodPins(ctx, neighborhoods, focusedNeighborhoodId);

  canvas.onclick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    const hit = hitTestNeighborhoodPin(neighborhoods, x, y);
    if (hit && hit.status !== NEIGHBORHOOD_STATUS.LOCKED) {
      selectStoryNeighborhood(city.id, hit.id);
    }
  };
}

function drawMapBackground(ctx, width, height, themeKey) {
  const theme = MAP_THEME_GRADIENTS[themeKey] ?? MAP_THEME_GRADIENTS.default;
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.45, Math.min(width, height) * 0.15, width * 0.5, height * 0.55, Math.max(width, height) * 0.6);
  gradient.addColorStop(0, theme.inner);
  gradient.addColorStop(1, theme.outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.globalAlpha = 1;
}

function drawMapContours(ctx, width, height, themeKey) {
  const theme = MAP_THEME_GRADIENTS[themeKey] ?? MAP_THEME_GRADIENTS.default;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.25;

  const contourCount = 3;
  for (let i = 0; i < contourCount; i += 1) {
    const inset = 18 + i * 12;
    drawRoundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 18);
  }

  ctx.globalAlpha = 1;
}

function drawRoundedRect(ctx, x, y, rectWidth, rectHeight, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + rectWidth - radius, y);
  ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
  ctx.lineTo(x + rectWidth, y + rectHeight - radius);
  ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
  ctx.lineTo(x + radius, y + rectHeight);
  ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.stroke();
}

function drawNeighborhoodPins(ctx, neighborhoods, focusedNeighborhoodId) {
  neighborhoods.forEach((hood) => {
    const { mapPosition } = hood;
    if (!mapPosition) {
      return;
    }
    const { fill, stroke, pulse } = getPinColors(hood, focusedNeighborhoodId);

    if (pulse) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(mapPosition.x, mapPosition.y, MAP_PIN_RADIUS * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(mapPosition.x, mapPosition.y, MAP_PIN_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.arc(mapPosition.x, mapPosition.y, MAP_PIN_RADIUS - 2, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function getPinColors(neighborhood, focusedNeighborhoodId) {
  if (neighborhood.status === NEIGHBORHOOD_STATUS.COMPLETED) {
    const winnerKey = neighborhood.winner ?? 'tie';
    const fill = ORIENTATION_COLORS[winnerKey] ?? '#ffd76a';
    const stroke = ORIENTATION_STROKES[winnerKey] ?? '#ffe8a6';
    return { fill, stroke, pulse: false };
  }
  if (neighborhood.status === NEIGHBORHOOD_STATUS.AVAILABLE) {
    const isFocused = neighborhood.id === focusedNeighborhoodId;
    return {
      fill: isFocused ? '#63ffd5' : '#1dd4a7',
      stroke: '#e8fff6',
      pulse: true,
    };
  }
  return { fill: '#4f5466', stroke: '#2b2f3f', pulse: false };
}

function hitTestNeighborhoodPin(neighborhoods, x, y) {
  for (let i = 0; i < neighborhoods.length; i += 1) {
    const hood = neighborhoods[i];
    if (!hood.mapPosition) {
      continue;
    }
    const dx = x - hood.mapPosition.x;
    const dy = y - hood.mapPosition.y;
    if (dx * dx + dy * dy <= MAP_PIN_RADIUS * MAP_PIN_RADIUS) {
      return hood;
    }
  }
  return null;
}

function startStoryMission(city, neighborhood) {
  if (!city || !neighborhood) {
    return;
  }

  pendingStoryMission = { city, neighborhood };
  hideStoryOverlay();
  showStoryBriefing();
}

function launchStoryMission() {
  if (!pendingStoryMission) {
    return;
  }

  const { city, neighborhood } = pendingStoryMission;

  rowSlider.value = String(neighborhood.rows);
  colSlider.value = String(neighborhood.cols);
  updateDimensionDisplay();

  if (typeof neighborhood.inactivePercentage === 'number') {
    customInactivePercentage = neighborhood.inactivePercentage;
    percentageSlider.value = String(neighborhood.inactivePercentage);
  } else {
    customInactivePercentage = null;
    percentageSlider.value = '17';
  }
  updatePercentageDisplay();

  if (neighborhood.recommendedSeed) {
    seedInput.value = neighborhood.recommendedSeed;
  } else {
    seedInput.value = '';
  }

  storyMissionConfig = {
    cityId: city.id,
    cityName: city.name,
    neighborhoodId: neighborhood.id,
    neighborhoodName: neighborhood.name,
    mask: neighborhood.mask ?? null,
  };

  hideStoryBriefing(false);
  pendingStoryMission = null;
  storyDebriefVisible = false;
  showFeedback(`Mission "${neighborhood.name}" loaded.`, 'info', 1600);
  scheduleRegenerateBoard(true);
}

function cancelStoryBriefing(reopenStoryPanel = false) {
  pendingStoryMission = null;
  hideStoryBriefing(reopenStoryPanel);
}

function clearStoryMissionContext() {
  storyMissionConfig = null;
  pendingStoryMission = null;
  storyDebriefVisible = false;
  hideStoryBriefing(false);
  hideStoryDebrief(false);
}

function showStoryBriefing() {
  if (!storyBriefingOverlay || !pendingStoryMission) {
    return;
  }

  const { city, neighborhood } = pendingStoryMission;
  if (storyBriefingTitle) {
    storyBriefingTitle.textContent = 'Mission Briefing';
  }
  if (storyBriefingSubtitle) {
    storyBriefingSubtitle.textContent = `${city.name} · ${neighborhood.name}`;
  }
  if (storyBriefingIntro) {
    storyBriefingIntro.textContent = neighborhood.intro ?? 'Prepare to secure this quarter of the city.';
  }
  if (storyBriefingDetails) {
    storyBriefingDetails.innerHTML = '';
    const details = [
      `Board size: ${neighborhood.cols} × ${neighborhood.rows}`,
    ];
    if (typeof neighborhood.inactivePercentage === 'number') {
      details.push(`Inactive target: ${neighborhood.inactivePercentage}%`);
    }
    if (neighborhood.recommendedSeed) {
      details.push(`Recommended seed: ${neighborhood.recommendedSeed}`);
    }
    if (neighborhood.mask) {
      details.push('Custom layout mask: enabled');
    }
    details.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      storyBriefingDetails.appendChild(item);
    });
  }

  storyBriefingOverlay.classList.remove('hidden');
}

function hideStoryBriefing(reopenStoryPanel = false) {
  if (!storyBriefingOverlay) {
    return;
  }
  storyBriefingOverlay.classList.add('hidden');
  if (reopenStoryPanel) {
    showStoryOverlay();
  }
}

function showStoryDebrief({ board, city, neighborhood }) {
  if (!storyDebriefOverlay || storyDebriefVisible) {
    return;
  }

  storyDebriefVisible = true;

  const winnerLabel = board.winner ? ORIENTATION_LABELS[board.winner] : null;
  const outcomeTitle = board.winner
    ? `${winnerLabel} prevailed`
    : 'Stalemate reported';
  if (storyDebriefTitle) {
    storyDebriefTitle.textContent = outcomeTitle;
  }

  if (storyDebriefSubtitle) {
    const cityName = city?.name ?? board.storyMission?.cityName ?? 'Unknown City';
    const neighborhoodName =
      neighborhood?.name ?? board.storyMission?.neighborhoodName ?? 'Quarter';
    storyDebriefSubtitle.textContent = `${cityName} · ${neighborhoodName}`;
  }

  if (storyDebriefSummary) {
    const neighborhoodName =
      neighborhood?.name ?? board.storyMission?.neighborhoodName ?? 'the quarter';
    if (board.winner) {
      storyDebriefSummary.textContent = `${winnerLabel} secured ${neighborhoodName}.`;
    } else {
      storyDebriefSummary.textContent = `The battle for ${neighborhoodName} ended in a draw.`;
    }
  }

  if (storyDebriefNext) {
    let nextMessage = '';
    if (!board.winner) {
      nextMessage = 'Replay the mission to claim this quarter for the city.';
    } else if (city) {
      const nextNeighborhood = city.neighborhoods.find(
        (hood) => hood.status === NEIGHBORHOOD_STATUS.AVAILABLE
      );
      if (nextNeighborhood) {
        nextMessage = `Next target unlocked: ${nextNeighborhood.name} is now available.`;
      } else {
        const alternateCity = storyState?.cities?.find(
          (candidate) =>
            candidate.id !== city.id &&
            candidate.unlocked &&
            candidate.availableCount > 0
        );
        if (alternateCity) {
          nextMessage = `${alternateCity.name} now has quarters ready for deployment.`;
        } else {
          nextMessage = 'All currently unlocked quarters are secured. Await further directives.';
        }
      }
    } else {
      nextMessage = 'Review city intel to choose your next objective.';
    }
    if (city?.completed && city.cityWinner) {
      const cityMessage = getCityWinnerMessage(city.name, city.cityWinner);
      nextMessage = nextMessage ? `${nextMessage} ${cityMessage}` : cityMessage;
    }
    storyDebriefNext.textContent = nextMessage;
  }

  storyDebriefOverlay.classList.remove('hidden');
}

function hideStoryDebrief(reopenStoryPanel = false) {
  if (!storyDebriefOverlay) {
    return;
  }
  storyDebriefOverlay.classList.add('hidden');
  storyDebriefVisible = false;
  if (reopenStoryPanel) {
    showStoryOverlay();
  }
}

function handleStoryMissionComplete(board) {
  if (!board?.storyMission || storyDebriefVisible) {
    return;
  }

  const { cityId, neighborhoodId } = board.storyMission;
  if (board.winner) {
    setNeighborhoodStatus(cityId, neighborhoodId, NEIGHBORHOOD_STATUS.COMPLETED, { winner: board.winner });
  }
  refreshStoryState();
  const located = findNeighborhood(cityId, neighborhoodId);
  const city = located?.city ?? null;
  const neighborhood = located?.neighborhood ?? null;
  showStoryDebrief({ board, city, neighborhood });
}

function getNeighborhoodStatusClass(status) {
  switch (status) {
    case NEIGHBORHOOD_STATUS.AVAILABLE:
      return 'status-available';
    case NEIGHBORHOOD_STATUS.COMPLETED:
      return 'status-completed';
    default:
      return 'status-locked';
  }
}

function getNeighborhoodStatusLabel(status) {
  switch (status) {
    case NEIGHBORHOOD_STATUS.AVAILABLE:
      return 'Available';
    case NEIGHBORHOOD_STATUS.COMPLETED:
      return 'Completed';
    default:
      return 'Locked';
  }
}

function getCityWinnerLabel(winnerKey) {
  switch (winnerKey) {
    case 'horizontal':
      return ORIENTATION_LABELS[ORIENTATION.HORIZONTAL];
    case 'vertical':
      return ORIENTATION_LABELS[ORIENTATION.VERTICAL];
    case 'tie':
      return 'Draw';
    default:
      return '';
  }
}

function getCityWinnerMessage(cityName, winnerKey) {
  if (winnerKey === 'horizontal' || winnerKey === 'vertical') {
    return `${getCityWinnerLabel(winnerKey)} now controls ${cityName}.`;
  }
  if (winnerKey === 'tie') {
    return `${cityName} remains contested (draw).`;
  }
  return '';
}

function getExtraMissionCity(extraMission) {
  if (!extraMission || !extraMission.unlocked) {
    return null;
  }
  const missionStatus = extraMission.status ?? NEIGHBORHOOD_STATUS.LOCKED;
  const missionWinner = extraMission.winner ?? null;
  const neighborhood = {
    id: EXTRA_MISSION.id,
    name: EXTRA_MISSION.name,
    intro: EXTRA_MISSION.intro,
    rows: EXTRA_MISSION.rows,
    cols: EXTRA_MISSION.cols,
    inactivePercentage: EXTRA_MISSION.inactivePercentage,
    mask: EXTRA_MISSION.mask,
    recommendedSeed: EXTRA_MISSION.recommendedSeed,
    mapPosition: EXTRA_MISSION.mapPosition,
    status: missionStatus,
    winner: missionWinner,
  };
  return {
    id: EXTRA_CITY_ID,
    name: EXTRA_MISSION.name,
    description: EXTRA_MISSION.description,
    mapMeta: EXTRA_MISSION.mapMeta,
    completed: missionStatus === NEIGHBORHOOD_STATUS.COMPLETED,
    cityWinner: missionWinner,
    neighborhoods: [neighborhood],
  };
}

function handleRandomOrientation() {
  if (storyMissionConfig) {
    if (turnIndicator) {
      turnIndicator.textContent = 'Story mission enforces starting team.';
    }
    return;
  }
  const orientation =
    Math.random() < 0.5 ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
  const player = Math.random() < 0.5 ? 'P1' : 'P2';
  randomOrientationChoice = { orientation, player };
  const orientationName = orientation === ORIENTATION.HORIZONTAL ? 'Horizontal' : 'Vertical';
  const displayText = `${orientationName}-${player}`;
  showFeedback(`Starting orientation: ${displayText}`, 'info', 1400);
  applyRandomOrientationToBoard();
  updateStats();
  updateRemainingMoves();
}

function applyRandomOrientationToBoard(force = false) {
  if (!randomOrientationChoice || !boardData || storyMissionConfig) {
    return;
  }
  if (boardData.status !== GAME_STATUS.ACTIVE) {
    if (!force) {
      return;
    }
    boardData.status = GAME_STATUS.ACTIVE;
    boardData.winner = null;
  }
  const placementCount = boardData.placements?.length ?? 0;
  if (!force && placementCount > 0) {
    return;
  }
  boardData.currentPlayer = randomOrientationChoice.orientation;
  boardData.startingPlayerLabel = randomOrientationChoice.player;
  updateTurnIndicator();
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

function showPvpModeConfig() {
  if (!pvpModeOverlay || !pvpModeTitle || !pvpModeDescription) {
    return;
  }

  pvpModeTitle.textContent = 'Configure PvP Game';
  pvpModeDescription.textContent = 'Choose starting player';
  if (pvpStartingPlayer) {
    pvpStartingPlayer.value = 'random';
  }

  pvpModeOverlay.classList.remove('hidden');
}

function hidePvpModeConfig() {
  if (!pvpModeOverlay) {
    return;
  }
  pvpModeOverlay.classList.add('hidden');
}

function startPvpModeGame() {
  if (!pvpStartingPlayer || !boardData) {
    return;
  }

  const startingPlayer = pvpStartingPlayer.value;

  if (boardData.status !== GAME_STATUS.ACTIVE) {
    boardData.status = GAME_STATUS.ACTIVE;
    boardData.winner = null;
  }

  if (startingPlayer === 'random') {
    const orientation =
      Math.random() < 0.5 ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
    const player = Math.random() < 0.5 ? 'P1' : 'P2';
    randomOrientationChoice = { orientation, player };
    boardData.currentPlayer = orientation;
    boardData.startingPlayerLabel = player;
  } else {
    const orientation =
      startingPlayer === 'horizontal' ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
    boardData.currentPlayer = orientation;
    delete boardData.startingPlayerLabel;
  }

  if (boardData.aiMode) {
    delete boardData.aiMode;
  }

  updateTurnIndicator();
  hidePvpModeConfig();
  showFeedback('PvP game started.', 'success', 1500);
}

function showAiModeConfig(mode) {
  if (!aiModeOverlay || !aiModeTitle || !aiModeDescription) {
    return;
  }

  aiModeConfig = { mode };

  aiModeTitle.textContent = 'Play vs AI';
  aiModeDescription.textContent = 'Choose your side and turn order.';
  if (aiTurnOrder) {
    aiTurnOrder.value = 'first';
  }

  aiModeOverlay.classList.remove('hidden');
}

function hideAiModeConfig() {
  if (!aiModeOverlay) {
    return;
  }
  aiModeOverlay.classList.add('hidden');
  aiModeConfig = null;
}

function startAiModeGame() {
  if (!aiModeConfig || !aiPlayerSide || !aiTurnOrder || !boardData) {
    return;
  }

  const playerSide = aiPlayerSide.value;
  const turnOrder = aiTurnOrder.value;

  const playerOrientation =
    playerSide === 'horizontal' ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
  const aiOrientation =
    playerSide === 'horizontal' ? ORIENTATION.VERTICAL : ORIENTATION.HORIZONTAL;

  const startingOrientation = turnOrder === 'first' ? playerOrientation : aiOrientation;

  if (boardData.status !== GAME_STATUS.ACTIVE) {
    boardData.status = GAME_STATUS.ACTIVE;
    boardData.winner = null;
  }

  boardData.currentPlayer = startingOrientation;
  boardData.aiMode = {
    enabled: true,
    playerOrientation,
    aiOrientation,
    playerStarts: turnOrder === 'first',
  };

  updateTurnIndicator();
  hideAiModeConfig();
  showFeedback(
    `AI Mode: You play as ${ORIENTATION_LABELS[playerOrientation]}, ${turnOrder === 'first' ? 'you start' : 'AI starts'}.`,
    'info',
    2000
  );
}
