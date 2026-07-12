import { describe, it, expect } from 'vitest';
import { holds, heldRelics, empowerEffects, tryCancelDeath, RELICS } from '../src/game/relics.js';
import { createFlags, setFlag } from '../src/game/flags.js';
import { createGauges, checkDeath } from '../src/game/gauges.js';
import { createReign, choose } from '../src/game/reign.js';

const [EXCALIBUR, FOURREAU] = RELICS;

function flagsWith(...names) {
  const f = createFlags();
  for (const n of names) setFlag(f, n);
  return f;
}

describe('relics — port', () => {
  it('portée si acquise, plus portée si perdue', () => {
    const f = flagsWith('relique.excalibur');
    expect(holds(f, EXCALIBUR)).toBe(true);
    setFlag(f, 'excalibur.rendue');
    expect(holds(f, EXCALIBUR)).toBe(false);
  });

  it('heldRelics liste les reliques portées', () => {
    const f = flagsWith('relique.excalibur', 'relique.fourreau', 'fourreau.perdu');
    expect(heldRelics(f).map((r) => r.key)).toEqual(['excalibur']);
  });
});

describe('relics — Excalibur', () => {
  it('majore les gains de chevalerie de +2', () => {
    const f = flagsWith('relique.excalibur');
    expect(empowerEffects({ chevalerie: 5 }, f)).toEqual({ chevalerie: 7 });
  });

  it("ne touche ni les pertes ni les autres jauges, ni sans l'épée", () => {
    const f = flagsWith('relique.excalibur');
    expect(empowerEffects({ chevalerie: -5 }, f)).toEqual({ chevalerie: -5 });
    expect(empowerEffects({ foi: 5 }, f)).toEqual({ foi: 5 });
    expect(empowerEffects({ chevalerie: 5 }, createFlags())).toEqual({ chevalerie: 5 });
  });
});

describe('relics — Le Fourreau', () => {
  it('annule une mort et ramène la jauge en zone critique', () => {
    const f = flagsWith('relique.fourreau');
    const gauges = createGauges({ foi: 0 });
    const death = checkDeath(gauges);
    const saved = tryCancelDeath(gauges, death, f);
    expect(saved.gauges.foi).toBe(15);
    expect(saved.message).toBeTruthy();
  });

  it('se consume : ne protège qu’une seule fois', () => {
    const f = flagsWith('relique.fourreau');
    const gauges = createGauges({ couronne: 100 });
    const death = checkDeath(gauges);
    expect(tryCancelDeath(gauges, death, f).gauges.couronne).toBe(85);
    expect(tryCancelDeath(gauges, death, f)).toBeNull(); // déjà consumé
  });

  it('en règne : le miracle est visible et le roi survit', () => {
    const reign = createReign({ gauges: { magie: 5 } });
    setFlag(reign.flags, 'relique.fourreau');
    reign.current = {
      id: 't', speaker: 'T', text: 't',
      left: { label: 'l', effects: { magie: -10 } },
      right: { label: 'r', effects: {} },
    };
    choose(reign, 'left');
    expect(reign.dead).toBeNull();
    expect(reign.miracle).toBeTruthy();
    expect(reign.gauges.magie).toBe(15);
  });

  it('en règne : n’empêche pas une double mort simultanée', () => {
    const reign = createReign({ gauges: { magie: 5, foi: 95 } });
    setFlag(reign.flags, 'relique.fourreau');
    reign.current = {
      id: 't', speaker: 'T', text: 't',
      left: { label: 'l', effects: { magie: -10, foi: +10 } },
      right: { label: 'r', effects: {} },
    };
    choose(reign, 'left');
    // le Fourreau sauve la première jauge, la seconde tue quand même
    expect(reign.dead).not.toBeNull();
    expect(reign.miracle).toBeNull();
  });
});
