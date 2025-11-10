import * as THREE from 'three';

const CELL_SIZE = 1;
const CELL_HEIGHT = 0.2;
const INACTIVE_HEIGHT_MULTIPLIER = 2.4;
const ACTIVE_COLOR = 0xe6ebff;
const INACTIVE_COLOR = 0x1c2340;
const GRID_COLOR = 0x9fa9d1;
const HORIZONTAL_DOMINO_COLOR = 0x1f6feb;
const VERTICAL_DOMINO_COLOR = 0xd73a49;

const activeMaterial = new THREE.MeshStandardMaterial({ color: ACTIVE_COLOR });
const inactiveMaterial = new THREE.MeshStandardMaterial({
  color: INACTIVE_COLOR,
  metalness: 0.18,
  roughness: 0.45,
});
const horizontalDominoMaterial = new THREE.MeshStandardMaterial({ color: HORIZONTAL_DOMINO_COLOR });
const verticalDominoMaterial = new THREE.MeshStandardMaterial({ color: VERTICAL_DOMINO_COLOR });

const DOMINO_DIMENSIONS = {
  horizontal: { width: CELL_SIZE * 1.95, height: CELL_HEIGHT * 1.2, depth: CELL_SIZE * 0.95 },
  vertical: { width: CELL_SIZE * 0.95, height: CELL_HEIGHT * 1.2, depth: CELL_SIZE * 1.95 },
};

const DOMINO_MATERIALS = {
  horizontal: horizontalDominoMaterial,
  vertical: verticalDominoMaterial,
};

export function buildBoardGroup(board) {
  const group = new THREE.Group();
  group.name = 'squart-board';

  const width = board.cols * CELL_SIZE;
  const depth = board.rows * CELL_SIZE;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.1, 0.05, depth + 0.1),
    new THREE.MeshStandardMaterial({ color: GRID_COLOR })
  );
  base.position.y = -0.05;
  base.receiveShadow = true;
  group.add(base);

  const activeGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.95, CELL_HEIGHT, CELL_SIZE * 0.95);
  activeGeometry.translate(0, CELL_HEIGHT / 2, 0);

  const inactiveHeight = CELL_HEIGHT * INACTIVE_HEIGHT_MULTIPLIER;
  const inactiveGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.95, inactiveHeight, CELL_SIZE * 0.95);
  inactiveGeometry.translate(0, inactiveHeight / 2, 0);

  const xOffset = (board.cols - 1) * CELL_SIZE * 0.5;
  const zOffset = (board.rows - 1) * CELL_SIZE * 0.5;

  const cellMeshes = [];
  const inactiveWaveTargets = [];

  board.cells.forEach((rowCells, rowIndex) => {
    rowCells.forEach((cell, colIndex) => {
      const isInactive = cell.isInactive;
      const geometry = isInactive ? inactiveGeometry : activeGeometry;
      const material = isInactive ? inactiveMaterial : activeMaterial;
      const mesh = isInactive
        ? createBuildingMesh({
            geometry: inactiveGeometry,
            bodyMaterial: inactiveMaterial,
            row: cell.row,
            col: cell.col,
            scale: 1,
          })
        : new THREE.Mesh(activeGeometry, activeMaterial);
      mesh.position.set(colIndex * CELL_SIZE - xOffset, 0, rowIndex * CELL_SIZE - zOffset);
      mesh.userData = { row: cell.row, col: cell.col, isInactive: cell.isInactive };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (isInactive) {
        const buildingBody = mesh.userData?.buildingBody ?? mesh;
        const initialScale = 0.05;
        const targetScale = 1;
        buildingBody.scale.y = initialScale;
        buildingBody.position.y = 0;
        inactiveWaveTargets.push({
          mesh: buildingBody,
          row: cell.row,
          col: cell.col,
          initialScale,
          targetScale,
          height: inactiveHeight,
        });
      }
      cellMeshes.push(mesh);
      group.add(mesh);
    });
  });

  const dominoGroup = new THREE.Group();
  dominoGroup.name = 'domino-group';
  group.add(dominoGroup);

  group.userData = {
    cellMeshes,
    dominoGroup,
    offsets: { xOffset, zOffset },
    cellDimensions: {
      cellSize: CELL_SIZE,
      activeHeight: CELL_HEIGHT,
      inactiveHeight,
      maxCellHeight: Math.max(CELL_HEIGHT, inactiveHeight),
    },
    inactiveWaveTargets,
  };

  return group;
}

export function refreshBoardGroup(group, board) {
  const { cellMeshes } = group.userData ?? {};
  const inactiveHeight = group.userData?.cellDimensions?.inactiveHeight ?? CELL_HEIGHT * INACTIVE_HEIGHT_MULTIPLIER;
  const inactiveTargets = group.userData?.inactiveWaveTargets ?? [];
  inactiveTargets.length = 0;
  if (!cellMeshes) {
    return;
  }

  cellMeshes.forEach((mesh) => {
    const { row, col } = mesh.userData;
    const cell = board.cells[row][col];
    mesh.userData.isInactive = cell.isInactive;
    if (cell.isInactive) {
      const buildingBody = mesh.userData?.buildingBody;
      updateBuildingWindows(mesh, cell.row, cell.col);
      if (buildingBody) {
        const initialScale = 0.05;
        const targetScale = 1;
        buildingBody.scale.y = initialScale;
        buildingBody.position.y = 0;
        inactiveTargets.push({
          mesh: buildingBody,
          row: cell.row,
          col: cell.col,
          initialScale,
          targetScale,
          height: inactiveHeight,
        });
      }
    } else {
      mesh.scale.y = 1;
      mesh.position.y = 0;
    }
  });
}

export function addDominoMesh(group, placement) {
  const { dominoGroup, offsets } = group.userData ?? {};
  if (!dominoGroup || !offsets) {
    return;
  }

  const dimensions = DOMINO_DIMENSIONS[placement.orientation];
  const material = DOMINO_MATERIALS[placement.orientation];
  if (!dimensions || !material) {
    return;
  }

  const geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
  geometry.translate(0, CELL_HEIGHT / 2, 0);

  const mesh = new THREE.Mesh(geometry, material);
  const [first, second] = placement.positions;
  const x1 = first.col * CELL_SIZE - offsets.xOffset;
  const z1 = first.row * CELL_SIZE - offsets.zOffset;
  const x2 = second.col * CELL_SIZE - offsets.xOffset;
  const z2 = second.row * CELL_SIZE - offsets.zOffset;
  mesh.position.set((x1 + x2) / 2, CELL_HEIGHT + 0.05, (z1 + z2) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { placement };
  mesh.scale.setScalar(0.1);
  dominoGroup.add(mesh);
  return mesh;
}

function createBuildingMesh({ geometry, bodyMaterial, row, col, scale = 1 }) {
  const building = new THREE.Group();

  const body = new THREE.Mesh(geometry, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = 0;
  body.scale.y = scale;
  building.add(body);

  building.userData = {
    buildingBody: body,
    dimensions: geometry.parameters,
    row,
    col,
    seed: generateWindowSeed(row, col),
    scale,
  };
  building.userData.buildingBody = body;
  building.userData.windowGroup = null;

  return building;
}

function refreshBuildingWindows(building) {
  // no-op: windows removed
}

function updateBuildingWindows(building, row, col) {
  // no-op since windows removed
}

function createWindowMesh(geometry, random) {
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: random() < 0.6 ? 0xffd37b : 0x4b92ff,
    emissive: random() < 0.6 ? 0x332200 : 0x09214f,
    emissiveIntensity: random() < 0.6 ? 0.42 : 0.28,
    roughness: 0.25,
    transparent: true,
    opacity: 0.95,
  });

  const pane = new THREE.Mesh(geometry, windowMaterial);
  pane.castShadow = false;
  pane.receiveShadow = false;

  return pane;
}

function generateWindowSeed(row, col) {
  return `${row}:${col}`;
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += (h << 13) >>> 0;
    h ^= h >>> 7;
    h += (h << 3) >>> 0;
    h ^= h >>> 17;
    h += (h << 5) >>> 0;
    return ((h >>> 0) % 1000) / 1000;
  };
}
