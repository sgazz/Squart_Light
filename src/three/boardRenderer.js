import * as THREE from 'three';

const CELL_SIZE = 1;
const CELL_HEIGHT = 0.2;
const INACTIVE_HEIGHT_MULTIPLIER = 2.4;
const ACTIVE_COLOR = 0xe6ebff;
const BASE_TILE_COLOR = 0x101426;
const BASE_EDGE_COLOR = 0xf1c24a;
const BASE_HEIGHT = 0.07;
const BASE_EDGE_HEIGHT = 0.16;
const BASE_EDGE_THICKNESS = 0.11;
const HORIZONTAL_DOMINO_COLOR = 0x1f6feb;
const VERTICAL_DOMINO_COLOR = 0xd73a49;

const activeMaterial = new THREE.MeshStandardMaterial({ color: ACTIVE_COLOR });
const parkBaseMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a2b1f,
  roughness: 0.7,
  metalness: 0.15,
});
const parkGrassMaterial = new THREE.MeshStandardMaterial({
  color: 0x3fa766,
  emissive: 0x123e24,
  emissiveIntensity: 0.35,
  roughness: 0.38,
  metalness: 0.05,
});
const parkTrunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a3312,
  roughness: 0.6,
  metalness: 0.1,
});
const parkCanopyMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e7c4a,
  emissive: 0x124d32,
  emissiveIntensity: 0.25,
});
const buildingBaseMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f2435,
  roughness: 0.6,
  metalness: 0.12,
});
const buildingBodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x27324d,
  metalness: 0.28,
  roughness: 0.35,
  emissive: 0x0a1022,
  emissiveIntensity: 0.22,
});
const buildingRoofMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a496b,
  metalness: 0.3,
  roughness: 0.28,
  emissive: 0x14213b,
  emissiveIntensity: 0.18,
});
const buildingAccentMaterial = new THREE.MeshStandardMaterial({
  color: 0x4f7dff,
  emissive: 0x3050aa,
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.75,
  roughness: 0.2,
  metalness: 0.45,
});
const BUILDING_BODY_COLORS = [0x27324d, 0x2e3b63, 0x1f354f, 0x31466a, 0x24354d];
const BUILDING_ROOF_COLORS = [0x3a496b, 0x425272, 0x314160, 0x4c5673];
const BUILDING_ACCENT_COLORS = [0x4f7dff, 0xff6f6b, 0x63ffd5, 0xffc94f, 0xa46dff];
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd76a,
  transparent: true,
  opacity: 0.45,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const horizontalDominoMaterials = createDominoMaterials(HORIZONTAL_DOMINO_COLOR, 'H');
const verticalDominoMaterials = createDominoMaterials(VERTICAL_DOMINO_COLOR, 'V');

const DOMINO_DIMENSIONS = {
  horizontal: { width: CELL_SIZE * 1.95, height: CELL_HEIGHT * 1.2, depth: CELL_SIZE * 0.95 },
  vertical: { width: CELL_SIZE * 0.95, height: CELL_HEIGHT * 1.2, depth: CELL_SIZE * 1.95 },
};

const DOMINO_MATERIALS = {
  horizontal: horizontalDominoMaterials,
  vertical: verticalDominoMaterials,
};

export function buildBoardGroup(board) {
  const group = new THREE.Group();
  group.name = 'squart-board';

  const activeGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.95, CELL_HEIGHT, CELL_SIZE * 0.95);
  activeGeometry.translate(0, CELL_HEIGHT / 2, 0);

  const inactiveHeight = CELL_HEIGHT * INACTIVE_HEIGHT_MULTIPLIER;

  const xOffset = (board.cols - 1) * CELL_SIZE * 0.5;
  const zOffset = (board.rows - 1) * CELL_SIZE * 0.5;

  const baseGroup = buildBaseGroup(board, xOffset, zOffset);
  if (baseGroup) {
    group.add(baseGroup);
  }

  const parkGeometries = createParkGeometries();
  const buildingGeometries = createBuildingGeometries();
  const shouldUsePark = createParkSelector(board);

  const cellMeshes = [];
  const inactiveWaveTargets = [];

  board.cells.forEach((rowCells, rowIndex) => {
    rowCells.forEach((cell, colIndex) => {
      if (cell.isVoid) {
        return;
      }
      const isInactive = cell.isInactive;
      const mesh = isInactive
        ? createInactiveMesh({
            row: cell.row,
            col: cell.col,
            usePark: shouldUsePark(rowIndex, colIndex),
            parkGeometries,
            buildingGeometries,
          })
        : new THREE.Mesh(activeGeometry, activeMaterial);
      mesh.position.set(colIndex * CELL_SIZE - xOffset, 0, rowIndex * CELL_SIZE - zOffset);
      mesh.userData = { ...mesh.userData, row: cell.row, col: cell.col, isInactive: cell.isInactive };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (isInactive) {
        const inactiveCore = mesh.userData?.inactiveCore ?? mesh;
        const initialScale = 0.05;
        const targetScale = 1;
        inactiveCore.scale.y = initialScale;
        inactiveWaveTargets.push({
          mesh: inactiveCore,
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
      const parkCore = mesh.userData?.parkCore;
      if (parkCore) {
        const initialScale = 0.05;
        const targetScale = 1;
        parkCore.scale.y = initialScale;
        inactiveTargets.push({
          mesh: parkCore,
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
  const materials = DOMINO_MATERIALS[placement.orientation];
  if (!dimensions || !materials) {
    return;
  }

  const geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
  geometry.translate(0, CELL_HEIGHT / 2, 0);

  const mesh = new THREE.Mesh(geometry, materials);
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

function createInactiveMesh({ row, col, usePark, parkGeometries, buildingGeometries }) {
  if (usePark) {
    return createParkMesh({
      geometries: parkGeometries,
      materials: {
        base: parkBaseMaterial,
        grass: parkGrassMaterial,
        trunk: parkTrunkMaterial,
        canopy: parkCanopyMaterial,
      },
      row,
      col,
    });
  }

  return createBuildingMesh({
    geometries: buildingGeometries,
    materials: createBuildingMaterials(row, col),
    row,
    col,
  });
}

function createParkMesh({ geometries, materials, row, col }) {
  const park = new THREE.Group();

  const base = new THREE.Mesh(geometries.base, materials.base);
  base.castShadow = false;
  base.receiveShadow = true;
  base.position.y = geometries.baseHeight / 2;
  park.add(base);

  const parkCore = new THREE.Group();
  park.add(parkCore);

  const grass = new THREE.Mesh(geometries.grass, materials.grass);
  grass.castShadow = false;
  grass.receiveShadow = true;
  grass.position.y = geometries.baseHeight + geometries.grassHeight / 2;
  parkCore.add(grass);

  const trunk = new THREE.Mesh(geometries.trunk, materials.trunk);
  trunk.castShadow = true;
  trunk.receiveShadow = false;
  trunk.position.y = geometries.baseHeight + geometries.grassHeight + geometries.trunkHeight / 2;
  parkCore.add(trunk);

  const canopy = new THREE.Mesh(geometries.canopy, materials.canopy);
  canopy.castShadow = true;
  canopy.receiveShadow = false;
  canopy.position.y =
    geometries.baseHeight + geometries.grassHeight + geometries.trunkHeight + geometries.canopyOffsetY;
  parkCore.add(canopy);

  const canopyScale = 0.9 + (((row * 53 + col * 29) % 7) / 35);
  canopy.scale.setScalar(canopyScale);

  parkCore.scale.y = 1;
  park.userData = {
    inactiveCore: parkCore,
    row,
    col,
  };

  return park;
}

function createBuildingMesh({ geometries, materials, row, col }) {
  const building = new THREE.Group();

  const base = new THREE.Mesh(geometries.base, materials.base);
  base.castShadow = false;
  base.receiveShadow = true;
  base.position.y = geometries.baseHeight / 2;
  building.add(base);

  const core = new THREE.Group();
  building.add(core);

  const heightSeed = ((row * 97 + col * 193) ^ 0x5f1f) & 0xff;
  const heightFactor = 1 + (heightSeed / 255) * 1.2;

  const body = new THREE.Mesh(geometries.body, materials.body);
  body.scale.y = heightFactor;
  body.position.y = geometries.baseHeight + (geometries.bodyHeight * heightFactor) / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  core.add(body);

  const accent = new THREE.Mesh(geometries.accent, materials.accent);
  accent.rotation.x = Math.PI / 2;
  accent.position.y = geometries.baseHeight + geometries.bodyHeight * heightFactor * 0.65;
  accent.castShadow = false;
  accent.receiveShadow = false;
  core.add(accent);

  const roof = new THREE.Mesh(geometries.roof, materials.roof);
  roof.position.y = geometries.baseHeight + geometries.bodyHeight * heightFactor + geometries.roofHeight / 2;
  roof.castShadow = true;
  core.add(roof);

  const secondaryAccent = accent.clone();
  secondaryAccent.position.y = geometries.baseHeight + geometries.bodyHeight * heightFactor * 0.35;
  secondaryAccent.castShadow = false;
  secondaryAccent.receiveShadow = false;
  core.add(secondaryAccent);

  core.rotation.y = 0;
  core.scale.y = 1;

  building.userData = {
    inactiveCore: core,
    row,
    col,
  };

  return building;
}

function createDominoMaterials(color, label) {
  const bumpMap = createDominoBumpTexture(label);
  const sideMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.45,
  });
  const topMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.4,
    bumpMap,
    bumpScale: 1,
  });

  return [
    sideMaterial, // +x
    sideMaterial, // -x
    topMaterial, // +y (top)
    sideMaterial, // -y (bottom)
    sideMaterial, // +z
    sideMaterial, // -z
  ];
}

function createDominoBumpTexture(label) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 200px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

function buildBaseGroup(board, xOffset, zOffset) {
  const baseGroup = new THREE.Group();
  baseGroup.name = 'board-foundation';

  const tileGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.98, BASE_HEIGHT, CELL_SIZE * 0.98);
  tileGeometry.translate(0, -BASE_HEIGHT / 2, 0);

  const horizontalEdgeGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.98, BASE_EDGE_HEIGHT, BASE_EDGE_THICKNESS);
  horizontalEdgeGeometry.translate(0, BASE_EDGE_HEIGHT / 2, 0);

  const verticalEdgeGeometry = new THREE.BoxGeometry(BASE_EDGE_THICKNESS, BASE_EDGE_HEIGHT, CELL_SIZE * 0.98);
  verticalEdgeGeometry.translate(0, BASE_EDGE_HEIGHT / 2, 0);

  const horizontalGlowGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.98, BASE_EDGE_THICKNESS * 1.6);
  horizontalGlowGeometry.rotateX(-Math.PI / 2);

  const verticalGlowGeometry = new THREE.PlaneGeometry(BASE_EDGE_THICKNESS * 1.6, CELL_SIZE * 0.98);
  verticalGlowGeometry.rotateX(-Math.PI / 2);

  const tileMaterial = new THREE.MeshStandardMaterial({
    color: BASE_TILE_COLOR,
    roughness: 0.65,
    metalness: 0.08,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: BASE_EDGE_COLOR,
    roughness: 0.55,
    metalness: 0.12,
  });

  const playableLookup = createPlayableLookup(board);
  const glowGroup = new THREE.Group();
  glowGroup.name = 'board-glow';

  board.cells.forEach((rowCells, rowIndex) => {
    rowCells.forEach((cell, colIndex) => {
      if (cell.isVoid) {
        return;
      }

      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      const x = colIndex * CELL_SIZE - xOffset;
      const z = rowIndex * CELL_SIZE - zOffset;
      tile.position.set(x, 0, z);
      tile.receiveShadow = true;
      baseGroup.add(tile);

      addEdgeIfNeeded({
        board,
        playableLookup,
        row: rowIndex,
        col: colIndex,
        direction: 'north',
        edgeGeometry: horizontalEdgeGeometry,
        edgeMaterial,
        edgeGroup: baseGroup,
        glowGroup,
        glowMaterial,
        glowGeometry: horizontalGlowGeometry,
        position: { x, z: z - CELL_SIZE / 2 },
      });

      addEdgeIfNeeded({
        board,
        playableLookup,
        row: rowIndex,
        col: colIndex,
        direction: 'south',
        edgeGeometry: horizontalEdgeGeometry,
        edgeMaterial,
        edgeGroup: baseGroup,
        glowGroup,
        glowMaterial,
        glowGeometry: horizontalGlowGeometry,
        position: { x, z: z + CELL_SIZE / 2 },
      });

      addEdgeIfNeeded({
        board,
        playableLookup,
        row: rowIndex,
        col: colIndex,
        direction: 'west',
        edgeGeometry: verticalEdgeGeometry,
        edgeMaterial,
        edgeGroup: baseGroup,
        glowGroup,
        glowMaterial,
        glowGeometry: verticalGlowGeometry,
        position: { x: x - CELL_SIZE / 2, z },
      });

      addEdgeIfNeeded({
        board,
        playableLookup,
        row: rowIndex,
        col: colIndex,
        direction: 'east',
        edgeGeometry: verticalEdgeGeometry,
        edgeMaterial,
        edgeGroup: baseGroup,
        glowGroup,
        glowMaterial,
        glowGeometry: verticalGlowGeometry,
        position: { x: x + CELL_SIZE / 2, z },
      });
    });
  });

  if (glowGroup.children.length > 0) {
    glowGroup.position.y = BASE_EDGE_HEIGHT + 0.02;
    glowGroup.children.forEach((child) => {
      child.renderOrder = 2;
    });
    baseGroup.add(glowGroup);
  }

  return baseGroup;
}

function addEdgeIfNeeded({
  board,
  playableLookup,
  row,
  col,
  direction,
  edgeGeometry,
  edgeMaterial,
  edgeGroup,
  glowGroup,
  glowMaterial,
  glowGeometry,
  position,
}) {
  const neighbor = getNeighborKey(row, col, direction);
  if (neighbor && playableLookup.has(neighbor)) {
    return;
  }

  const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
  edge.position.set(position.x, 0, position.z);
  edge.castShadow = true;
  edge.receiveShadow = true;
  edgeGroup.add(edge);

  if (glowGroup && glowGeometry && glowMaterial) {
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(position.x, 0, position.z);
    glowGroup.add(glow);
  }
}

function getNeighborKey(row, col, direction) {
  switch (direction) {
    case 'north':
      return row > 0 ? makeKey(row - 1, col) : null;
    case 'south':
      return makeKey(row + 1, col);
    case 'west':
      return col > 0 ? makeKey(row, col - 1) : null;
    case 'east':
      return makeKey(row, col + 1);
    default:
      return null;
  }
}

function createPlayableLookup(board) {
  const lookup = new Set();
  board.cells.forEach((rowCells) => {
    rowCells.forEach((cell) => {
      if (!cell.isVoid) {
        lookup.add(makeKey(cell.row, cell.col));
      }
    });
  });
  return lookup;
}

function makeKey(row, col) {
  return `${row}:${col}`;
}

function createParkGeometries() {
  const baseHeight = CELL_HEIGHT * 0.4;
  const grassHeight = CELL_HEIGHT * 0.35;
  const trunkHeight = CELL_HEIGHT * 0.6;
  const canopyRadius = CELL_SIZE * 0.28;
  const canopyOffset = canopyRadius * 0.75;

  const base = new THREE.BoxGeometry(CELL_SIZE * 0.92, baseHeight, CELL_SIZE * 0.92);
  const grass = new THREE.BoxGeometry(CELL_SIZE * 0.84, grassHeight, CELL_SIZE * 0.84);
  const trunk = new THREE.CylinderGeometry(CELL_SIZE * 0.08, CELL_SIZE * 0.08, trunkHeight, 8);
  const canopy = new THREE.SphereGeometry(canopyRadius, 16, 16);

  return {
    base,
    grass,
    trunk,
    canopy,
    baseHeight,
    grassHeight,
    trunkHeight,
    canopyOffsetY: canopyOffset,
  };
}

function createBuildingGeometries() {
  const baseHeight = CELL_HEIGHT * 0.24;
  const bodyHeight = CELL_HEIGHT * 1.6;
  const roofHeight = CELL_HEIGHT * 0.32;

  const base = new THREE.BoxGeometry(CELL_SIZE * 0.9, baseHeight, CELL_SIZE * 0.9);
  const body = new THREE.BoxGeometry(CELL_SIZE * 0.7, bodyHeight, CELL_SIZE * 0.7);
  const roof = new THREE.BoxGeometry(CELL_SIZE * 0.6, roofHeight, CELL_SIZE * 0.6);
  const accent = new THREE.TorusGeometry(CELL_SIZE * 0.36, CELL_HEIGHT * 0.035, 12, 28);

  return {
    base,
    baseHeight,
    body,
    bodyHeight,
    roof,
    roofHeight,
    accent,
  };
}

function createParkSelector(board) {
  const seedValue =
    board.seed !== undefined && board.seed !== null ? String(board.seed) : `${board.rows}x${board.cols}`;
  const baseSeed = hashString(seedValue);
  return (row, col) => {
    const value = (row * 73856093) ^ (col * 19349663) ^ baseSeed;
    return (value & 7) <= 2;
  };
}

function createBuildingMaterials(row, col) {
  const seed = ((row * 211 + col * 421) ^ 0x4ad3) >>> 0;
  const bodyColor = BUILDING_BODY_COLORS[seed % BUILDING_BODY_COLORS.length];
  const roofColor = BUILDING_ROOF_COLORS[(seed >> 3) % BUILDING_ROOF_COLORS.length];
  const accentColor = BUILDING_ACCENT_COLORS[(seed >> 6) % BUILDING_ACCENT_COLORS.length];

  const bodyMaterial = buildingBodyMaterial.clone();
  bodyMaterial.color.setHex(bodyColor);
  bodyMaterial.emissive.copy(new THREE.Color(bodyColor)).multiplyScalar(0.22);
  bodyMaterial.emissiveIntensity = 0.22;

  const roofMaterial = buildingRoofMaterial.clone();
  roofMaterial.color.setHex(roofColor);
  roofMaterial.emissive.copy(new THREE.Color(roofColor)).multiplyScalar(0.25);
  roofMaterial.emissiveIntensity = 0.22;

  const accentMaterial = buildingAccentMaterial.clone();
  accentMaterial.color.setHex(accentColor);
  accentMaterial.emissive.copy(new THREE.Color(accentColor)).multiplyScalar(0.6);
  accentMaterial.emissiveIntensity = 0.7;
  accentMaterial.opacity = 0.8;

  return {
    base: buildingBaseMaterial,
    body: bodyMaterial,
    roof: roofMaterial,
    accent: accentMaterial,
  };
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
