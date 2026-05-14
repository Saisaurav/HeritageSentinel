import { NAV_NODES, LOCATIONS } from './mapData';
import { instructionsToString, pathToInstructions } from './pathTranslator';


// ─────────────────────────────────────────────────────────────────────────────
// ZONE MAP  –  every walkable region has an explicit bounding box and the
// exact nav-node id(s) that serve as its legal entry/exit points.
//
// Coordinate space: 0-100 (percentage of map image, 1600×1000 px).
// Zones are checked in order; the FIRST match wins, so more specific zones
// (room interiors) should come before broad fallback zones (atrium).
//
// gateways: node ids a point in this zone may connect to as __start__/__goal__.
//           These must be real NAV_NODES that lie *inside or on the edge* of
//           the zone – no wall crossing ever occurs.
// ─────────────────────────────────────────────────────────────────────────────
const ZONES = [
  // ── Rooms ──────────────────────────────────────────────────────────────────
  {
    id: 'room_galleryA',
    minX:  5,  maxX: 26,  minY: 10,  maxY: 33,
    gateways: ['ga_c']
  },
  {
    id: 'room_galleryB',
    minX: 74,  maxX: 95,  minY: 10,  maxY: 33,
    gateways: ['gb_c']
  },
  {
    id: 'room_historyWing',
    minX:  5,  maxX: 23,  minY: 39,  maxY: 61,
    gateways: ['hw_c']
  },
  {
    id: 'room_innovationHall',
    minX: 77,  maxX: 95,  minY: 39,  maxY: 61,
    gateways: ['ih_c']
  },
  {
    id: 'room_tempExhibit',
    minX:  5,  maxX: 34,  minY: 69,  maxY: 90,
    gateways: ['te_c']
  },
  {
    id: 'room_archive',
    minX: 66,  maxX: 95,  minY: 69,  maxY: 90,
    gateways: ['ar_c']
  },
  {
    id: 'room_cafe',
    minX: 40,  maxX: 60,  minY: 76,  maxY: 90,
    gateways: ['cafe_l', 'cafe_c', 'cafe_r']
  },

  // ── Top horizontal corridor  (between galleries, above atrium) ─────────────
  {
    id: 'corridor_top',
    minX: 26,  maxX: 74,  minY: 13,  maxY: 22,
    gateways: ['top_gaExit', 'top_l', 'top_cl', 'top_c', 'top_cr', 'top_r', 'top_gbExit']
  },

  // ── Top-left diagonal connector  (Gallery A door → atrium top-left) ────────
  {
    id: 'connector_topLeft',
    minX: 26,  maxX: 34,  minY: 17,  maxY: 27,
    gateways: ['top_gaExit', 'tlc_t', 'tlc_b']
  },

  // ── Top-right diagonal connector  (Gallery B door → atrium top-right) ──────
  {
    id: 'connector_topRight',
    minX: 66,  maxX: 74,  minY: 17,  maxY: 27,
    gateways: ['top_gbExit', 'trc_t', 'trc_b']
  },

  // ── Mid-left connector  (left corridor → History Wing door) ────────────────
  {
    id: 'connector_midLeft',
    minX: 22,  maxX: 36,  minY: 46,  maxY: 55,
    gateways: ['mlc_r', 'mlc_l', 'hw_entry']
  },

  // ── Mid-right connector  (right corridor → Innovation Hall door) ───────────
  {
    id: 'connector_midRight',
    minX: 64,  maxX: 78,  minY: 46,  maxY: 55,
    gateways: ['mrc_l', 'mrc_r', 'ih_entry']
  },

  // ── Bottom-left connector  (bottom spine → Temp Exhibit door) ──────────────
  {
    id: 'connector_bottomLeft',
    minX: 26,  maxX: 36,  minY: 78,  maxY: 84,
    gateways: ['bot_lc', 'blc_l', 'te_entry']
  },

  // ── Bottom-right connector  (bottom spine → Archive door) ──────────────────
  {
    id: 'connector_bottomRight',
    minX: 64,  maxX: 72,  minY: 78,  maxY: 84,
    gateways: ['bot_rc', 'brc_r', 'ar_entry']
  },

  // ── Left vertical corridor  (atrium left side) ─────────────────────────────
  {
    id: 'corridor_left',
    minX: 33,  maxX: 39,  minY: 27,  maxY: 68,
    gateways: ['lc_t', 'lc_1', 'lc_2', 'lc_3', 'lc_b']
  },

  // ── Right vertical corridor  (atrium right side) ───────────────────────────
  {
    id: 'corridor_right',
    minX: 61,  maxX: 67,  minY: 27,  maxY: 68,
    gateways: ['rc_t', 'rc_1', 'rc_2', 'rc_3', 'rc_b']
  },

  // ── Bottom horizontal spine  (below atrium, above café/exhibits) ────────────
  {
    id: 'corridor_bottom',
    minX: 34,  maxX: 66,  minY: 78,  maxY: 84,
    gateways: ['bot_lc', 'bot_l', 'bot_cl', 'bot_c', 'bot_cr', 'bot_r', 'bot_rc']
  },

  // ── Central Atrium  (broad catch-all for all interior atrium positions) ─────
  {
    id: 'atrium',
    minX: 29,  maxX: 71,  minY: 25,  maxY: 70,
    gateways: [
      'atr_tl', 'atr_tc', 'atr_tr',
      'sp_t', 'sp_1', 'sp_2', 'sp_c', 'sp_3', 'sp_4', 'sp_5', 'sp_b',
      'lc_t', 'lc_b', 'rc_t', 'rc_b',
      'atr_bl', 'atr_bc', 'atr_br'
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Return the zone a point belongs to, or null if outside all defined zones. */
function zoneOf(pos) {
  for (const zone of ZONES) {
    if (pos.x >= zone.minX && pos.x <= zone.maxX &&
        pos.y >= zone.minY && pos.y <= zone.maxY) {
      return zone;
    }
  }
  return null;
}

/**
 * Resolve the legal gateway node ids for an arbitrary position.
 *
 * 1. If the point is inside a known zone → use that zone's gateways (wall-safe).
 * 2. If no zone matches → fall back to nearest 3 nodes from the set of all
 *    gateway nodes only (never interior-only nodes), minimising wall-crossing risk.
 */
function gatewaysFor(pos) {
  const zone = zoneOf(pos);
  if (zone) {
    return zone.gateways
      .map(id => NAV_NODES.find(n => n.id === id))
      .filter(Boolean)
      .sort((a, b) => distance(pos, a) - distance(pos, b))
      .map(n => n.id);
  }

  // Fallback: nearest gateway nodes only
  const allGatewayIds = new Set(ZONES.flatMap(z => z.gateways));
  return [...NAV_NODES]
    .filter(n => allGatewayIds.has(n.id))
    .sort((a, b) => distance(pos, a) - distance(pos, b))
    .slice(0, 3)
    .map(n => n.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// A*
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the shortest wall-respecting path between any two (x, y) positions.
 *
 * @param {{ x: number, y: number }} startPos
 * @param {{ x: number, y: number }} targetPos
 * @param {{ includeRaw?: boolean }} options
 *
 * @returns {{ path: {id:string, x:number, y:number}[], totalDistance: number }}
 */
export function findPath(startPos, targetPos, { includeRaw = true } = {}) {
  const startGateways = gatewaysFor(startPos);
  const goalGateways  = gatewaysFor(targetPos);

  const virtualStart = {
    id: '__start__',
    x: startPos.x,
    y: startPos.y,
    neighbors: startGateways
  };
  const virtualGoal = {
    id: '__goal__',
    x: targetPos.x,
    y: targetPos.y,
    neighbors: goalGateways
  };

  // Inject back-edges into goal-gateway nodes (no mutation of NAV_NODES)
  const goalGatewaySet = new Set(goalGateways);
  const allNodes = [
    ...NAV_NODES.map(n =>
      goalGatewaySet.has(n.id)
        ? { ...n, neighbors: [...n.neighbors, '__goal__'] }
        : n
    ),
    virtualStart,
    virtualGoal
  ];

  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const get = id => nodeMap.get(id);

  const openSet = new Set(['__start__']);
  const cameFrom = {};
  const g = {};
  const f = {};

  for (const n of allNodes) {
    g[n.id] = Infinity;
    f[n.id] = Infinity;
  }
  g['__start__'] = 0;
  f['__start__'] = distance(virtualStart, virtualGoal);

  while (openSet.size > 0) {
    const current = [...openSet].reduce((a, b) => (f[a] < f[b] ? a : b));

    if (current === '__goal__') {
      const ids = [];
      let c = current;
      while (c !== undefined) { ids.unshift(c); c = cameFrom[c]; }

      let nodes = ids.map(id => {
        if (id === '__start__') return { id: '__start__', x: startPos.x, y: startPos.y };
        if (id === '__goal__')  return { id: '__goal__',  x: targetPos.x, y: targetPos.y };
        return get(id);
      });

      if (!includeRaw) {
        nodes = nodes.filter(n => n.id !== '__start__' && n.id !== '__goal__');
      }

      let totalDistance = 0;
      for (let i = 1; i < nodes.length; i++) totalDistance += distance(nodes[i - 1], nodes[i]);

      return { path: nodes, totalDistance };
    }

    openSet.delete(current);
    const currentNode = get(current);

    for (const nid of currentNode.neighbors) {
      const neighbour = get(nid);
      if (!neighbour) continue;

      const tentG = g[current] + distance(currentNode, neighbour);
      if (tentG < (g[nid] ?? Infinity)) {
        cameFrom[nid] = current;
        g[nid] = tentG;
        f[nid] = tentG + distance(neighbour, virtualGoal);
        openSet.add(nid);
      }
    }
  }

  return { path: [], totalDistance: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility exports
// ─────────────────────────────────────────────────────────────────────────────

/** Named LOCATION whose center is closest to (x, y). */
export function getNearestLocation(x, y) {
  return LOCATIONS.reduce((best, loc) => {
    const d = distance({ x, y }, loc.center);
    return d < distance({ x, y }, best.center) ? loc : best;
  });
}

/**
 * Zone id for a position – useful for the robot to know which room it's in.
 * e.g. 'room_galleryA', 'atrium', 'corridor_top', null (outside all zones)
 */
export function getZoneAt(x, y) {
  return zoneOf({ x, y })?.id ?? null;
}

/** Nav nodes safe for robot fallback positioning (corridors + atrium only). */
export function getAccessibleFallbackNodeIds() {
  const corridorZones = new Set([
    'corridor_top', 'corridor_left', 'corridor_right',
    'corridor_bottom', 'atrium'
  ]);
  const safeIds = new Set(
    ZONES.filter(z => corridorZones.has(z.id)).flatMap(z => z.gateways)
  );

  return NAV_NODES.filter(n => safeIds.has(n.id));
}

  const instructions = pathToInstructions(findPath({ x: 10, y: 20 }, { x: 80, y: 30 }).path);

console.log(instructionsToString(instructions));