import { CONFIG } from '../config.js';

export function createRobot() {
  return {
    x: CONFIG.ROBOT_X,
    y: CONFIG.HEIGHT / 2,
    vy: 0,
    w: CONFIG.ROBOT_W,
    h: CONFIG.ROBOT_H,
    alive: true,
  };
}

export function applyThrust(robot) {
  robot.vy = -CONFIG.THRUST;
}

export function updateRobot(robot, dt) {
  robot.vy = Math.min(robot.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
  robot.y += robot.vy * dt;
  return robot;
}
