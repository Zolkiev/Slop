export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function hitsBounds(robot, height) {
  return robot.y < 0 || robot.y + robot.h > height;
}
