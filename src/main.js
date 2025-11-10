import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateBoard, ORIENTATION, GAME_STATUS, placeDomino } from './game/board.js';
import { buildBoardGroup, addDominoMesh } from './three/boardRenderer.js';
import { createWinnerBanner, updateWinnerBanner, disposeWinnerBanner } from './three/winnerBanner.js';
import { CompassOverlay } from './three/compassOverlay.js';

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
const statsElement = document.getElementById('board-stats');
const horizontalOrientationButton = document.getElementById('orientation-horizontal');
const verticalOrientationButton = document.getElementById('orientation-vertical');

const ORIENTATION_LABELS = {
  [ORIENTATION.HORIZONTAL]: 'Horizontal (Blue)',
  [ORIENTATION.VERTICAL]: 'Vertical (Red)',
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

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const hemiLight = new THREE.HemisphereLight(0x7aa8ff, 0x0b0f1c, 0.45);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let boardData = null;
let boardGroup = null;
let cellMeshes = [];
let customInactivePercentage = null;
let winnerBanner = null;
const compass = new CompassOverlay();

function init() {
  initDimensionSliders();
  regenerateBoard();
  window.addEventListener('resize', handleResize);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  regenerateButton.addEventListener('click', regenerateBoard);
  percentageSlider.addEventListener('input', handlePercentageChange);
  defaultPercentageButton.addEventListener('click', handleDefaultPercentage);
  rowSlider.addEventListener('input', handleDimensionChange);
  colSlider.addEventListener('input', handleDimensionChange);
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
  const seed = seedInput.value.trim() || undefined;

  boardData = generateBoard({
    rows,
    cols,
    seed,
    inactivePercentage: customInactivePercentage ?? undefined,
  });
  updateBoardGroup();
  updateOrientationDisplay();
  updateStats();
  syncWinnerBanner();
  updateCamera(rows, cols);
  compass.updateBoardSize(rows, cols);
}

function updateBoardGroup() {
  if (boardGroup) {
    scene.remove(boardGroup);
  }

  boardGroup = buildBoardGroup(boardData);
  cellMeshes = boardGroup.userData?.cellMeshes ?? [];
  scene.add(boardGroup);
}

function updateOrientationDisplay() {
  horizontalOrientationButton.classList.remove('active', 'winner');
  verticalOrientationButton.classList.remove('active', 'winner');

  if (!boardData) {
    return;
  }

  if (boardData.status === GAME_STATUS.FINISHED) {
    if (boardData.winner === ORIENTATION.HORIZONTAL) {
      horizontalOrientationButton.classList.add('winner');
    } else if (boardData.winner === ORIENTATION.VERTICAL) {
      verticalOrientationButton.classList.add('winner');
    }
    return;
  }

  if (boardData.currentPlayer === ORIENTATION.HORIZONTAL) {
    horizontalOrientationButton.classList.add('active');
  } else if (boardData.currentPlayer === ORIENTATION.VERTICAL) {
    verticalOrientationButton.classList.add('active');
  }
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

  let statusInfo = '';
  if (boardData.status === GAME_STATUS.FINISHED) {
    if (boardData.winner) {
      statusInfo = `Winner: <strong>${ORIENTATION_LABELS[boardData.winner]}</strong>`;
    } else {
      statusInfo = '<strong>Draw: No moves available for either player</strong>';
    }
  } else {
    statusInfo = `Current turn: <strong>${ORIENTATION_LABELS[boardData.currentPlayer]}</strong>`;
  }

  statsElement.innerHTML = `${baseInfo}<br />${modeInfo}<br />${statusInfo}`;
}

function updateCamera(rows, cols) {
  const maxDimension = Math.max(rows, cols);
  const distance = Math.max(10, maxDimension * 2.4);
  camera.position.set(distance, distance, distance);
  controls.target.set(0, 0, 0);
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
  regenerateBoard();
}

function handleDefaultPercentage() {
  customInactivePercentage = null;
  percentageSlider.value = '17';
  updatePercentageDisplay();
  regenerateBoard();
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
  regenerateBoard();
}

function updateDimensionDisplay() {
  rowValue.textContent = `${rowSlider.value}`;
  colValue.textContent = `${colSlider.value}`;
}

function handlePointerDown(event) {
  if (!boardGroup || !boardData || boardData.status !== GAME_STATUS.ACTIVE) {
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
  const hit = intersects.find((intersect) => intersect.object.userData && !intersect.object.userData.isInactive);

  if (!hit) {
    return;
  }

  const { row, col } = hit.object.userData;
  tryPlaceDomino(row, col);
}

function tryPlaceDomino(row, col) {
  const placement = placeDomino(boardData, { row, col });
  if (!placement) {
    return;
  }

  addDominoMesh(boardGroup, placement);
  updateOrientationDisplay();
  updateStats();
  syncWinnerBanner();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  compass.updateFromCamera(camera);
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
  texture.colorSpace = THREE.SRGBColorSpace ?? undefined;
  return texture;
}
