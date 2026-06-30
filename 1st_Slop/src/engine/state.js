export const States = { MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover' };

const TRANSITIONS = {
  [States.MENU]: [States.PLAY],
  [States.PLAY]: [States.GAMEOVER],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
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
