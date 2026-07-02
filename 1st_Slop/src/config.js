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

  // Menu / UI layout (canvas 360×640)
  MENU_BTN: { x: 80, w: 200, h: 56, y0: 330, gap: 66 },
  MENU_LOGO_Y: 120,
  MENU_ROBOT_Y: 250,
  MENU_BEST_Y: 600,

  // Pause overlay + HUD
  PAUSE_BTN: { x: 80, w: 200, h: 56, y0: 230, gap: 72 },
  PAUSE_TITLE_Y: 170,
  PAUSE_ICON: { x: 324, y: 16, w: 24, h: 24 },
  GAMEOVER_BTN: { x: 80, w: 200, h: 56, y0: 384, gap: 72 },
  SAVECODE_BTN: { x: 80, w: 200, h: 56, y0: 280, gap: 66 },
  SAVECODE_TITLE_Y: 120,
  SAVECODE_CODE_Y: 190,
  SAVECODE_MSG_Y: 235,

  // Button text (canvas-drawn labels over shared plate)
  BTN_FONT_FAMILY: 'PressStart2P',
  BTN_FONT_MAX: 18,
  BTN_FONT_MIN: 8,
  BTN_TEXT_PAD: 16,
  BTN_DISABLED_ALPHA: 0.4,
  BTN_TEXT: '#ffffff',
  BTN_TEXT_DISABLED: '#8a94a6',

  // Niveaux & difficulté progressive
  GATES_PER_LEVEL: 10,
  SPEED_BASE: 150,   // vitesse niveau 1 (= SCROLL_SPEED)
  SPEED_STEP: 12,    // gain de vitesse par niveau
  SPEED_MAX: 300,    // plafond de vitesse
  GAP_BASE: 160,     // gapMin niveau 1 (= GAP_MIN)
  GAP_SHRINK: 6,     // rétrécissement du gap par niveau
  GAP_FLOOR: 110,    // gap minimal absolu
  GAP_RANGE: 50,     // étendue aléatoire au-dessus de gapMin (= GAP_MAX - GAP_MIN)
};
