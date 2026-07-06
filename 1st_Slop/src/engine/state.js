export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
  PAUSE: 'pause', SAVECODE: 'savecode', OPTIONS: 'options', SKINS: 'skins',
  CONFIRM: 'confirm',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY, States.SAVECODE, States.OPTIONS, States.SKINS, States.CONFIRM],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE, States.PAUSE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
  [States.PAUSE]: [States.PLAY, States.MENU, States.OPTIONS],
  [States.SAVECODE]: [States.MENU],
  [States.OPTIONS]: [States.MENU, States.PAUSE],
  [States.SKINS]: [States.MENU],
  [States.CONFIRM]: [States.PLAY, States.MENU],
};

export function createStateMachine(initial = States.MENU) {
  let current = initial;
  return {
    get() {
      return current;
    },
    can(next) {
      return TRANSITIONS[current]?.includes(next) ?? false;
    },
    to(next) {
      if (!this.can(next)) {
        throw new Error(`Transition invalide ${current} -> ${next}`);
      }
      current = next;
      return current;
    },
  };
}
