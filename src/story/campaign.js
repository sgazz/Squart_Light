const STORAGE_KEY = 'squart:story-progress:v1';

export const NEIGHBORHOOD_STATUS = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  COMPLETED: 'completed',
};

export const EXTRA_CITY_ID = '__extra__mission__';

export const EXTRA_MISSION = {
  id: 'final-showdown',
  name: 'Final Showdown',
  description: 'A decisive duel offered when the campaign ends in a draw.',
  intro: 'Both sides are evenly matched. One last clash will decide the fate of the skyline.',
  rows: 12,
  cols: 12,
  inactivePercentage: 24,
  recommendedSeed: 'final-showdown-01',
  mask: createMask(12, 12, (row, col) => {
    const border = row === 0 || col === 0 || row === 11 || col === 11;
    const centralVoid = row >= 4 && row <= 7 && col >= 4 && col <= 7;
    const diagonals = Math.abs(row - col) === 5 || Math.abs(row + col - 11) === 5;
    return border || centralVoid || diagonals;
  }),
  mapMeta: {
    size: { width: 320, height: 200 },
    theme: 'final-showdown',
  },
  mapPosition: { x: 160, y: 110 },
};

function createMask(rows, cols, predicate) {
  const blocked = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (predicate(row, col)) {
        blocked.push({ row, col });
      }
    }
  }
  return { rows, cols, blocked };
}

const MASKS = {
  auroraCore: createMask(10, 12, (row, col) => {
    if ((row < 2 && (col < 2 || col > 9)) || (row > 7 && (col < 2 || col > 9))) {
      return true;
    }
    if ((col === 0 || col === 11) && row >= 3 && row <= 6) {
      return true;
    }
    if (row === 4 && (col === 5 || col === 6)) {
      return true;
    }
    return false;
  }),
  auroraDocks: createMask(12, 14, (row, col) => {
    if ((row <= 1 && (col < 3 || col > 10)) || (row >= 10 && (col < 3 || col > 10))) {
      return true;
    }
    if ((col <= 1 || col >= 12) && row >= 3 && row <= 8) {
      return true;
    }
    if (row === 5 && col >= 4 && col <= 9) {
      return true;
    }
    return false;
  }),
  auroraZenith: createMask(9, 15, (row, col) => {
    if ((row === 0 || row === 8) && (col < 4 || col > 10)) {
      return true;
    }
    if ((col === 0 || col === 14) && row >= 2 && row <= 6) {
      return true;
    }
    if ((col < 2 && row < 2) || (col > 12 && row > 6)) {
      return true;
    }
    if ((row === 3 || row === 5) && (col === 3 || col === 11)) {
      return true;
    }
    return false;
  }),
  havenGardens: createMask(11, 11, (row, col) => {
    if ((row <= 1 && (col <= 2 || col >= 8)) || (row >= 9 && (col <= 2 || col >= 8))) {
      return true;
    }
    if ((col <= 1 || col >= 9) && row >= 3 && row <= 7) {
      return true;
    }
    if (Math.abs(row - 5) <= 1 && Math.abs(col - 5) <= 1) {
      return true;
    }
    return false;
  }),
  havenCanals: createMask(13, 10, (row, col) => {
    if ((row <= 1 && (col <= 1 || col >= 8)) || (row >= 11 && (col <= 1 || col >= 8))) {
      return true;
    }
    if ((col === 3 || col === 6) && row % 2 === 0) {
      return true;
    }
    if (row === 6 && (col === 0 || col === 9)) {
      return true;
    }
    return false;
  }),
  frontierOutpost: createMask(8, 16, (row, col) => {
    if ((col < 2 && row < 3) || (col > 13 && row > 4)) {
      return true;
    }
    if ((row === 0 || row === 7) && (col < 4 || col > 11)) {
      return true;
    }
    if ((row === 3 || row === 4) && (col % 5 === 2)) {
      return true;
    }
    return false;
  }),
  frontierSpires: createMask(10, 10, (row, col) => {
    if ((row <= 1 && col <= 1) || (row >= 8 && col >= 8)) {
      return true;
    }
    if ((row >= 8 && col <= 1) || (row <= 1 && col >= 8)) {
      return true;
    }
    if (Math.abs(row - 4.5) <= 1 && Math.abs(col - 4.5) <= 1) {
      return true;
    }
    if ((row === 0 || row === 9) && (col < 3 || col > 6)) {
      return true;
    }
    if ((col === 0 || col === 9) && (row < 3 || row > 6)) {
      return true;
    }
    return false;
  }),
  frontierVeins: createMask(14, 9, (row, col) => {
    if ((row <= 1 && (col <= 1 || col >= 7)) || (row >= 12 && (col <= 1 || col >= 7))) {
      return true;
    }
    if ((col === 2 || col === 6) && row >= 2 && row <= 11 && row % 3 === 0) {
      return true;
    }
    if ((row === 6 || row === 7) && col === 4) {
      return true;
    }
    return false;
  }),
};

const CAMPAIGN_CITIES = [
  {
    id: 'neo-aurora',
    name: 'Neo Aurora',
    description: 'Rain-soaked neon avenues where rooftops connect like a maze.',
    neighborhoods: [
      {
        id: 'aurora-core',
        name: 'Core District',
        intro: 'Secure the elevated plazas that power the skyline.',
        rows: 10,
        cols: 12,
        inactivePercentage: 22,
        mask: MASKS.auroraCore,
        recommendedSeed: 'aurora-core-01',
        mapPosition: { x: 82, y: 126 },
      },
      {
        id: 'aurora-docks',
        name: 'Dockside Web',
        intro: 'Navigate the shipping cranes that slice through the harbor.',
        rows: 12,
        cols: 14,
        inactivePercentage: 28,
        mask: MASKS.auroraDocks,
        recommendedSeed: 'aurora-docks-02',
        mapPosition: { x: 164, y: 88 },
      },
      {
        id: 'aurora-zenith',
        name: 'Zenith Canopy',
        intro: 'Sky bridges carve a lattice between mirrored towers.',
        rows: 9,
        cols: 15,
        inactivePercentage: 25,
        mask: MASKS.auroraZenith,
        recommendedSeed: 'aurora-zenith-03',
        mapPosition: { x: 238, y: 152 },
      },
    ],
    mapMeta: {
      size: { width: 320, height: 200 },
      center: { x: 160, y: 110 },
      theme: 'neo-aurora',
    },
  },
  {
    id: 'solstice-haven',
    name: 'Solstice Haven',
    description: 'Gilded canals and terraced gardens steeped in dusk light.',
    neighborhoods: [
      {
        id: 'haven-gardens',
        name: 'Hanging Gardens',
        intro: 'Guard the terraced plazas before the sun sets.',
        rows: 11,
        cols: 11,
        inactivePercentage: 18,
        mask: MASKS.havenGardens,
        recommendedSeed: 'haven-gardens-01',
        mapPosition: { x: 96, y: 132 },
      },
      {
        id: 'haven-canals',
        name: 'Canal Labyrinth',
        intro: 'Bridges and conduits partition the flow of movement.',
        rows: 13,
        cols: 10,
        inactivePercentage: 24,
        mask: MASKS.havenCanals,
        recommendedSeed: 'haven-water-03',
        mapPosition: { x: 210, y: 86 },
      },
    ],
    mapMeta: {
      size: { width: 320, height: 200 },
      center: { x: 150, y: 120 },
      theme: 'solstice-haven',
    },
  },
  {
    id: 'astral-frontier',
    name: 'Astral Frontier',
    description: 'Experimental colony clusters above the desert strata.',
    neighborhoods: [
      {
        id: 'frontier-outpost',
        name: 'Outpost Array',
        intro: 'Radiant sensors detect every misplaced move.',
        rows: 8,
        cols: 16,
        inactivePercentage: 26,
        mask: MASKS.frontierOutpost,
        recommendedSeed: 'frontier-outpost-05',
        mapPosition: { x: 86, y: 142 },
      },
      {
        id: 'frontier-spires',
        name: 'Crystal Spires',
        intro: 'Shards of glass obstruct sightlines across the dunes.',
        rows: 10,
        cols: 10,
        inactivePercentage: 30,
        mask: MASKS.frontierSpires,
        recommendedSeed: 'frontier-spires-07',
        mapPosition: { x: 160, y: 84 },
      },
      {
        id: 'frontier-veins',
        name: 'Auric Veins',
        intro: 'Mine shafts open and collapse, sealing access routes.',
        rows: 14,
        cols: 9,
        inactivePercentage: 27,
        mask: MASKS.frontierVeins,
        recommendedSeed: 'frontier-veins-09',
        mapPosition: { x: 228, y: 164 },
      },
    ],
    mapMeta: {
      size: { width: 320, height: 200 },
      center: { x: 160, y: 110 },
      theme: 'astral-frontier',
    },
  },
];

let cachedState = null;

function cloneCampaign() {
  return CAMPAIGN_CITIES.map((city) => ({
    ...city,
    neighborhoods: city.neighborhoods.map((hood) => ({ ...hood })),
  }));
}

function readProgress() {
  if (cachedState) {
    return cachedState;
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    cachedState = {};
    return cachedState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedState = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Unable to parse story progress, falling back to defaults.', error);
    cachedState = {};
  }
  return cachedState;
}

function persistProgress(progress) {
  cachedState = progress;
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('Unable to persist story progress.', error);
  }
}

function ensureDefaults(progress) {
  const next = enforceSequentialUnlocks({ ...progress });
  if (!next.extraMission) {
    next.extraMission = {
      unlocked: false,
      status: NEIGHBORHOOD_STATUS.LOCKED,
      winner: null,
    };
  }
  return next;
}

export function initializeCampaignProgress() {
  const progress = ensureDefaults({ ...readProgress() });
  persistProgress(progress);
  return getCampaignState();
}

export function getCampaignState() {
  const progress = ensureDefaults({ ...readProgress() });
  persistProgress(progress);
  const cities = cloneCampaign().map((city) => {
    const cityProgress = progress[city.id] ?? { neighborhoods: {} };
    const enrichedNeighborhoods = city.neighborhoods.map((hood) => {
      const status = cityProgress.neighborhoods?.[hood.id] ?? NEIGHBORHOOD_STATUS.LOCKED;
      return {
        ...hood,
        status,
        winner: cityProgress.neighborhoodResults?.[hood.id] ?? null,
      };
    });
    const completedCount = enrichedNeighborhoods.filter((hood) => hood.status === NEIGHBORHOOD_STATUS.COMPLETED).length;
    const availableCount = enrichedNeighborhoods.filter((hood) => hood.status === NEIGHBORHOOD_STATUS.AVAILABLE).length;
    const totalCount = enrichedNeighborhoods.length;
    return {
      ...city,
      unlocked: cityProgress.unlocked ?? false,
      completed: cityProgress.completed ?? false,
      cityWinner: cityProgress.cityWinner ?? null,
      neighborhoods: enrichedNeighborhoods,
      completedCount,
      availableCount,
      totalCount,
    };
  });
  const extra = progress.extraMission ?? {
    unlocked: false,
    status: NEIGHBORHOOD_STATUS.LOCKED,
    winner: null,
  };
  const extraMission = {
    unlocked: Boolean(extra.unlocked),
    status: extra.status ?? NEIGHBORHOOD_STATUS.LOCKED,
    winner: extra.winner ?? null,
    ...EXTRA_MISSION,
  };
  return { cities, extraMission };
}

export function setNeighborhoodStatus(cityId, neighborhoodId, status, meta = {}) {
  const progress = ensureDefaults(readProgress());
  if (cityId === EXTRA_CITY_ID) {
    const extra = progress.extraMission ?? {
      unlocked: false,
      status: NEIGHBORHOOD_STATUS.LOCKED,
      winner: null,
    };
    extra.status = status;
    if (status === NEIGHBORHOOD_STATUS.COMPLETED) {
      extra.winner = meta.winner ?? null;
    } else {
      extra.winner = null;
    }
    progress.extraMission = extra;
    enforceSequentialUnlocks(progress);
    persistProgress(progress);
    return;
  }
  const cityProgress = progress[cityId];
  if (!cityProgress) {
    return;
  }
  cityProgress.neighborhoods[neighborhoodId] = status;
  cityProgress.neighborhoodResults = cityProgress.neighborhoodResults ?? {};
  if (status === NEIGHBORHOOD_STATUS.COMPLETED && meta.winner) {
    cityProgress.neighborhoodResults[neighborhoodId] = meta.winner;
  } else if (status !== NEIGHBORHOOD_STATUS.COMPLETED) {
    delete cityProgress.neighborhoodResults[neighborhoodId];
  }
  if (status === NEIGHBORHOOD_STATUS.COMPLETED) {
    unlockNextNeighborhood(progress, cityId, neighborhoodId);
  }
  enforceSequentialUnlocks(progress);
  persistProgress(progress);
}

function unlockNextNeighborhood(progress, cityId, neighborhoodId) {
  const city = CAMPAIGN_CITIES.find((item) => item.id === cityId);
  if (!city) {
    return;
  }
  const neighborhoodIndex = city.neighborhoods.findIndex((hood) => hood.id === neighborhoodId);
  if (neighborhoodIndex === -1) {
    return;
  }
  const nextNeighborhood = city.neighborhoods[neighborhoodIndex + 1];
  if (nextNeighborhood) {
    const cityProgress = progress[cityId];
    const currentStatus = cityProgress.neighborhoods[nextNeighborhood.id];
    if (currentStatus === NEIGHBORHOOD_STATUS.LOCKED) {
      cityProgress.neighborhoods[nextNeighborhood.id] = NEIGHBORHOOD_STATUS.AVAILABLE;
    }
    return;
  }
  const nextCity = CAMPAIGN_CITIES[CAMPAIGN_CITIES.indexOf(city) + 1];
  if (!nextCity) {
    return;
  }
  const nextCityProgress = progress[nextCity.id] ?? { unlocked: false, neighborhoods: {} };
  nextCityProgress.unlocked = true;
  progress[nextCity.id] = nextCityProgress;
}

export function resetCampaignProgress() {
  persistProgress({});
  return initializeCampaignProgress();
}

export function findNeighborhood(cityId, neighborhoodId) {
  const progress = ensureDefaults({ ...readProgress() });
  if (cityId === EXTRA_CITY_ID) {
    const extra = progress.extraMission ?? {
      unlocked: false,
      status: NEIGHBORHOOD_STATUS.LOCKED,
      winner: null,
    };
    const mission = {
      ...EXTRA_MISSION,
      status: extra.status ?? NEIGHBORHOOD_STATUS.LOCKED,
      winner: extra.winner ?? null,
    };
    const city = {
      id: EXTRA_CITY_ID,
      name: EXTRA_MISSION.name,
      description: EXTRA_MISSION.description,
      completed: mission.status === NEIGHBORHOOD_STATUS.COMPLETED,
      cityWinner: mission.winner ?? null,
      neighborhoods: [mission],
    };
    return { city, neighborhood: mission };
  }
  const { cities } = getCampaignState();
  const city = cities.find((item) => item.id === cityId);
  if (!city) {
    return null;
  }
  const neighborhood = city.neighborhoods.find((item) => item.id === neighborhoodId);
  if (!neighborhood) {
    return null;
  }
  return { city, neighborhood };
}

function enforceSequentialUnlocks(progress) {
  let previousCompleted = true;
  const globalTally = { horizontal: 0, vertical: 0 };
  CAMPAIGN_CITIES.forEach((city) => {
    const cityProgress = progress[city.id] ?? { unlocked: false, neighborhoods: {} };
    if (!cityProgress.neighborhoods) {
      cityProgress.neighborhoods = {};
    }
    cityProgress.neighborhoodResults = cityProgress.neighborhoodResults ?? {};

    if (previousCompleted) {
      cityProgress.unlocked = true;
    }

    let allCompleted = true;
    const completionTally = { horizontal: 0, vertical: 0 };
    city.neighborhoods.forEach((hood, index) => {
      const currentStatus = cityProgress.neighborhoods[hood.id];
      if (!currentStatus) {
        cityProgress.neighborhoods[hood.id] =
          cityProgress.unlocked && index === 0 ? NEIGHBORHOOD_STATUS.AVAILABLE : NEIGHBORHOOD_STATUS.LOCKED;
      } else if (cityProgress.unlocked && index === 0 && currentStatus === NEIGHBORHOOD_STATUS.LOCKED) {
        cityProgress.neighborhoods[hood.id] = NEIGHBORHOOD_STATUS.AVAILABLE;
      }

      if (cityProgress.neighborhoods[hood.id] === NEIGHBORHOOD_STATUS.COMPLETED) {
        const win = cityProgress.neighborhoodResults?.[hood.id];
        if (win === 'horizontal') {
          completionTally.horizontal += 1;
        } else if (win === 'vertical') {
          completionTally.vertical += 1;
        }
      } else {
        delete cityProgress.neighborhoodResults[hood.id];
        allCompleted = false;
      }
    });

    cityProgress.completed = allCompleted;
    cityProgress.cityWinner = allCompleted ? determineCityWinner(completionTally) : null;
    if (cityProgress.cityWinner === 'horizontal') {
      globalTally.horizontal += 1;
    } else if (cityProgress.cityWinner === 'vertical') {
      globalTally.vertical += 1;
    }

    progress[city.id] = cityProgress;
    previousCompleted = previousCompleted && allCompleted;
  });
  updateExtraMission(progress, globalTally);
  return progress;
}

function determineCityWinner(tally) {
  const horizontal = tally.horizontal ?? 0;
  const vertical = tally.vertical ?? 0;
  if (horizontal === 0 && vertical === 0) {
    return null;
  }
  if (horizontal === vertical) {
    return 'tie';
  }
  return horizontal > vertical ? 'horizontal' : 'vertical';
}

function updateExtraMission(progress, globalTally) {
  const extra = progress.extraMission ?? {
    unlocked: false,
    status: NEIGHBORHOOD_STATUS.LOCKED,
    winner: null,
  };
  const horizontalWins = globalTally.horizontal ?? 0;
  const verticalWins = globalTally.vertical ?? 0;
  const hasCampaignDraw = horizontalWins === verticalWins && (horizontalWins + verticalWins) > 0;

  if (hasCampaignDraw) {
    extra.unlocked = true;
    if (extra.status !== NEIGHBORHOOD_STATUS.COMPLETED) {
      extra.status = NEIGHBORHOOD_STATUS.AVAILABLE;
      extra.winner = null;
    }
  } else if (extra.status !== NEIGHBORHOOD_STATUS.COMPLETED) {
    extra.unlocked = false;
    extra.status = NEIGHBORHOOD_STATUS.LOCKED;
    extra.winner = null;
  }

  progress.extraMission = extra;
}

