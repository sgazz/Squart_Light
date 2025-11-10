import * as THREE from 'three';

const CELL_SIZE = 1;
const CELL_HEIGHT = 0.2;
const INACTIVE_HEIGHT_MULTIPLIER = 2;
const ACTIVE_COLOR = 0xffffff;
const INACTIVE_COLOR = 0x555555;
const GRID_COLOR = 0xeeeeee;
const HORIZONTAL_DOMINO_COLOR = 0x1f6feb;
const VERTICAL_DOMINO_COLOR = 0xd73a49;

const activeMaterial = new THREE.MeshStandardMaterial({ color: ACTIVE_COLOR });
const inactiveMaterial = new THREE.MeshStandardMaterial({ color: INACTIVE_COLOR });
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

  board.cells.forEach((rowCells, rowIndex) => {
    rowCells.forEach((cell, colIndex) => {
      const geometry = cell.isInactive ? inactiveGeometry : activeGeometry;
      const material = cell.isInactive ? inactiveMaterial : activeMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(colIndex * CELL_SIZE - xOffset, 0, rowIndex * CELL_SIZE - zOffset);
      mesh.userData = { row: cell.row, col: cell.col, isInactive: cell.isInactive };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
  };

  return group;
}

export function refreshBoardGroup(group, board) {
  const { cellMeshes } = group.userData ?? {};
  if (!cellMeshes) {
    return;
  }

  cellMeshes.forEach((mesh) => {
    const { row, col } = mesh.userData;
    const cell = board.cells[row][col];
    mesh.material = cell.isInactive ? inactiveMaterial : activeMaterial;
    mesh.userData.isInactive = cell.isInactive;
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
  dominoGroup.add(mesh);
}
