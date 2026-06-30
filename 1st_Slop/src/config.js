export const CONFIG = {
  WIDTH: 360,
  HEIGHT: 640,

  // Physique robot
  GRAVITY: 1400,      // px/s^2
  THRUST: 380,        // vitesse verticale (px/s) appliquée vers le haut au tap
  MAX_FALL: 650,      // vitesse de chute terminale (px/s)
  ROBOT_X: 96,        // X fixe du robot
  ROBOT_W: 34,
  ROBOT_H: 24,

  // Monde
  SCROLL_SPEED: 150,  // px/s (défilement obstacles + sol)
  FIXED_DT: 1 / 60,   // pas de temps fixe

  // Background sets
  BG_SET_COUNT: 3,

  // Obstacles
  OBSTACLE_W: 62,
  GAP_MIN: 160,
  GAP_MAX: 210,
  OBSTACLE_SPACING: 230, // distance horizontale entre 2 obstacles
  GAP_MARGIN: 48,        // marge haute/basse interdite pour le gap

  // Crash juice
  SHAKE_TIME: 0.3,
  SHAKE_MAX: 4,
  FLASH_TIME: 0.16,
};
