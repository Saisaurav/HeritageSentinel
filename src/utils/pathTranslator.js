/**
 * pathToInstructions.js
 *
 * Converts a path (array of {id, x, y} nodes in 0-100% space) into
 * a list of physical robot instructions.
 *
 * Requires a REAL_WORLD_SCALE constant — how many real-world centimetres
 * one percentage unit represents. Measure your museum floor and set this.
 *
 * Example output:
 *   [
 *     { type: 'FACE',    degrees: 90 },
 *     { type: 'FORWARD', steps: 42 },
 *     { type: 'TURN',    degrees: -45, direction: 'RIGHT' },
 *     { type: 'FORWARD', steps: 18 },
 *     { type: 'STOP' }
 *   ]
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * How many real-world centimetres = 1 percentage unit.
 * e.g. if the museum floor is 50m wide and the map is 100 units wide:
 *   SCALE = 5000 / 100 = 50 cm per unit
 */
const CM_PER_UNIT = 50;

/**
 * How many steps your robot motor takes per centimetre.
 * Calibrate this on the actual hardware.
 */
const STEPS_PER_CM = 10;

/**
 * Minimum segment length (in % units) below which we skip the node
 * to avoid jitter from nearly-coincident nodes.
 */
const MIN_SEGMENT_LENGTH = 0.5;

/**
 * Angle tolerance in degrees — turns smaller than this are ignored
 * (robot just keeps going straight).
 */
const MIN_TURN_DEGREES = 5;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Angle in degrees FROM north (0°) clockwise, matching compass/robot convention. */
function bearing(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y; // positive Y is DOWN on screen / south in room
  // atan2 gives angle from east, CCW. Convert to bearing from north, CW.
  const rad = Math.atan2(dx, dy); // note: atan2(x, y) not (y, x) for bearing
  return ((rad * 180) / Math.PI + 360) % 360;
}

/** Shortest signed turn from currentBearing → targetBearing.
 *  Positive = clockwise (RIGHT), negative = counter-clockwise (LEFT). */
function shortestTurn(current, target) {
  let delta = ((target - current) + 540) % 360 - 180;
  return delta; // degrees, signed
}

function euclidean(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function unitsToSteps(units) {
  return Math.round(units * CM_PER_UNIT * STEPS_PER_CM);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Array<{id: string, x: number, y: number}>} path
 *   Ordered waypoints from findPath(), including __start__ and __goal__.
 *
 * @param {number} [initialBearing=0]
 *   The direction the robot is already facing, in degrees clockwise from north.
 *   0 = facing north (up on map), 90 = east, 180 = south, 270 = west.
 *
 * @returns {Array<object>} Instruction list for the robot.
 */
export function pathToInstructions(path, initialBearing = 0) {
  if (!path || path.length < 2) {
    return [{ type: 'STOP', reason: 'already at destination' }];
  }

  // Filter out near-duplicate nodes that would produce junk micro-turns
  const waypoints = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (euclidean(path[i - 1], path[i]) >= MIN_SEGMENT_LENGTH) {
      waypoints.push(path[i]);
    }
  }

  const instructions = [];
  let currentBearing = initialBearing;

  // ── Initial FACE instruction ─────────────────────────────────────────────
  // Tell the robot which direction to face before moving at all.
  const firstBearing = bearing(waypoints[0], waypoints[1]);
  const initialTurn  = shortestTurn(currentBearing, firstBearing);

  if (Math.abs(initialTurn) >= MIN_TURN_DEGREES) {
    instructions.push({
      type:      'FACE',
      degrees:   Math.round(firstBearing),
      turn:      Math.round(initialTurn),
      direction: initialTurn >= 0 ? 'RIGHT' : 'LEFT',
    });
  }
  currentBearing = firstBearing;

  // ── Walk each segment ────────────────────────────────────────────────────
  for (let i = 1; i < waypoints.length; i++) {
    const from = waypoints[i - 1];
    const to   = waypoints[i];

    const segmentBearing = bearing(from, to);
    const turnNeeded     = shortestTurn(currentBearing, segmentBearing);
    const distUnits      = euclidean(from, to);
    const steps          = unitsToSteps(distUnits);

    // TURN if direction changed meaningfully
    if (Math.abs(turnNeeded) >= MIN_TURN_DEGREES) {
      instructions.push({
        type:      'TURN',
        degrees:   Math.round(Math.abs(turnNeeded)),
        direction: turnNeeded >= 0 ? 'RIGHT' : 'LEFT',
        rawDelta:  Math.round(turnNeeded),
      });
      currentBearing = segmentBearing;
    }

    // FORWARD along this segment
    if (steps > 0) {
      instructions.push({
        type:       'FORWARD',
        steps,
        distanceCm: Math.round(distUnits * CM_PER_UNIT),
        nodeFrom:   from.id,
        nodeTo:     to.id,
      });
    }
  }

  // ── Final STOP ───────────────────────────────────────────────────────────
  instructions.push({
    type:        'STOP',
    atNode:      waypoints[waypoints.length - 1].id,
    reason:      'destination reached',
  });

  return instructions;
}

// ─── Pretty-printer (useful for debugging on the Pi) ─────────────────────────

/**
 * Converts the instruction list to a human-readable string.
 * Print this to the kiosk console or robot serial port.
 */
export function instructionsToString(instructions) {
  return instructions.map((ins, i) => {
    switch (ins.type) {
      case 'FACE':
        return `${i + 1}. FACE ${ins.degrees}° (turn ${ins.direction} ${Math.abs(ins.turn)}°)`;
      case 'TURN':
        return `${i + 1}. TURN ${ins.direction} ${ins.degrees}°`;
      case 'FORWARD':
        return `${i + 1}. FORWARD ${ins.steps} steps (~${ins.distanceCm} cm)  [${ins.nodeFrom} → ${ins.nodeTo}]`;
      case 'STOP':
        return `${i + 1}. STOP  (${ins.reason})`;
      default:
        return `${i + 1}. UNKNOWN`;
    }
  }).join('\n');
}