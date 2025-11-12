const MIN_SIZE = 5;
const MAX_SIZE = 20;
const MIN_INACTIVE_PERCENTAGE = 0.17;
const MAX_INACTIVE_PERCENTAGE = 0.19;
const MAX_CUSTOM_PERCENTAGE = 90;

export const ORIENTATION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

export const GAME_STATUS = {
  ACTIVE: 'active',
  FINISHED: 'finished',
};

export function generateBoard({ rows = 10, cols = 10, seed, inactivePercentage } = {}) {
  validateBoardSize(rows, cols);

  const random = createRandom(seed);
  const totalSquares = rows * cols;
  const { inactiveCount, actualPercentage, requestedPercentage } = determineInactiveCount(
    totalSquares,
    random,
    inactivePercentage
  );

  const cells = Array.from({ length: rows }, (_, row) => {
    return Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      isInactive: false,
      occupiedBy: null,
    }));
  });

  const availablePositions = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      availablePositions.push({ row, col });
    }
  }

  shuffleInPlace(availablePositions, random);
  const inactiveSquares = availablePositions.slice(0, inactiveCount);
  inactiveSquares.forEach(({ row, col }) => {
    cells[row][col].isInactive = true;
  });

  const board = {
    rows,
    cols,
    seed: seed ?? null,
    inactiveCount,
    actualInactivePercentage: actualPercentage,
    requestedInactivePercentage: requestedPercentage,
    inactiveSquares,
    cells,
    placements: [],
    currentPlayer: ORIENTATION.HORIZONTAL,
    status: GAME_STATUS.ACTIVE,
    winner: null,
  };
  return evaluateGameStatus(board);
}

export function canPlaceDomino(board, positions) {
  if (!positions || positions.length === 0) {
    return false;
  }

  return positions.every(({ row, col }) => {
    const cell = board.cells?.[row]?.[col];
    return Boolean(cell) && !cell.isInactive && !cell.occupiedBy;
  });
}

export function placeDomino(board, start, orientation = board.currentPlayer) {
  if (!board || board.status !== GAME_STATUS.ACTIVE) {
    return null;
  }

  if (!orientation || orientation !== board.currentPlayer) {
    return null;
  }

  const positions = resolveDominoPositions(board, start, orientation);
  if (!positions || !canPlaceDomino(board, positions)) {
    return null;
  }

  positions.forEach(({ row, col }) => {
    const cell = board.cells[row][col];
    cell.occupiedBy = orientation;
  });

  const placement = {
    orientation,
    positions,
  };

  board.placements.push(placement);
  advanceTurn(board, orientation);
  return placement;
}

// Precomputed offsets allow us to describe domino coverage declaratively per orientation.
const ORIENTATION_OFFSETS = {
  [ORIENTATION.HORIZONTAL]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ],
  [ORIENTATION.VERTICAL]: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ],
};

function resolveDominoPositions(board, start, orientation) {
  if (!start || !Number.isInteger(start.row) || !Number.isInteger(start.col)) {
    return null;
  }

  const offsets = ORIENTATION_OFFSETS[orientation];
  if (!offsets) {
    return null;
  }

  const positions = offsets.map(({ row: dRow, col: dCol }) => ({
    row: start.row + dRow,
    col: start.col + dCol,
  }));

  return positions.every(({ row, col }) => isWithinBounds(board, row, col)) ? positions : null;
}

function determineInactiveCount(totalSquares, random, percentageOverride) {
  if (percentageOverride !== undefined && percentageOverride !== null) {
    const numericOverride = Number(percentageOverride);
    if (Number.isNaN(numericOverride)) {
      throw new Error(`Nevažeća vrednost za procenat neaktivnih polja: ${percentageOverride}`);
    }

    const clampedOverride = Math.min(Math.max(numericOverride, 0), MAX_CUSTOM_PERCENTAGE);
    const countFromOverride = Math.round((clampedOverride / 100) * totalSquares);
    const inactiveCount = Math.min(totalSquares, Math.max(0, countFromOverride));
    return {
      inactiveCount,
      actualPercentage: (inactiveCount / totalSquares) * 100,
      requestedPercentage: clampedOverride,
    };
  }

  const minWithinRange = Math.ceil(totalSquares * MIN_INACTIVE_PERCENTAGE);
  const maxWithinRange = Math.floor(totalSquares * MAX_INACTIVE_PERCENTAGE);

  if (minWithinRange <= maxWithinRange) {
    const inactiveCount = Math.floor(random() * (maxWithinRange - minWithinRange + 1)) + minWithinRange;
    return {
      inactiveCount,
      actualPercentage: (inactiveCount / totalSquares) * 100,
      requestedPercentage: null,
    };
  }

  const fallback = Math.min(totalSquares - 2, Math.ceil(totalSquares * MIN_INACTIVE_PERCENTAGE));
  const inactiveCount = Math.max(1, fallback);
  return {
    inactiveCount,
    actualPercentage: (inactiveCount / totalSquares) * 100,
    requestedPercentage: null,
  };
}

function createRandom(seed) {
  if (seed === undefined || seed === null) {
    return Math.random;
  }

  const seedArray = cyrb128(String(seed));
  let state = seedArray[0];
  const rng = mulberry32(state);

  return () => rng();
}

function validateBoardSize(rows, cols) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new Error(`Dimenzije table moraju biti celi brojevi, prosledjeno: ${rows}x${cols}`);
  }

  if (
    rows < MIN_SIZE ||
    rows > MAX_SIZE ||
    cols < MIN_SIZE ||
    cols > MAX_SIZE
  ) {
    throw new Error(
      `Dimenzije table moraju biti u opsegu ${MIN_SIZE}-${MAX_SIZE}, prosledjeno: ${rows}x${cols}`
    );
  }
}

function shuffleInPlace(array, random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cyrb128(str) {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1];
}

function advanceTurn(board, justPlayedOrientation) {
  const opponent = getOpponentOrientation(justPlayedOrientation);
  if (!hasAvailableMove(board, opponent)) {
    board.status = GAME_STATUS.FINISHED;
    board.winner = justPlayedOrientation;
    board.currentPlayer = null;
    return;
  }

  board.currentPlayer = opponent;
}

export function hasAvailableMove(board, orientation) {
  if (!board || board.status !== GAME_STATUS.ACTIVE) {
    return false;
  }

  return iteratePlacements(board, orientation, (positions) => canPlaceDomino(board, positions));
}

export function countAvailableMoves(board, orientation) {
  if (!board) {
    return 0;
  }

  let count = 0;
  iteratePlacements(board, orientation, (positions) => {
    if (canPlaceDomino(board, positions)) {
      count += 1;
    }
    return false;
  });

  return count;
}

export function getOpponentOrientation(orientation) {
  if (orientation === ORIENTATION.HORIZONTAL) {
    return ORIENTATION.VERTICAL;
  }
  if (orientation === ORIENTATION.VERTICAL) {
    return ORIENTATION.HORIZONTAL;
  }
  return null;
}

export function evaluateGameStatus(board) {
  if (!board || board.status !== GAME_STATUS.ACTIVE) {
    return board;
  }

  if (hasAvailableMove(board, board.currentPlayer)) {
    return board;
  }

  const opponent = getOpponentOrientation(board.currentPlayer);
  if (opponent && hasAvailableMove(board, opponent)) {
    board.status = GAME_STATUS.FINISHED;
    board.winner = opponent;
    board.currentPlayer = null;
    return board;
  }

  board.status = GAME_STATUS.FINISHED;
  board.winner = null;
  board.currentPlayer = null;
  return board;
}

function isWithinBounds(board, row, col) {
  // Centralised bounds check keeps `resolveDominoPositions` and other callers consistent.
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

function iteratePlacements(board, orientation, visitor) {
  const offsets = ORIENTATION_OFFSETS[orientation];
  if (!offsets) {
    return false;
  }

  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const positions = resolveDominoPositions(board, { row, col }, orientation);
      if (positions && visitor(positions, row, col)) {
        return true;
      }
    }
  }

  return false;
}
