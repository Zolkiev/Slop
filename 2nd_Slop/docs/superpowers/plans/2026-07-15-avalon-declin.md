# Avalon — Le Déclin : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire d'Avalon un épilogue court et mortel (~10 tours) au lieu d'une boucle de 2 fillers sur 22 tours (max 90).

**Architecture:** En Avalon, les 4 jauges s'érodent de `AVALON_DECLIN` points après chaque carte jouée. La mort arrive d'elle-même et la jauge défendue en dernier signe la fin, via des textes de mort propres à Avalon. Tout est ajouté en fonctions pures (`applyDeclin`, `checkDeath(gauges, era)`) ; `reign.choose()` est le seul point de câblage.

**Tech Stack:** Vanilla JS (ESM), Vitest, Vite. Zéro dépendance runtime.

**Spec :** `docs/superpowers/specs/2026-07-15-avalon-declin-design.md` — à lire avant de commencer.

## Global Constraints

- **Zéro dépendance runtime** ajoutée. Vanilla JS + Canvas 2D uniquement.
- **Zéro génération d'art** — aucun crédit PixelLab. Les cartes neuves réutilisent les portraits existants.
- Les modules purs (`gauges.js`, `reign.js`) **sont** unit-testés ; `src/main.js` et `src/render/*` ne le sont pas (convention projet).
- Langue : tout le contenu de jeu et les commentaires sont **en français**.
- Le déclin ne s'applique **qu'en Avalon**. Roche, Camelot, Graal, Chute sont inchangés.
- `checkDeath` garde une **signature rétrocompatible** : le paramètre `era` est optionnel, `combat.js` ne doit pas être modifié.
- Commandes : tests `npx vitest run`, build `npx vite build`.

---

### Task 1 : `applyDeclin` — l'érosion des jauges (fonction pure)

**Files:**
- Modify: `src/config.js` (ajouter `AVALON_DECLIN` après `GAUGE_START`, ligne ~6)
- Modify: `src/game/gauges.js` (ajouter `applyDeclin` après `applyEffects`, ligne ~25)
- Test: `test/gauges-declin.test.js` (créer)

**Interfaces:**
- Consumes: `GAUGE_KEYS`, `GAUGE_MIN`, `GAUGE_MAX` (déjà exportés par `src/config.js`), le `clamp` local de `gauges.js`.
- Produces: `AVALON_DECLIN: number` (depuis `config.js`) et `applyDeclin(gauges: {foi,magie,chevalerie,couronne}, n?: number) => nouvelles jauges`. Défaut de `n` : `AVALON_DECLIN`. **N'altère jamais l'entrée** (même contrat qu'`applyEffects`). Utilisés par la Task 3.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `test/gauges-declin.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { applyDeclin } from '../src/game/gauges.js';
import { AVALON_DECLIN } from '../src/config.js';

describe('applyDeclin — l’érosion d’Avalon', () => {
  it('érode les 4 jauges du montant demandé', () => {
    const g = { foi: 50, magie: 40, chevalerie: 30, couronne: 20 };
    expect(applyDeclin(g, 3)).toEqual({ foi: 47, magie: 37, chevalerie: 27, couronne: 17 });
  });

  it('utilise AVALON_DECLIN par défaut', () => {
    const g = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };
    const out = applyDeclin(g);
    expect(out.foi).toBe(50 - AVALON_DECLIN);
  });

  it('borne à 0 sans jamais passer sous zéro', () => {
    const g = { foi: 2, magie: 1, chevalerie: 0, couronne: 3 };
    expect(applyDeclin(g, 5)).toEqual({ foi: 0, magie: 0, chevalerie: 0, couronne: 0 });
  });

  it('n’altère pas l’objet d’entrée', () => {
    const g = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };
    applyDeclin(g, 3);
    expect(g.foi).toBe(50);
  });
});
```

- [ ] **Step 2 : Lancer le test — il doit échouer**

Run: `npx vitest run test/gauges-declin.test.js`
Expected: FAIL — `applyDeclin is not a function` (et `AVALON_DECLIN` vaut `undefined`).

- [ ] **Step 3 : Ajouter la constante dans `src/config.js`**

Juste après `export const GAUGE_START = 50;` :

```js
// Avalon : érosion des 4 jauges à chaque tour joué dans l'ère (« Le Déclin »).
// Logres échappe au roi mourant. Calibré par simulation : médiane ~10 tours
// d'épilogue. Voir docs/superpowers/specs/2026-07-15-avalon-declin-design.md §3.1.
export const AVALON_DECLIN = 3;
```

- [ ] **Step 4 : Implémenter `applyDeclin` dans `src/game/gauges.js`**

Étendre l'import de `../config.js` en tête de fichier pour y ajouter `AVALON_DECLIN` :

```js
import { GAUGE_KEYS, GAUGE_MIN, GAUGE_MAX, GAUGE_START, GAUGES, AVALON_DECLIN } from '../config.js';
```

Puis, juste après `applyEffects` :

```js
/**
 * Le Déclin d'Avalon : érode les 4 jauges de `n` points et renvoie de NOUVELLES
 * jauges bornées 0..100. N'altère jamais l'objet d'entrée.
 * Peut tuer — c'est le but : l'épilogue doit se conclure.
 */
export function applyDeclin(gauges, n = AVALON_DECLIN) {
  const next = { ...gauges };
  for (const key of GAUGE_KEYS) next[key] = clamp(next[key] - n);
  return next;
}
```

- [ ] **Step 5 : Lancer le test — il doit passer**

Run: `npx vitest run test/gauges-declin.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6 : Lancer toute la suite (non-régression)**

Run: `npx vitest run`
Expected: PASS — 90 tests existants + 4 neufs = 94.

- [ ] **Step 7 : Commit**

```bash
git add src/config.js src/game/gauges.js test/gauges-declin.test.js
git commit -m "feat(logres): applyDeclin — érosion des jauges d'Avalon"
```

---

### Task 2 : Les morts d'Avalon (textes + `checkDeath(gauges, era)`)

**Files:**
- Modify: `src/config.js` (ajouter `avalonEmpty` aux 4 entrées de `GAUGES`, lignes ~10-39)
- Modify: `src/game/gauges.js` (`checkDeath`, ligne ~32)
- Test: `test/gauges-mort-avalon.test.js` (créer)

**Interfaces:**
- Consumes: `applyDeclin` n'est pas utilisé ici. `GAUGES`, `GAUGE_MIN`, `GAUGE_MAX` de `config.js`.
- Produces: `checkDeath(gauges, era?: string)` — **le 2ᵉ paramètre est optionnel**. Si `era === 'avalon'` et que la jauge morte a un `avalonEmpty`, `cause` prend ce texte ; sinon comportement actuel à l'identique. La forme du retour est **inchangée** : `{key, side, cause} | null`. Utilisé par la Task 3. `combat.js` continue de l'appeler sans `era` — ne pas le modifier.

**Pourquoi :** le déclin tire les jauges vers 0, donc 100 % des morts d'Avalon deviennent des morts « à vide ». Or les textes actuels décrivent un **renversement** (« les barons se soulèvent », « le plus grand chevalier t'usurpe ») : on ne renverse pas un mourant. Voir spec §3.2.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `test/gauges-mort-avalon.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { checkDeath } from '../src/game/gauges.js';
import { GAUGES, GAUGE_KEYS } from '../src/config.js';

const vivant = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };

describe('morts d’Avalon', () => {
  it('chaque jauge a un texte de mort propre à Avalon, distinct du texte normal', () => {
    for (const g of GAUGES) {
      expect(g.avalonEmpty, `jauge ${g.key}`).toBeTruthy();
      expect(g.avalonEmpty, `jauge ${g.key}`).not.toBe(g.empty);
    }
  });

  it('en Avalon, une jauge à vide donne le texte d’Avalon', () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 0 };
      const mort = checkDeath(g, 'avalon');
      const def = GAUGES.find((x) => x.key === key);
      expect(mort.key).toBe(key);
      expect(mort.side).toBe('empty');
      expect(mort.cause).toBe(def.avalonEmpty);
    }
  });

  it('hors Avalon, le texte normal est conservé (non-régression)', () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 0 };
      const def = GAUGES.find((x) => x.key === key);
      expect(checkDeath(g, 'chute').cause).toBe(def.empty);
      expect(checkDeath(g).cause).toBe(def.empty); // sans era: inchangé
    }
  });

  it('les morts « à plein » ignorent l’ère (texte normal même en Avalon)', () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 100 };
      const def = GAUGES.find((x) => x.key === key);
      const mort = checkDeath(g, 'avalon');
      expect(mort.side).toBe('full');
      expect(mort.cause).toBe(def.full);
    }
  });

  it('aucune mort quand toutes les jauges sont saines', () => {
    expect(checkDeath(vivant, 'avalon')).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer le test — il doit échouer**

Run: `npx vitest run test/gauges-mort-avalon.test.js`
Expected: FAIL — `g.avalonEmpty` est `undefined`.

- [ ] **Step 3 : Ajouter les textes dans `src/config.js`**

Ajouter un champ `avalonEmpty` à chacune des 4 entrées de `GAUGES`. Mettre à jour le commentaire au-dessus du tableau :

```js
// Les 4 jauges. `key` est l'identifiant utilisé dans les effets de carte.
// `empty` = mort quand la jauge tombe à 0 ; `full` = mort quand elle atteint 100.
// `avalonEmpty` = mort à 0 pendant l'épilogue d'Avalon : le roi ne se fait pas
// renverser, il s'éteint. Voir spec 2026-07-15-avalon-declin-design §3.2.
```

Les 4 textes, à insérer chacun après le `full:` de sa jauge :

```js
// foi
avalonEmpty:
  "Le dernier prêtre a quitté ton chevet. Tu t'éteins sans viatique, sans absolution, et nul à Logres n'ose dire où s'en va ton âme.",
```

```js
// magie
avalonEmpty:
  "La brume monte sur le lac, et la barque ne vient pas. Morgane a détourné les yeux : tu meurs homme, non roi de légende — et nulle Avalon ne te reprendra.",
```

```js
// chevalerie
avalonEmpty:
  "Aucun chevalier ne veille ton dernier souffle. La Table Ronde n'est plus qu'un meuble dans une salle vide, et tu t'éteins sans qu'une épée se lève.",
```

```js
// couronne
avalonEmpty:
  "La couronne a glissé de ton front avant que ton cœur ne s'arrête. Logres n'enterre pas un roi : elle range un vieil homme.",
```

**Note d'intention (ne pas réécrire ces textes à la légère) :** le `magie` porte volontairement la charge mythique par la négation. Aujourd'hui la mort la plus fréquente en Avalon est magie=100 → « Les fées d'Avalon te réclament ; Morgane t'emporte hors du monde », la plus belle fin du jeu, que le déclin rend injoignable. Le nouveau texte la récupère en creux : laisser mourir la magie, c'est se voir refuser Avalon. Voir spec §3.2.

- [ ] **Step 4 : Étendre `checkDeath` dans `src/game/gauges.js`**

Remplacer la fonction entière :

```js
/**
 * Renvoie la première mort déclenchée (jauge à 0 ou à 100), ou null.
 * L'ordre suit GAUGES pour un résultat déterministe.
 * `era` (optionnel) sélectionne les textes d'agonie d'Avalon pour les morts
 * « à vide » : on ne renverse pas un mourant. Sans `era`, comportement inchangé.
 * @returns {{key:string, side:'empty'|'full', cause:string}|null}
 */
export function checkDeath(gauges, era = null) {
  for (const g of GAUGES) {
    const v = gauges[g.key];
    if (v <= GAUGE_MIN) {
      const cause = era === 'avalon' && g.avalonEmpty ? g.avalonEmpty : g.empty;
      return { key: g.key, side: 'empty', cause };
    }
    if (v >= GAUGE_MAX) return { key: g.key, side: 'full', cause: g.full };
  }
  return null;
}
```

- [ ] **Step 5 : Lancer le test — il doit passer**

Run: `npx vitest run test/gauges-mort-avalon.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6 : Lancer toute la suite (non-régression, `combat.js` inclus)**

Run: `npx vitest run`
Expected: PASS — 99 tests. Aucun test de combat ne doit casser : `combat.js` appelle toujours `checkDeath(gauges)` sans `era`.

- [ ] **Step 7 : Commit**

```bash
git add src/config.js src/game/gauges.js test/gauges-mort-avalon.test.js
git commit -m "feat(logres): textes de mort propres à Avalon (on ne renverse pas un mourant)"
```

---

### Task 3 : Câbler le déclin dans `reign.choose()`

**Files:**
- Modify: `src/game/reign.js` (import ligne 6 ; `choose()` lignes ~71-105)
- Test: `test/reign-declin.test.js` (créer)

**Interfaces:**
- Consumes: `applyDeclin` (Task 1) et `checkDeath(gauges, era)` (Task 2), tous deux depuis `./gauges.js`.
- Produces: rien de nouveau à l'export. `choose()` garde sa signature `(reign, side, rng?) => reign`.

**Le piège à ne pas rater.** `choose()` fait aujourd'hui, dans l'ordre : effets → flags → `years += 1` → **recalcul de `reign.era`** → `checkDeath`. `reign.era` est donc **déjà réécrit** quand la mort est testée. Passer `reign.era` à `checkDeath` provoquerait un bug de bord : à la bascule an 43 → 44, une mort causée par une carte de **la Chute** afficherait un texte **d'Avalon**. D'où la capture de `eraPlayed` en tête. Voir spec §3.1.

**Décision assumée — les duels n'érodent pas.** La branche `choice.combat` de `choose()` retourne tôt (`return reign`) : un tour qui ouvre un duel ne déclenche pas le déclin, et `resolveManoeuvre` non plus. Un duel est un instant, pas une année d'agonie. C'est **voulu** : ne pas ajouter de déclin dans `combat.js`.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `test/reign-declin.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { choose } from '../src/game/reign.js';
import { createFlags, setFlag } from '../src/game/flags.js';
import { AVALON_DECLIN, GAUGES } from '../src/config.js';

// Règne minimal avec une carte déjà présentée.
function reignAvec(era, years, gauges, card) {
  return {
    years,
    era,
    gauges: { foi: 50, magie: 50, chevalerie: 50, couronne: 50, ...gauges },
    flags: createFlags(),
    current: card,
    next: null,
    dead: null,
    miracle: null,
    combat: null,
  };
}

const carteNeutre = {
  id: 'test.neutre',
  era: 'avalon',
  speaker: 'Merlin',
  text: 'test',
  left: { label: 'a', effects: {} },
  right: { label: 'b', effects: {} },
};

describe('Le Déclin dans reign.choose()', () => {
  it('un tour joué en Avalon érode les 4 jauges', () => {
    const r = choose(reignAvec('avalon', 50, {}, carteNeutre), 'left');
    expect(r.gauges).toEqual({
      foi: 50 - AVALON_DECLIN,
      magie: 50 - AVALON_DECLIN,
      chevalerie: 50 - AVALON_DECLIN,
      couronne: 50 - AVALON_DECLIN,
    });
  });

  it('aucune autre ère n’érode', () => {
    for (const era of ['roche', 'camelot', 'graal', 'chute']) {
      const r = choose(reignAvec(era, 10, {}, { ...carteNeutre, era }), 'left');
      expect(r.gauges, `ère ${era}`).toEqual({ foi: 50, magie: 50, chevalerie: 50, couronne: 50 });
    }
  });

  it('le déclin s’applique APRÈS les effets de la carte', () => {
    const carte = { ...carteNeutre, left: { label: 'a', effects: { foi: +10 } } };
    const r = choose(reignAvec('avalon', 50, {}, carte), 'left');
    expect(r.gauges.foi).toBe(50 + 10 - AVALON_DECLIN);
  });

  it('le déclin peut tuer, avec le texte d’Avalon', () => {
    const carte = { ...carteNeutre, left: { label: 'a', effects: {} } };
    const r = choose(reignAvec('avalon', 50, { foi: 2 }, carte), 'left');
    expect(r.dead).not.toBeNull();
    expect(r.dead.key).toBe('foi');
    expect(r.dead.cause).toBe(GAUGES.find((g) => g.key === 'foi').avalonEmpty);
  });

  // Le bug de bord de la spec §3.1 : la carte jouée appartenait à la Chute.
  it('la bascule an 43 → 44 n’érode pas et garde le texte de la Chute', () => {
    const carte = { ...carteNeutre, era: 'chute', left: { label: 'a', effects: { foi: -50 } } };
    const r = choose(reignAvec('chute', 43, { foi: 2 }, carte), 'left');
    expect(r.era).toBe('avalon'); // on vient d'entrer dans l'ère
    expect(r.gauges.magie).toBe(50); // pas de déclin sur le tour de bascule
    expect(r.dead.cause).toBe(GAUGES.find((g) => g.key === 'foi').empty); // texte Chute
  });

  it('le Fourreau boit une mort par déclin (non-régression)', () => {
    const r0 = reignAvec('avalon', 50, { foi: 2 }, carteNeutre);
    setFlag(r0.flags, 'relique.fourreau');
    const r = choose(r0, 'left');
    expect(r.dead).toBeNull();
    expect(r.gauges.foi).toBe(15); // RESCUE_EMPTY
    expect(r.miracle).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer le test — il doit échouer**

Run: `npx vitest run test/reign-declin.test.js`
Expected: FAIL — le 1ᵉʳ test montre des jauges à 50 (aucun déclin câblé).

- [ ] **Step 3 : Étendre l'import dans `src/game/reign.js`**

Ligne 6, ajouter `applyDeclin` :

```js
import { createGauges, applyEffects, applyDeclin, checkDeath } from './gauges.js';
```

- [ ] **Step 4 : Câbler dans `choose()`**

Dans `src/game/reign.js`, **après** la garde `if (reign.combat) return resolveManoeuvre(reign, side);` et les validations de `card`/`choice`, capturer l'ère jouée. Le plus sûr : juste avant `if (choice.combat) {`, ajouter :

```js
  // L'ère de la carte qu'on vient de jouer. `reign.era` sera réécrit plus bas par
  // eraForYears() : s'en servir pour le déclin ou le texte de mort donnerait un
  // texte d'Avalon à une mort causée par une carte de la Chute (bascule an 43→44).
  const eraPlayed = reign.era;
```

Puis remplacer le bloc qui va de `reign.miracle = null;` (le second, ligne ~86) jusqu'au `return reign;` final par :

```js
  reign.miracle = null;
  reign.gauges = applyEffects(reign.gauges, empowerEffects(choice.effects, reign.flags));
  applyFlags(reign.flags, choice.flags);
  // Le Déclin : en Avalon, Logres échappe au roi mourant. Après les effets, car
  // le joueur doit pouvoir choisir la jauge qu'il défend en dernier.
  if (eraPlayed === 'avalon') reign.gauges = applyDeclin(reign.gauges);
  reign.years += 1;
  reign.era = eraForYears(reign.years);
  reign.next = choice.next ?? null;
  reign.current = null;
  reign.dead = checkDeath(reign.gauges, eraPlayed);

  // Le Fourreau peut boire le coup mortel (une seule fois).
  if (reign.dead) {
    const saved = tryCancelDeath(reign.gauges, reign.dead, reign.flags);
    if (saved) {
      reign.gauges = saved.gauges;
      // une AUTRE jauge peut avoir lâché au même tour — le miracle n'y peut rien
      reign.dead = checkDeath(reign.gauges, eraPlayed);
      reign.miracle = reign.dead ? null : saved.message;
    }
  }
  return reign;
```

**Les deux** appels à `checkDeath` prennent `eraPlayed` — celui d'après le sauvetage du Fourreau aussi.

- [ ] **Step 5 : Lancer le test — il doit passer**

Run: `npx vitest run test/reign-declin.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6 : Lancer toute la suite + le build**

Run: `npx vitest run && npx vite build`
Expected: PASS — 105 tests, build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/game/reign.js test/reign-declin.test.js
git commit -m "feat(logres): Le Déclin — les jauges s'érodent chaque tour en Avalon"
```

---

### Task 4 : Cinq cartes rejouables d'épilogue

**Files:**
- Modify: `src/game/cards/lateEras.js` (tableau `avalon`, après `avalon.filler.memoire`, ligne ~1047)
- Test: `test/cartes-avalon.test.js` (créer)

**Interfaces:**
- Consumes: `CARDS` de `./cards/index.js`, `PORTRAITS` de `./portraits.js`.
- Produces: 5 cartes non-`unique` dans le tableau `avalon`. Aucun export nouveau.

**Pourquoi 5, et pourquoi ces axes.** Avalon n'a que 2 cartes rejouables, d'où 68 % de fillers. Elles occupent les axes **magie↔chevalerie** (`filler.excalibur`) et **foi↔couronne** (`filler.memoire`). Les 4 paires restantes ne sont donc pas couvertes : le joueur n'a aucun levier pour choisir la jauge qu'il défend en dernier — or c'est tout le sel du Déclin (spec §2). Les 5 cartes ci-dessous couvrent **foi↔chevalerie, couronne↔magie, chevalerie↔couronne, magie↔foi**, plus une 5ᵉ sur foi↔magie.

**Contraintes de contenu :**
- Pas de `unique: true` — elles doivent pouvoir revenir.
- Ton d'agonie : on ne gouverne plus. On règle des comptes, on se souvient, on prépare la légende. **Pas de dilemme de gestion du royaume** — Arthur n'est plus en état de lever un impôt.
- Orateurs pris dans ceux **déjà mappés** dans `PORTRAITS` (sinon `domainFor` retombe silencieusement sur `peuple` et le cadre de carte est faux).
- Ne doublonnent aucune carte Avalon existante : `barque`, `bedivere`, `moines`, `roi.futur`, `dame.adieu`, `confession`, `barde.legende`, `heritier.dernier`, `merlin.prophetie`, `peuple.tombeau`, `ermite.pardon`, `camlann.songes`, `uther.heritier`, `morgane.*`, `brume.avalon`, et les 2 fillers.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `test/cartes-avalon.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { CARDS } from '../src/game/cards/index.js';
import { PORTRAITS } from '../src/game/portraits.js';
import { GAUGE_KEYS } from '../src/config.js';

const avalon = CARDS.filter((c) => c.era === 'avalon');
const rejouables = avalon.filter((c) => !c.unique);

describe('contenu d’Avalon', () => {
  it('compte au moins 7 cartes rejouables (2 fillers + 5 neuves)', () => {
    expect(rejouables.length).toBeGreaterThanOrEqual(7);
  });

  it('chaque orateur d’Avalon est mappé dans PORTRAITS (sinon cadre faux)', () => {
    for (const c of avalon) {
      expect(PORTRAITS[c.speaker], `carte ${c.id} — orateur « ${c.speaker} »`).toBeTruthy();
    }
  });

  it('les cartes rejouables offrent un vrai arbitrage entre deux jauges', () => {
    for (const c of rejouables) {
      for (const side of ['left', 'right']) {
        const eff = c[side].effects;
        const keys = Object.keys(eff);
        expect(keys.length, `${c.id}.${side}`).toBeGreaterThanOrEqual(2);
        expect(keys.some((k) => eff[k] > 0), `${c.id}.${side} — aucun gain`).toBe(true);
        expect(keys.some((k) => eff[k] < 0), `${c.id}.${side} — aucun coût`).toBe(true);
        for (const k of keys) expect(GAUGE_KEYS, `${c.id}.${side} — clé ${k}`).toContain(k);
      }
    }
  });

  it('les 4 jauges sont toutes défendables par au moins une carte rejouable', () => {
    for (const key of GAUGE_KEYS) {
      const peutMonter = rejouables.some((c) =>
        ['left', 'right'].some((s) => (c[s].effects[key] ?? 0) > 0)
      );
      expect(peutMonter, `aucune carte rejouable ne fait monter ${key}`).toBe(true);
    }
  });

  it('les identifiants sont uniques', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2 : Lancer le test — il doit échouer**

Run: `npx vitest run test/cartes-avalon.test.js`
Expected: FAIL — `rejouables.length` vaut 2, attendu ≥ 7.

- [ ] **Step 3 : Ajouter les 5 cartes dans `src/game/cards/lateEras.js`**

Dans le tableau `avalon`, juste après l'objet `avalon.filler.memoire`, insérer :

```js
  // Épilogue rejouable (2026-07-15). Ton d'agonie : on ne gouverne plus, on règle
  // des comptes. Couvrent les axes que les 2 fillers historiques laissaient vides,
  // pour que le joueur puisse choisir la jauge qu'il défend en dernier (Le Déclin).
  {
    id: 'avalon.filler.veille',
    era: 'avalon',
    speaker: 'Un moine',
    text: "On veille ton sommeil, Sire. Faut-il prier pour ton âme — ou chanter tes batailles ?",
    left: { label: 'Qu’on prie', effects: { foi: +6, chevalerie: -5 } },
    right: { label: 'Qu’on chante', effects: { chevalerie: +6, foi: -5 } },
    weight: 2,
  },
  {
    id: 'avalon.filler.visiteurs',
    era: 'avalon',
    speaker: 'Le peuple',
    text: "Ils viennent de trois jours de marche pour toucher ton manteau, Sire. On ouvre les portes, ou on te laisse partir en paix ?",
    left: { label: 'Qu’ils entrent', effects: { couronne: +6, magie: -5 } },
    right: { label: 'La paix', effects: { magie: +6, couronne: -5 } },
    weight: 2,
  },
  {
    id: 'avalon.filler.frontiere',
    era: 'avalon',
    speaker: 'Un chevalier',
    text: "Les Saxons savent que tu meurs, Sire. On tient la frontière — ou on rentre te veiller ?",
    left: { label: 'Tenez la frontière', effects: { chevalerie: +7, couronne: -5 } },
    right: { label: 'Rentrez', effects: { couronne: +6, chevalerie: -6 } },
    weight: 2,
  },
  {
    id: 'avalon.filler.brume',
    era: 'avalon',
    speaker: 'La Dame du Lac',
    text: "La brume monte sur le lac, roi de Logres. Elle t'attend. La regarderas-tu venir — ou fermeras-tu les yeux ?",
    left: { label: 'La regarder', effects: { magie: +7, foi: -6 } },
    right: { label: 'Fermer les yeux', effects: { foi: +7, magie: -6 } },
    weight: 2,
  },
  {
    id: 'avalon.filler.heaume',
    era: 'avalon',
    speaker: 'Un barde',
    text: "On se dispute déjà tes affaires, Sire : ton heaume, ton manteau, ta coupe. Reliques saintes — ou butin de guerre ?",
    left: { label: 'Reliques', effects: { foi: +6, magie: -5 } },
    right: { label: 'Butin', effects: { magie: +5, foi: -5 } },
    weight: 1,
  },
```

- [ ] **Step 4 : Lancer le test — il doit passer**

Run: `npx vitest run test/cartes-avalon.test.js`
Expected: PASS (5 tests).

Si « chaque orateur est mappé » échoue, c'est qu'un `speaker` ci-dessus n'est pas une clé de `src/game/portraits.js` : corriger le libellé pour coller **exactement** à une clé existante (ex. `'Un moine'`, `'La Dame du Lac'`), **ne pas** ajouter d'entrée à `PORTRAITS`.

- [ ] **Step 5 : Lancer toute la suite + le build**

Run: `npx vitest run && npx vite build`
Expected: PASS — 110 tests, build OK.

- [ ] **Step 6 : Commit**

```bash
git add src/game/cards/lateEras.js test/cartes-avalon.test.js
git commit -m "feat(logres): 5 cartes rejouables d'épilogue pour Avalon"
```

---

### Task 5 : Recalibrer `AVALON_DECLIN` et vérifier les gates

**Files:**
- Create (jetable, **supprimé en fin de tâche**) : `_sim-avalon.mjs` à la racine de `2nd_Slop/`
- Modify (seulement si la mesure l'exige) : `src/config.js` (`AVALON_DECLIN`)

**Interfaces:**
- Consumes: `CARDS`, `pickCard`, `eraForYears`, `createFlags`/`applyFlags`, `applyDeclin`, `RECENT_LIMIT`, `AVALON_DECLIN`.
- Produces: aucun code de production nouveau. Un chiffre validé et un rapport chiffré pour Jael.

**Pourquoi cette tâche existe.** `AVALON_DECLIN = 3` a été calibré sur le contenu **d'avant** la Task 4. Les 5 cartes neuves changent les dynamiques de jauges : le chiffre doit être **revalidé, pas supposé** (spec §3.1).

**Gates à tenir :**
- Médiane des tours passés en Avalon **dans 8-12**.
- Part des fillers historiques (`filler.excalibur` + `filler.memoire`) parmi les cartes Avalon vues **< 40 %** (68 % avant).

**Réserve de méthode à rappeler dans le rapport :** la simulation joue gauche/droite à pile ou face ; un joueur réel pilote ses jauges et tiendra plus longtemps. Les valeurs absolues sont indicatives — c'est le classement relatif qui guide, et le gate visuel qui tranche.

- [ ] **Step 1 : Écrire le script de simulation**

Créer `_sim-avalon.mjs` à la racine de `2nd_Slop/` :

```js
import { CARDS } from './src/game/cards/index.js';
import { pickCard } from './src/game/deck.js';
import { eraForYears } from './src/game/reign.js';
import { createFlags, applyFlags } from './src/game/flags.js';
import { applyDeclin } from './src/game/gauges.js';
import { RECENT_LIMIT, AVALON_DECLIN } from './src/config.js';

function rng32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v) => Math.max(0, Math.min(100, v));
const FILLERS_HISTO = ['avalon.filler.excalibur', 'avalon.filler.memoire'];

function runReign(rng, decay) {
  const gauges = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };
  const seen = new Set();
  const flags = createFlags();
  let recent = [];
  let years = 0, avalonTurns = 0, histo = 0;

  for (let i = 0; i < 400; i++) {
    const era = eraForYears(years);
    const card = pickCard(CARDS, { gauges, flags, era, seen, recent }, rng);
    if (!card) break;
    if (era === 'avalon') { avalonTurns++; if (FILLERS_HISTO.includes(card.id)) histo++; }
    seen.add(card.id);
    recent = [card.id, ...recent].slice(0, RECENT_LIMIT);
    const side = rng() < 0.5 ? card.left : card.right;
    for (const [k, v] of Object.entries(side?.effects ?? {})) {
      if (gauges[k] !== undefined) gauges[k] = clamp(gauges[k] + v);
    }
    applyFlags(flags, side?.flags ?? []);
    if (era === 'avalon') Object.assign(gauges, applyDeclin(gauges, decay));
    years++;
    if (Object.values(gauges).some((g) => g <= 0 || g >= 100)) break;
  }
  return { avalonTurns, histo };
}

const N = 3000;
console.log(`AVALON_DECLIN courant = ${AVALON_DECLIN}`);
console.log('decay | tours Avalon (med/p90/max) | part fillers historiques');
for (const decay of [2, 3, 4]) {
  const lens = [];
  let histo = 0, tot = 0;
  for (let s = 0; s < N; s++) {
    const r = runReign(rng32(s + 1), decay);
    if (r.avalonTurns > 0) lens.push(r.avalonTurns);
    histo += r.histo; tot += r.avalonTurns;
  }
  lens.sort((a, b) => a - b);
  const q = (p) => lens[Math.floor(lens.length * p)] ?? 0;
  const pct = tot ? ((histo / tot) * 100).toFixed(1) : '0';
  const ok = q(0.5) >= 8 && q(0.5) <= 12 && Number(pct) < 40 ? 'GATE OK' : '—';
  console.log(
    `${String(decay).padStart(5)} | ${String(q(0.5)).padStart(3)} / ${String(q(0.9)).padStart(3)} / ` +
      `${String(lens[lens.length - 1] ?? 0).padStart(3)}        | ${pct.padStart(5)} %   ${ok}`
  );
}
```

- [ ] **Step 2 : Lancer la simulation**

Run: `node _sim-avalon.mjs`
Expected: un tableau de 3 lignes. Au moins une ligne doit afficher `GATE OK`.

- [ ] **Step 3 : Ajuster `AVALON_DECLIN` si nécessaire**

Si la ligne `decay = 3` n'affiche pas `GATE OK` mais qu'une autre le fait, mettre à jour `src/config.js` avec cette valeur et **mettre à jour le commentaire** (« Calibré par simulation : médiane ~N tours »). Si **aucune** ligne ne tient les deux gates, ne pas bricoler le chiffre : **arrêter et remonter le problème à Jael** avec le tableau — cela voudrait dire que le contenu de la Task 4 est insuffisant, pas que le déclin est mal réglé.

- [ ] **Step 4 : Supprimer le script jetable**

```bash
rm _sim-avalon.mjs
```

Ce n'est **pas** un test permanent : il dépend d'un modèle de joueur (pile ou face) trop grossier pour garder la suite honnête.

- [ ] **Step 5 : Vérification finale**

Run: `npx vitest run && npx vite build`
Expected: 110 tests PASS, build OK.

- [ ] **Step 6 : Commit (uniquement si `AVALON_DECLIN` a bougé)**

```bash
git add src/config.js
git commit -m "tune(logres): recalibrer AVALON_DECLIN après le contenu d'épilogue"
```

- [ ] **Step 7 : Rapport à Jael + gate visuel**

Présenter : le tableau de calibration final, la médiane des tours d'Avalon, la part de fillers avant/après (68 % → N %), et la réserve de méthode ci-dessus. Puis lancer le jeu, mener une partie jusqu'en Avalon, et faire lire à Jael les 5 cartes neuves **et** un texte de mort d'Avalon. C'est lui qui tranche le game-feel.

---

## Notes pour l'exécutant

- **Ne pas toucher `src/game/combat.js`.** Il appelle `checkDeath(gauges)` sans `era` et c'est voulu (spec §4) : mourir l'épée à la main est une mort *active*, les textes existants y sonnent juste.
- **Ne pas ajouter de borne `until` à Avalon** dans `ERAS`. Le déclin borne l'ère par la mortalité, pas par le calendrier.
- **Ne pas nettoyer le champ mort `filler: true`** (présent sur 10 cartes, lu par aucune logique). Hors périmètre.
- **Ne pas réintégrer les commons dans Avalon.** Leur exclusion est un choix narratif, pas un bug.
