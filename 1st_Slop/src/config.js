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
  BG_SET_COUNT: 5,
  // Vitesse de parallaxe du fond lointain par décor. Les fonds à repère
  // unique (soleil, orage, planète) ne sont pas raccordables : tuilés en
  // scroll, le repère se répète et se coupe au joint -> statiques (0).
  BG_FAR_SPEED: [0.25, 0.25, 0, 0, 0],

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
  MENU_BTN: { x: 80, w: 200, h: 56, y0: 320, gap: 62 }, // 5 boutons, dernier à 568-624
  MENU_LOGO_Y: 120,
  MENU_ROBOT_Y: 250,
  MENU_BEST_Y: 636, // sous le 5e bouton (568-624)

  // Pause overlay + HUD
  PAUSE_BTN: { x: 80, w: 200, h: 56, y0: 230, gap: 72 },
  PAUSE_TITLE_Y: 170,
  PAUSE_ICON: { x: 324, y: 16, w: 24, h: 24 },
  GAMEOVER_BTN: { x: 80, w: 200, h: 56, y0: 384, gap: 72 },
  SAVECODE_BTN: { x: 80, w: 200, h: 56, y0: 280, gap: 66 },
  SAVECODE_TITLE_Y: 120,
  SAVECODE_CODE_Y: 190,
  SAVECODE_MSG_Y: 235,

  // Écran Options
  OPTIONS_TITLE_Y: 140,
  OPTIONS_ROWS: { x: 28, y0: 240, gap: 84, segW: 24, segGap: 4, segH: 28, count: 11 },
  OPTIONS_LABEL_DY: -16,
  OPTIONS_BTN: { x: 80, y: 440, w: 200, h: 56 },

  // Écran ROBOTS (hangar de skins)
  SKINS_TITLE_Y: 96,
  SKINS_PREVIEW: { x: 84, y: 150, size: 192 }, // sprite 64 agrandi ×3, centré
  SKINS_NAME_Y: 392,
  SKINS_ARROW: { w: 40, h: 60, lx: 16, rx: 304, y: 216 }, // zones tap des flèches < >
  SKINS_BTN: { x: 80, w: 200, h: 56, y0: 470, gap: 66 },  // CHOISIR / RETOUR

  // Button text (canvas-drawn labels over shared plate)
  BTN_FONT_FAMILY: 'PressStart2P',
  BTN_FONT_MAX: 18,
  BTN_FONT_MIN: 8,
  BTN_TEXT_PAD: 16,
  BTN_DISABLED_ALPHA: 0.4,
  BTN_TEXT: '#ffffff',
  BTN_TEXT_DISABLED: '#8a94a6',

  // Niveaux & difficulté progressive
  GATES_BASE: 10,    // portes du niveau 1
  GATES_STEP: 5,     // portes en plus par niveau
  GATES_CAP: 30,     // plafond de portes par niveau
  SPEED_BASE: 150,   // vitesse niveau 1 (= SCROLL_SPEED)
  SPEED_STEP: 12,    // gain de vitesse par niveau
  SPEED_MAX: 300,    // plafond de vitesse
  GAP_BASE: 160,     // gapMin niveau 1 (= GAP_MIN)
  GAP_SHRINK: 6,     // rétrécissement du gap par niveau
  GAP_FLOOR: 110,    // gap minimal absolu
  GAP_RANGE: 50,     // étendue aléatoire au-dessus de gapMin (= GAP_MAX - GAP_MIN)
  SPACING_STEP: 5,   // resserrement horizontal par niveau (base = OBSTACLE_SPACING)
  SPACING_FLOOR: 175, // espacement minimal absolu
  SAFETY_UP: 0.55,   // marge de sécurité sur la capacité de montée entre 2 portes
  SAFETY_DOWN: 0.6,  // idem descente (plus permissive : la gravité aide)
  PATTERN_TIERS: [1, 3, 5, 7, 10], // niveaux d'entrée des tiers de motifs
};
