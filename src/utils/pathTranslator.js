const STEPS_PER_CM = 10;
const CM_PER_UNIT = 50;

const MIN_TURN_DEGREES = 5;
const MIN_SEGMENT_LENGTH = 0.2; // meters or your map unit

// Convert Nav2 pose → simple point
function toPoint(pose) {
  return {
    x: pose.pose.position.x,
    y: pose.pose.position.y
  };
}

// bearing from north, clockwise
function bearing(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rad = Math.atan2(dx, dy);
  return ((rad * 180) / Math.PI + 360) % 360;
}

function shortestTurn(current, target) {
  return ((target - current + 540) % 360) - 180;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function unitsToSteps(units) {
  return Math.round(units * CM_PER_UNIT * STEPS_PER_CM);
}

/**
 * Convert Nav2 path → robot instructions
 * @param {Array} navPath nav_msgs/Path.poses
 */
export function pathToInstructions(navPath, initialBearing = 0) {
  if (!navPath || navPath.length < 2) {
    return [{ type: "STOP", reason: "empty path" }];
  }

  const points = navPath.map(toPoint);

  const instructions = [];
  let currentBearing = initialBearing;

  // Initial direction
  const firstBearing = bearing(points[0], points[1]);
  const initialTurn = shortestTurn(currentBearing, firstBearing);

  if (Math.abs(initialTurn) >= MIN_TURN_DEGREES) {
    instructions.push({
      type: "FACE",
      degrees: Math.round(firstBearing),
      turn: Math.round(initialTurn),
      direction: initialTurn >= 0 ? "RIGHT" : "LEFT"
    });
  }

  currentBearing = firstBearing;

  // Walk path
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];

    const d = distance(from, to);
    if (d < MIN_SEGMENT_LENGTH) continue;

    const segBearing = bearing(from, to);
    const turn = shortestTurn(currentBearing, segBearing);

    if (Math.abs(turn) >= MIN_TURN_DEGREES) {
      instructions.push({
        type: "TURN",
        degrees: Math.round(Math.abs(turn)),
        direction: turn >= 0 ? "RIGHT" : "LEFT"
      });
      currentBearing = segBearing;
    }

    const steps = unitsToSteps(d);

    instructions.push({
      type: "FORWARD",
      steps,
      distance: d
    });
  }

  instructions.push({
    type: "STOP",
    reason: "nav2 destination reached"
  });

  return instructions;
}