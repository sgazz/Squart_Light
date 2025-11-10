import { generateBoard, ORIENTATION, countAvailableMoves } from '../src/game/board.js';

const ROW_RANGE = { min: 5, max: 12 };
const COL_RANGE = { min: 5, max: 12 };
const PERCENTAGES = [0, 5, 10, 12, 15, 17, 18, 19, 20, 25, 30, 35, 40];
const SEED_COUNT = 50;

function* iterateRange({ min, max }) {
  for (let value = min; value <= max; value += 1) {
    yield value;
  }
}

function analyzeCombination(rows, cols, inactivePercentage) {
  let horizontalTotal = 0;
  let verticalTotal = 0;
  let zeroDiffCount = 0;
  let cumulativeAbsDiff = 0;

  for (let seed = 0; seed < SEED_COUNT; seed += 1) {
    const board = generateBoard({ rows, cols, seed, inactivePercentage });
    const horizontalMoves = countAvailableMoves(board, ORIENTATION.HORIZONTAL);
    const verticalMoves = countAvailableMoves(board, ORIENTATION.VERTICAL);
    const diff = horizontalMoves - verticalMoves;

    horizontalTotal += horizontalMoves;
    verticalTotal += verticalMoves;
    if (diff === 0) {
      zeroDiffCount += 1;
    }
    cumulativeAbsDiff += Math.abs(diff);
  }

  const averageHorizontal = horizontalTotal / SEED_COUNT;
  const averageVertical = verticalTotal / SEED_COUNT;
  const averageAbsDiff = cumulativeAbsDiff / SEED_COUNT;

  return {
    rows,
    cols,
    inactivePercentage,
    averageHorizontal,
    averageVertical,
    zeroDiffRate: zeroDiffCount / SEED_COUNT,
    averageAbsDiff,
  };
}

function runAnalysis() {
  const results = [];

  for (const rows of iterateRange(ROW_RANGE)) {
    for (const cols of iterateRange(COL_RANGE)) {
      for (const inactivePercentage of PERCENTAGES) {
        const record = analyzeCombination(rows, cols, inactivePercentage);
        results.push(record);
      }
    }
  }

  results.sort((a, b) => {
    if (a.averageAbsDiff === b.averageAbsDiff) {
      return b.zeroDiffRate - a.zeroDiffRate;
    }
    return a.averageAbsDiff - b.averageAbsDiff;
  });

  const topResults = results.slice(0, 25);
  console.log('Top 25 balanced configurations (rows x cols, inactive %, avg abs diff, zero diff rate, avg moves H, avg moves V)');
  topResults.forEach((record) => {
    const line = [
      `${record.rows}×${record.cols}`,
      `inactive ${record.inactivePercentage}%`,
      `avg|Δ|=${record.averageAbsDiff.toFixed(2)}`,
      `zero ${(record.zeroDiffRate * 100).toFixed(0)}%`,
      `H=${record.averageHorizontal.toFixed(1)}`,
      `V=${record.averageVertical.toFixed(1)}`,
    ].join(' | ');
    console.log(line);
  });
}

runAnalysis();

