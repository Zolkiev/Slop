# Passe de contenu narratif de Logres — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer Logres de ~60 à ~150 cartes en aboutissant 4 arcs narratifs émergents (Mordred, Lancelot & Guenièvre, Graal, Excalibur & le Fourreau) et en étoffant le deck de chaque ère.

**Architecture:** Contenu 100 % data-driven — chaque carte est un objet dans `src/game/cards/*.js`. Les arcs sont des chaînes de flags réparties sur les ères (crochet précoce → suites gated par `requires` → dénouement branché selon les jauges). Aucun changement de moteur. Les tests d'invariants (Vitest) sont le filet de sécurité et le critère d'acceptation.

**Tech Stack:** Vanilla JS (ES modules), Vitest. Zéro dépendance runtime.

## Global Constraints

- **Roster fermé** : `speaker` ∈ clés de `PORTRAITS` (`src/game/portraits.js`, 26 entrées). Aucun perso nommé récurrent hors de cette liste. Figures sans portrait → « Un ermite »/« Un moine »/« Un chevalier ».
- **Ton** : épique avec une pointe d'ironie. Dilemmes courts (2-3 lignes), deux labels tranchés.
- **Format de carte** : voir `docs/DESIGN.md §3`. Champs : `id, era, speaker, text, left{label,effects,flags?,requires n/a}, right{...}, requires?, weight, unique?, filler?`.
- **Effets** : ciblent uniquement `foi|magie|chevalerie|couronne`. Magnitudes : beats d'arc ±6..14, cartes standalone/filler ±3..8.
- **Ids uniques**, en `ere.sujet.detail` (kebab par points, cohérent avec l'existant).
- **Déferral** = `era` (ère(s) ultérieure(s)) + `requires` sur le flag du beat précédent. **Pas de `next`.**
- **Aucun changement moteur** (`deck.js`, `reign.js`, `gauges.js`, `flags.js`, `relics.js`, `config.js`). Exception conditionnelle : `requires.yearsMin` seulement si un arc se tasse au test (voir spec §7) — hors de ce plan sauf besoin constaté.
- **Gate de chaque tâche** : `npm test` vert, dont le fuzz 1000 règnes.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `test/invariants.test.js` | Filet de sécurité contenu + jouabilité | Modifier (Task 1) |
| `src/game/cards/roche.js` | Ère 1 — beats + standalone | Modifier (Tasks 2, 5, 6) |
| `src/game/cards/camelot.js` | Ère 2 — beats + standalone | Modifier (Tasks 2, 3, 5, 7) |
| `src/game/cards/lateEras.js` | Ères 3-5 (`graal`/`chute`/`avalon`) — beats + standalone | Modifier (Tasks 2, 3, 4, 5, 8, 9, 10) |
| `src/game/cards/common.js` | Cartes multi-ères | Modifier (Task 11) |

Les cartes s'ajoutent aux tableaux exportés existants (`roche`, `camelot`, `graal`, `chute`, `avalon`, `common`). `index.js` les agrège déjà — **ne pas le modifier**.

---

## Task 1 : Étendre les tests d'invariants

**Files:**
- Modify: `test/invariants.test.js`

**Interfaces:**
- Consumes: `CARDS`, `ERAS`, `GAUGE_KEYS` (déjà importés dans le fichier).
- Produces: deux nouveaux `it(...)` dans le `describe('intégrité du deck')`.

> Note : le test « chaque orateur a un portrait » et « chaque ère a un filler sans condition » **existent déjà** (lignes ~63 et ~69). On ajoute deux garde-fous : ordre des flags par ère, et équilibre des jauges par ère. Ils **passent déjà** sur le contenu actuel — ce sont des garde-fous de régression pour les tâches suivantes.

- [ ] **Step 1 : Ajouter les deux tests** dans `describe('intégrité du deck', ...)`, juste avant sa fermeture `});` (après le test des fillers).

```js
  // Rang d'une ère (roche=0 … avalon=4).
  const ERA_RANK = Object.fromEntries(ERAS.map((e, i) => [e.id, i]));
  const eraRanks = (c) =>
    c.era == null
      ? ERAS.map((_, i) => i)
      : (Array.isArray(c.era) ? c.era : [c.era]).map((id) => ERA_RANK[id]).filter((r) => r != null);
  const minEraRank = (c) => {
    const r = eraRanks(c);
    return r.length ? Math.min(...r) : 0;
  };
  const posersOf = (flag) =>
    CARDS.filter((p) =>
      ['left', 'right'].some((s) =>
        (p[s]?.flags ?? []).some((e) => (Array.isArray(e) ? e[0] : e) === flag)));

  it('tout flag requis est posable à une ère ≤ celle où il est requis', () => {
    for (const c of CARDS) {
      const r = c.requires;
      if (!r) continue;
      const consumerRank = minEraRank(c);
      for (const f of [...(r.allFlags ?? []), ...(r.anyFlags ?? [])]) {
        const posers = posersOf(f);
        expect(posers.length, `flag jamais posé: ${f} (requis par ${c.id})`).toBeGreaterThan(0);
        const earliest = Math.min(...posers.map(minEraRank));
        expect(earliest, `flag ${f} posé trop tard (rang ${earliest}) pour ${c.id} (rang ${consumerRank})`)
          .toBeLessThanOrEqual(consumerRank);
      }
    }
  });

  it('chaque ère vivante peut monter ET baisser chaque jauge', () => {
    const LIVING = ['roche', 'camelot', 'graal', 'chute'];
    const inEra = (c, eraId) =>
      c.era == null || (Array.isArray(c.era) ? c.era.includes(eraId) : c.era === eraId);
    for (const eraId of LIVING) {
      const pool = CARDS.filter((c) => inEra(c, eraId));
      for (const key of GAUGE_KEYS) {
        const up = pool.some((c) => ['left', 'right'].some((s) => (c[s]?.effects?.[key] ?? 0) > 0));
        const down = pool.some((c) => ['left', 'right'].some((s) => (c[s]?.effects?.[key] ?? 0) < 0));
        expect(up, `${eraId}: aucune carte ne monte ${key}`).toBe(true);
        expect(down, `${eraId}: aucune carte ne baisse ${key}`).toBe(true);
      }
    }
  });
```

- [ ] **Step 2 : Lancer les tests, vérifier le vert.**

Run: `npm test`
Expected: PASS (tous les fichiers, dont le fuzz 1000 règnes). Les deux nouveaux tests passent d'emblée.

- [ ] **Step 3 : Commit.**

```bash
git add test/invariants.test.js
git commit -m "test(logres): invariants — ordre des flags par ère + équilibre des jauges"
```

---

## Task 2 : Arc Mordred — combler le milieu + climax Camlann

**Files:**
- Modify: `src/game/cards/camelot.js` (ajouter 1 carte)
- Modify: `src/game/cards/lateEras.js` (ajouter 2 cartes dans `chute`, éditer 2 cartes existantes)

**Interfaces:**
- Consumes: flag `mordred.concu` (posé par `roche.morgane.nuit`).
- Produces: flags `mordred.eleve`, `mordred.ecarte`, `mordred.ambitieux`, `camlann`.

- [ ] **Step 1 : Ajouter à `camelot` (dans `camelot.js`) le beat de l'enfant.**

```js
  // ---- Chaîne Mordred : l'enfant grandit (posé à la Roche, éclate à la Chute) ----
  {
    id: 'camelot.mordred.enfant',
    era: 'camelot',
    speaker: 'Morgane',
    text: "L'enfant a tes yeux, frère — et mon sang. L'élèveras-tu à Camelot, sous ton aile, ou l'enverras-tu loin d'ici, où l'on oubliera d'où il vient ?",
    unique: true,
    requires: { allFlags: ['mordred.concu'] },
    left: {
      label: "L'élever à la cour",
      effects: { magie: +4, couronne: +2, foi: -6 },
      flags: ['mordred.eleve'],
    },
    right: {
      label: 'Loin de Camelot',
      effects: { foi: +5, chevalerie: -2, magie: -4 },
      flags: ['mordred.ecarte'],
    },
    weight: 2,
  },
```

- [ ] **Step 2 : Ajouter à `graal` (dans `lateEras.js`) le beat du jeune chevalier.**

```js
  {
    id: 'graal.mordred.chevalier',
    era: 'graal',
    speaker: 'Mordred',
    text: "Père — ou « mon roi », si tu préfères. J'ai grandi, et je manie l'épée mieux que tes vieux barons. Donne-moi une place à ta Table… que je serve, ou que je m'ennuie.",
    unique: true,
    requires: { anyFlags: ['mordred.eleve', 'mordred.ecarte'] },
    left: {
      label: 'Le distinguer',
      effects: { chevalerie: +6, couronne: -4 },
      flags: ['mordred.ambitieux'],
    },
    right: {
      label: 'Le tenir en lisière',
      effects: { couronne: +5, chevalerie: -5, magie: -3 },
    },
    weight: 2,
  },
```

- [ ] **Step 3 : Éditer `chute.mordred.guerre`** (dans `lateEras.js`) pour poser le flag `camlann` sur la marche, afin d'enchaîner le duel final.

Remplacer le bloc `left` existant de `chute.mordred.guerre` par :

```js
    left: {
      label: 'Marcher sur Camlann',
      effects: { chevalerie: -14, couronne: +6 },
      flags: ['camlann'],
    },
```

- [ ] **Step 4 : Ajouter à `chute` (dans `lateEras.js`) le climax du duel.**

```js
  {
    id: 'chute.camlann.duel',
    era: ['chute', 'avalon'],
    speaker: 'Bédivère',
    text: "Face à face, enfin : toi et Mordred, au milieu des morts de Camlann. Une dernière charge, Sire. Lève Excalibur.",
    unique: true,
    requires: { allFlags: ['camlann'] },
    left: {
      label: 'Charger Mordred',
      effects: { chevalerie: -30, couronne: +4 },
    },
    right: {
      label: 'Tenter de le raisonner',
      effects: { couronne: -12, foi: +4, magie: -6 },
    },
    weight: 4,
  },
```

> Intensification émergente (pas de variante de carte) : si l'affaire Lancelot a fracturé la Table (`lancelot.banni`) et/ou si le Graal a vidé Camelot (`graal.exode`), la Chevalerie entre déjà basse dans ce duel — le −30 devient fatal. Le Fourreau (s'il est encore porté) boit le coup automatiquement (`relics.js`).

- [ ] **Step 5 : Polir le texte de `chute.mordred.revele`** (facultatif mais recommandé) pour qu'il résonne avec l'histoire de l'enfant. Remplacer son `text` par :

```js
    text: "Père. Oui — père. Le fils que Morgane t'a donné, celui que tu as élevé ou banni, réclame aujourd'hui sa part de Logres. Me nommeras-tu héritier ?",
```

- [ ] **Step 6 : Lancer les tests.**

Run: `npm test`
Expected: PASS. En particulier « ordre des flags » et le fuzz restent verts.

- [ ] **Step 7 : Commit.**

```bash
git add src/game/cards/camelot.js src/game/cards/lateEras.js
git commit -m "feat(logres): arc Mordred — enfant, jeune chevalier, duel de Camlann"
```

---

## Task 3 : Arc Lancelot & Guenièvre — étirer + tisser Mordred

**Files:**
- Modify: `src/game/cards/lateEras.js` (ajouter 1 carte `graal`, 2 cartes `chute`)

**Interfaces:**
- Consumes: `lancelot.cour`, `affaire.tue`, `lancelot.banni`, `mordred.eleve`/`mordred.ecarte`/`mordred.ambitieux`.
- Produces: `affaire.exposee`, `lancelot.banni`, `guenievre.brulee`, `guenievre.sauvee`.

- [ ] **Step 1 : Ajouter à `graal` la tension qui couve.**

```js
  {
    id: 'graal.lancelot.tension',
    era: 'graal',
    speaker: 'Keu',
    text: "Lancelot est rentré de la quête plus glorieux que jamais, et la reine sourit plus qu'il ne sied, Sire. La cour a des yeux.",
    requires: { allFlags: ['lancelot.cour'], noneFlags: ['lancelot.banni'] },
    left: {
      label: 'Les faire surveiller',
      effects: { couronne: +4, chevalerie: -4 },
    },
    right: {
      label: 'Leur faire confiance',
      effects: { chevalerie: +4, foi: -4 },
    },
    weight: 1,
  },
```

- [ ] **Step 2 : Ajouter à `chute` l'exposition par Mordred** (interweave des deux arcs : ne se déclenche que si tu as « fermé les yeux » en ère 2).

```js
  {
    id: 'chute.affaire.mordred',
    era: 'chute',
    speaker: 'Mordred',
    text: "J'ai des lettres, père. De la reine, à Lancelot. Faut-il que toute la cour les lise — ou préfères-tu, encore une fois, ne rien voir ?",
    unique: true,
    requires: {
      allFlags: ['affaire.tue'],
      anyFlags: ['mordred.eleve', 'mordred.ecarte', 'mordred.ambitieux'],
    },
    left: {
      label: 'Que tout éclate',
      effects: { couronne: -6, chevalerie: -8 },
      flags: ['affaire.exposee', 'lancelot.banni'],
    },
    right: {
      label: 'Étouffer encore',
      effects: { couronne: +5, foi: -8, magie: -4 },
    },
    weight: 3,
  },
```

- [ ] **Step 3 : Ajouter à `chute` le procès de la reine.**

```js
  {
    id: 'chute.guenievre.bucher',
    era: 'chute',
    speaker: "L'Évêque",
    text: "La reine adultère doit brûler — la loi de Dieu est claire, Sire. À moins que ton cœur, ou l'épée d'un banni, n'en décide autrement.",
    unique: true,
    requires: { allFlags: ['lancelot.banni'], gauge: { foi: [55, 100] } },
    left: {
      label: 'Le bûcher',
      effects: { foi: +10, chevalerie: -12, couronne: +2 },
      flags: ['guenievre.brulee'],
    },
    right: {
      label: "Qu'on la sauve",
      effects: { chevalerie: +6, couronne: -4, foi: -10 },
      flags: ['guenievre.sauvee'],
    },
    weight: 2,
  },
```

- [ ] **Step 4 : Lancer les tests.**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit.**

```bash
git add src/game/cards/lateEras.js
git commit -m "feat(logres): arc Lancelot/Guenièvre — tension, exposition par Mordred, procès"
```

---

## Task 4 : Arc du Graal — l'exode et le dénouement

**Files:**
- Modify: `src/game/cards/lateEras.js` (ajouter 3 cartes `graal`)

**Interfaces:**
- Consumes: `graal.quete` (posé par `camelot.graal.vision`).
- Produces: `graal.exode`, `graal.atteint`, `graal.echoue`.

- [ ] **Step 1 : Ajouter le grand départ (Camelot se vide).**

```js
  {
    id: 'graal.exode',
    era: 'graal',
    speaker: 'Un héraut',
    text: "La moitié de la Table a sellé ses chevaux pour la coupe, Sire. Béniras-tu ce grand départ — ou rappelleras-tu tes chevaliers avant que Camelot ne sonne creux ?",
    unique: true,
    requires: { allFlags: ['graal.quete'] },
    left: {
      label: 'Bénir le départ',
      effects: { foi: +10, chevalerie: -12 },
      flags: ['graal.exode'],
    },
    right: {
      label: 'Retenir la Table',
      effects: { chevalerie: +8, foi: -8 },
    },
    weight: 3,
  },
```

- [ ] **Step 2 : Ajouter le Roi Pêcheur (la bonne question).**

```js
  {
    id: 'graal.roi.pecheur',
    era: 'graal',
    speaker: 'Un ermite',
    text: "Au château du Graal règne un roi blessé qui ne meurt ni ne guérit, et sa terre pourrit avec lui. Ton chevalier doit poser LA question, Sire — mais laquelle ?",
    unique: true,
    requires: { allFlags: ['graal.quete'] },
    left: {
      label: '« Qui sert-on avec le Graal ? »',
      effects: { foi: +8, magie: +2, couronne: -4 },
    },
    right: {
      label: '« Où est caché le trésor ? »',
      effects: { couronne: +5, foi: -7 },
    },
    weight: 1,
  },
```

- [ ] **Step 3 : Ajouter le dénouement (Galaad atteint le Graal).**

```js
  {
    id: 'graal.galaad.atteint',
    era: ['graal', 'chute'],
    speaker: 'Galaad',
    text: "Sire, je l'ai vu — le Graal, à visage découvert. Ma quête s'achève, et moi avec elle : je monte vers la lumière. Que dira Camelot de ce jour ?",
    unique: true,
    requires: { allFlags: ['graal.quete', 'graal.exode'] },
    left: {
      label: 'Pleurer un saint',
      effects: { foi: +12, chevalerie: -6 },
      flags: ['graal.atteint'],
    },
    right: {
      label: 'Maudire cette quête',
      effects: { chevalerie: +6, foi: -10 },
      flags: ['graal.echoue'],
    },
    weight: 2,
  },
```

- [ ] **Step 4 : Lancer les tests.**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit.**

```bash
git add src/game/cards/lateEras.js
git commit -m "feat(logres): arc du Graal — exode, Roi Pêcheur, dénouement de Galaad"
```

---

## Task 5 : Arc Excalibur & le Fourreau — densifier

**Files:**
- Modify: `src/game/cards/camelot.js` (ajouter 1 carte)
- Modify: `src/game/cards/lateEras.js` (ajouter 1 carte `graal`, 1 carte `chute`, éditer `avalon.bedivere`)

**Interfaces:**
- Consumes: `relique.excalibur`, `relique.fourreau`, `morgane.cour`, `fourreau.perdu`, `excalibur.rendue`.
- Produces: `excalibur.rendue` (aussi posé plus tôt).

- [ ] **Step 1 : Ajouter à `camelot` l'avertissement de Morgane** (arme le vol de la Chute).

```js
  {
    id: 'camelot.morgane.fourreau',
    era: 'camelot',
    speaker: 'Morgane',
    text: "Ce fourreau qui garde ton sang… un si beau travail de fée, frère. Prête-le-moi une nuit, que j'en admire les runes. Que crains-tu donc ?",
    unique: true,
    requires: { allFlags: ['relique.fourreau', 'morgane.cour'], noneFlags: ['fourreau.perdu'] },
    left: {
      label: 'Le lui prêter une nuit',
      effects: { magie: +6, chevalerie: -6 },
    },
    right: {
      label: 'Jamais',
      effects: { foi: +4, magie: -6 },
    },
    weight: 2,
  },
```

- [ ] **Step 2 : Ajouter à `graal` le doute de l'Église sur l'épée païenne.**

```js
  {
    id: 'graal.excalibur.doute',
    era: 'graal',
    speaker: "L'Évêque",
    text: "Cette épée sort d'un lac païen, Sire, non de l'autel de Dieu. Un roi chrétien devrait-il la ceindre encore, en ces temps de sainte quête ?",
    unique: true,
    requires: { allFlags: ['relique.excalibur'], noneFlags: ['excalibur.rendue'] },
    left: {
      label: 'La rendre au lac',
      effects: { foi: +8, chevalerie: -6 },
      flags: ['excalibur.rendue'],
    },
    right: {
      label: 'Elle est à Logres',
      effects: { chevalerie: +6, foi: -6 },
    },
    weight: 1,
  },
```

- [ ] **Step 3 : Éditer `avalon.bedivere`** pour qu'il ne se déclenche pas si l'épée a déjà été rendue plus tôt. Remplacer sa ligne `requires` par :

```js
    requires: { allFlags: ['relique.excalibur'], noneFlags: ['excalibur.rendue'] },
```

- [ ] **Step 4 : Ajouter à `chute` la couleur « roi sans filet ».**

```js
  {
    id: 'chute.sans.fourreau',
    era: 'chute',
    speaker: 'Bédivère',
    text: "Depuis que le Fourreau t'a quitté, tu portes la main à ton flanc à chaque ombre, Sire. Un roi sans protection doit-il mener la charge — ou la commander de loin ?",
    unique: true,
    requires: { allFlags: ['fourreau.perdu'] },
    left: {
      label: 'Mener la charge',
      effects: { chevalerie: +6, couronne: +2 },
    },
    right: {
      label: 'Commander de loin',
      effects: { couronne: +4, chevalerie: -5 },
    },
    weight: 1,
  },
```

- [ ] **Step 5 : Lancer les tests.**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6 : Commit.**

```bash
git add src/game/cards/camelot.js src/game/cards/lateEras.js
git commit -m "feat(logres): arc Excalibur/Fourreau — convoitise de Morgane, doute de l'Église, roi sans filet"
```

---

## Tasks 6-11 : cartes standalone (étoffer chaque ère)

**Format commun.** Chaque tâche ajoute N cartes standalone à un tableau d'ère. Ces cartes sont **de la matière de deck** (dilemmes ponctuels, visiteurs récurrents), pas des beats d'arc : la plupart **sans `requires`**, `unique` seulement si le dilemme n'a de sens qu'une fois. Chaque carte suit les Global Constraints (roster fermé, ton, magnitudes ±3..8).

**Directive d'écriture (vaut pour toutes ces tâches) :** pour chaque nouvelle carte, partir de la prémisse fournie (une ligne), écrire 2-3 lignes de dilemme dans la voix du jeu (épique + ironie), et fixer deux labels tranchés avec des effets opposés. **Chaque tâche doit, à elle seule ou avec l'existant, garantir que son ère peut monter ET baisser chaque jauge** (test « équilibre des jauges » de la Task 1). Le gate reste `npm test` vert (intégrité + fuzz 1000 règnes).

**Exemple complet de carte standalone** (patron de voix et de structure à reproduire) :

```js
  {
    id: 'roche.bandits.route',
    era: 'roche',
    speaker: 'Un marchand',
    text: "Des brigands rançonnent la route du sel, Sire, et mes bourses avec. Enverras-tu tes chevaliers nettoyer les bois, ou me faut-il payer les loups ?",
    left: { label: 'Nettoyer les bois', effects: { chevalerie: +6, couronne: -4 } },
    right: { label: 'Débrouille-toi', effects: { couronne: +4, chevalerie: -4 } },
    weight: 1,
  },
```

---

### Task 6 : Standalone — ère `roche` (+12)

**Files:** Modify `src/game/cards/roche.js` (ajouter 12 cartes au tableau `roche`).

**Thèmes** : légitimité fragile, barons rétifs, premiers raids saxons, vieux usages païens contre Église naissante, misère et impôts, superstition du peuple.

- [ ] **Step 1 : Écrire 12 cartes** à partir de ces prémisses (roster : baron, paysan, moine, fée, émissaire saxon, héraut, pèlerin, Keu, Gauvain, L'Évêque, Le roi Lot) :
  1. `roche.bandits.route` — *(déjà écrite ci-dessus, l'inclure)*.
  2. `roche.baron.hommage` — un baron refuse de plier le genou devant un roi « sorti d'un caillou ». (couronne/chevalerie)
  3. `roche.moine.ecole` — un moine veut fonder une école de copistes aux frais de la couronne. (foi/couronne)
  4. `roche.fee.moisson` — une fée promet des moissons grasses contre une nuit de danses interdites. (magie/foi)
  5. `roche.saxons.otage` — les Saxons rendent un otage noble… contre un tribut humiliant. (couronne/chevalerie)
  6. `roche.relique.os` — un évêque exhibe les os d'un saint local ; vrais reliques ou vieux mouton ? (foi/magie)
  7. `roche.duel.judiciaire` — deux barons réclament un duel judiciaire pour une terre ; l'arbitrer ou trancher toi-même. (chevalerie/couronne)
  8. `roche.sorciere.puits` — le peuple veut noyer une vieille accusée d'avoir tari un puits. (foi/magie)
  9. `roche.lot.mariage` — le roi Lot propose la paix par un mariage dynastique gênant. (couronne/chevalerie)
  10. `roche.forge.epees` — un forgeron saxon rallié offre de meilleures épées ; l'accueillir malgré les murmures. (chevalerie/foi)
  11. `roche.recolte.dime` — année maigre : maintenir la dîme de l'Église ou soulager les greniers. (foi/couronne)
  12. `roche.chasse.blanche` — un cerf blanc féerique traverse la lande ; le chasser (magie−) ou l'honorer (magie+, couronne−).

- [ ] **Step 2 :** `npm test` → PASS. **Step 3 :** Commit `feat(logres): +12 cartes standalone — ère de la Roche`.

---

### Task 7 : Standalone — ère `camelot` (+14)

**Files:** Modify `src/game/cards/camelot.js` (ajouter 14 cartes au tableau `camelot`).

**Thèmes** : apogée, justice de la Table Ronde, faste et jalousies, diplomatie saxonne, premières fêlures, gloire des champions.

- [ ] **Step 1 : Écrire 14 cartes** (roster : baron, paysan, marchand, barde, L'Évêque, Keu, Gauvain, Perceval, Guenièvre, un conseiller, un émissaire saxon, un héraut) :
  1. `camelot.tournoi.grand` — un grand tournoi attire toute la chevalerie d'Europe, à grands frais. (chevalerie/couronne)
  2. `camelot.pont.taxe` — établir un péage sur les routes prospères de Camelot. (couronne/foi)
  3. `camelot.barde.satire` — un barde raille les barons dans une chanson que tout le monde fredonne. (couronne/chevalerie)
  4. `camelot.saxons.mariage` — Cerdic propose d'épouser une nièce pour sceller la paix. (couronne/chevalerie)
  5. `camelot.eveque.heresie` — l'Église veut juger un prêtre trop savant pour hérésie. (foi/magie)
  6. `camelot.gauvain.serment` — Gauvain jure une quête d'honneur risquée en plein banquet. (chevalerie/couronne)
  7. `camelot.guenievre.hopital` — la reine veut fonder une maison-Dieu pour les pauvres. (foi/couronne)
  8. `camelot.baron.frontiere` — un baron des marches lève l'impôt sans ton accord. (couronne/chevalerie)
  9. `camelot.conseiller.espions` — un conseiller propose un réseau d'espions dans les cours voisines. (couronne/foi)
  10. `camelot.marchand.route` — ouvrir Camelot au commerce lointain, au risque des idées étrangères. (couronne/magie)
  11. `camelot.perceval.epreuve` — Perceval veut prouver sa valeur par une épreuve insensée. (chevalerie/couronne)
  12. `camelot.relique.epine` — on t'offre une épine de la Sainte Couronne, prix d'un comté. (foi/couronne)
  13. `camelot.champ.clos` — deux chevaliers de la Table veulent vider une querelle en champ clos. (chevalerie/couronne)
  14. `camelot.fete.paiens` — le peuple veut garder ses feux de la Saint-Jean, très païens. (magie/foi)

- [ ] **Step 2 :** `npm test` → PASS. **Step 3 :** Commit `feat(logres): +14 cartes standalone — ère de Camelot`.

---

### Task 8 : Standalone — ère `graal` (+14)

**Files:** Modify `src/game/cards/lateEras.js` (ajouter 14 cartes au tableau `graal`).

**Thèmes** : mysticisme, Table qui se dépeuple, faux prophètes et fausses reliques, magie ancienne qui s'efface, tentations d'Avalon, ferveur populaire.

- [ ] **Step 1 : Écrire 14 cartes** (roster : ermite, moine, marchand, pèlerin, L'Évêque, un conseiller, Morgane, La Dame du Lac, Keu, un paysan) :
  1. `graal.visions.foule` — des paysans disent voir des anges ; ferveur ou hystérie à calmer. (foi/couronne)
  2. `graal.ermite.jeune` — un ermite exige que la cour jeûne pour mériter le Graal. (foi/couronne)
  3. `graal.morgane.offre` — Morgane propose de « retrouver » le Graal par magie, à sa façon. (magie/foi)
  4. `graal.faux.prophete` — un prêcheur ameute les foules contre les « rois indignes ». (couronne/foi)
  5. `graal.pierres.effacent` — les cercles de pierres perdent leur pouvoir ; les raviver ou les oublier. (magie/foi)
  6. `graal.chevaliers.perdus` — trois chevaliers ne reviennent pas ; envoyer une recherche coûteuse. (chevalerie/couronne)
  7. `graal.abbaye.don` — une abbaye demande des terres royales pour « garder » une relique. (foi/couronne)
  8. `graal.dame.lac.avertit` — la Dame du Lac prévient que la quête chrétienne offense Avalon. (magie/foi)
  9. `graal.pelerins.affluence` — l'afflux de pèlerins enrichit et encombre Camelot. (couronne/foi)
  10. `graal.moine.copie` — un moine veut consigner tes lois dans un grand livre saint. (foi/couronne)
  11. `graal.marchand.indulgences` — un marchand vend des indulgences au nom de ton règne. (couronne/foi)
  12. `graal.paien.retour` — de vieux cultes renaissent pendant que les chevaliers sont partis. (magie/foi)
  13. `graal.keu.intendance` — Keu peine à tenir une cour à moitié vide ; réduire le train royal. (couronne/chevalerie)
  14. `graal.jeune.roi.voisin` — un roi voisin profite de ta Table vide pour grignoter tes marches. (chevalerie/couronne)

- [ ] **Step 2 :** `npm test` → PASS. **Step 3 :** Commit `feat(logres): +14 cartes standalone — ère du Graal`.

---

### Task 9 : Standalone — ère `chute` (+14)

**Files:** Modify `src/game/cards/lateEras.js` (ajouter 14 cartes au tableau `chute`).

**Thèmes** : guerre civile, désertions, famine, présages funestes, trahisons ordinaires, loyautés qui vacillent, cruauté ou clémence.

- [ ] **Step 1 : Écrire 14 cartes** (roster : Keu, Gauvain, Merlin, un paysan, un baron, un écuyer, L'Évêque, un conseiller, Bédivère, un émissaire saxon) :
  1. `chute.barons.defection` — des barons négocient en secret avec tes ennemis ; sévir ou acheter. (couronne/chevalerie)
  2. `chute.saxons.profitent` — les Saxons relancent les raids pendant la guerre civile. (chevalerie/couronne)
  3. `chute.presage.eclipse` — une éclipse terrifie l'armée ; y lire un signe ou la railler. (magie/foi)
  4. `chute.deserteurs.pendaison` — des déserteurs repris ; l'exemple par la corde ou la clémence. (couronne/chevalerie)
  5. `chute.famine.greniers` — famine : ouvrir les greniers de l'Église malgré l'évêque. (couronne/foi)
  6. `chute.gauvain.vengeance` — Gauvain veut venger un frère mort, au risque d'élargir la guerre. (chevalerie/couronne)
  7. `chute.merlin.ombre` — une voix qui semble être Merlin murmure encore des présages. (magie/foi)
  8. `chute.tresor.fondre` — fondre la vaisselle sacrée pour payer les soldats. (couronne/foi)
  9. `chute.ecuyer.trahison` — un écuyer offre de livrer un traître… pour un titre. (couronne/chevalerie)
  10. `chute.paix.honteuse` — un ennemi propose une paix qui te coûte une province. (couronne/chevalerie)
  11. `chute.eveque.excommunie` — l'évêque menace d'excommunier un allié utile mais impie. (foi/couronne)
  12. `chute.pillards.propres` — tes propres troupes pillent les villages ; punir ou fermer les yeux. (couronne/chevalerie)
  13. `chute.bedivere.conseil` — Bédivère te presse de négocier tant qu'il est temps. (couronne/chevalerie)
  14. `chute.sorts.derniers` — une sorcière offre un sort de victoire au prix d'une âme. (magie/foi)

- [ ] **Step 2 :** `npm test` → PASS. **Step 3 :** Commit `feat(logres): +14 cartes standalone — ère de la Chute`.

---

### Task 10 : Standalone — ère `avalon` (+8)

**Files:** Modify `src/game/cards/lateEras.js` (ajouter 8 cartes au tableau `avalon`).

**Thèmes** : épilogue mythique, mémoire et légende, choix chrétien vs féerique, adieux, ce que Logres retiendra. Ici la mort est proche : dilemmes courts, presque testamentaires.

> Note : l'ère `avalon` est terminale et courte ; l'équilibre strict des jauges n'y est **pas** requis par le test (limité aux ères vivantes). Viser tout de même de la variété foi↔magie.

- [ ] **Step 1 : Écrire 8 cartes** (roster : Morgane, Merlin, La Dame du Lac, un moine, Bédivère, Le peuple, un barde, un ermite) :
  1. `avalon.dame.adieu` — la Dame du Lac vient reprendre ses dons ; les rendre en paix ou t'y accrocher. (magie/chevalerie)
  2. `avalon.confession` — un moine t'offre l'extrême-onction ; te confesser de Morgane ou emporter le secret. (foi/magie)
  3. `avalon.barde.legende` — un barde te demande la vraie fin de ton histoire, pour la chanter. (foi/couronne)
  4. `avalon.heritier.dernier` — désigner d'un souffle qui portera Logres après toi. (couronne/chevalerie)
  5. `avalon.merlin.prophetie` — Merlin promet ton retour « au besoin de la Bretagne » ; y croire. (magie/foi)
  6. `avalon.peuple.tombeau` — le peuple veut un tombeau où pleurer ; le leur laisser ou disparaître. (foi/magie)
  7. `avalon.ermite.pardon` — un ermite te presse de pardonner à Mordred, même mort. (foi/couronne)
  8. `avalon.brume.avalon` — la brume d'Avalon se lève ; la traverser ou regarder Logres une dernière fois. (magie/foi)

- [ ] **Step 2 :** `npm test` → PASS. **Step 3 :** Commit `feat(logres): +8 cartes standalone — ère d'Avalon`.

---

### Task 11 : Cartes `common` (+14) + acceptation finale

**Files:** Modify `src/game/cards/common.js` (ajouter 14 cartes au tableau `common`, `era: ERAS_VIVANTES`).

**Thèmes** : affaires courantes du royaume tout au long du règne — fiscalité, justice, Église vs magie, Saxons, intrigues de cour, petit peuple. Ces cartes garantissent le non-blocage et l'équilibre des jauges à toutes les ères vivantes.

- [ ] **Step 1 : Écrire 14 cartes** `era: ERAS_VIVANTES` (roster : L'Évêque, Merlin, Morgane, Keu, Gauvain, un baron, un paysan, un marchand, un conseiller, un héraut, La Dame du Lac) — chaque carte, deux effets opposés ±4..8 :
  1. `common.justice.appel` — un condamné en appelle à ta justice contre un baron. (couronne/chevalerie)
  2. `common.impot.guerre` — lever un impôt de guerre exceptionnel. (couronne/foi)
  3. `common.eveque.miracle` — l'Église proclame un miracle opportun ; l'endosser. (foi/magie)
  4. `common.morgane.conseil` — Morgane glisse un conseil trop juste pour être honnête. (magie/foi)
  5. `common.gauvain.honneur` — Gauvain exige réparation d'un affront à la Table. (chevalerie/couronne)
  6. `common.saxons.commerce` — troquer avec les Saxons plutôt que les combattre. (couronne/chevalerie)
  7. `common.merlin.augure` — Merlin propose de lire l'avenir dans les entrailles. (magie/foi)
  8. `common.baron.mariage` — arbitrer un mariage qui unit ou divise deux fiefs. (couronne/chevalerie)
  9. `common.paysan.doleances` — une délégation paysanne présente ses doléances. (couronne/foi)
  10. `common.marchand.pret` — un marchand prête gros contre des privilèges. (couronne/foi)
  11. `common.relique.pretre` — un prêtre veut brûler un grimoire « diabolique » saisi. (foi/magie)
  12. `common.heraut.defi` — un roi voisin lance un défi que l'honneur interdit d'ignorer. (chevalerie/couronne)
  13. `common.dame.lac.offrande` — la Dame du Lac réclame une offrande au lac. (magie/couronne)
  14. `common.conseiller.reforme` — un conseiller propose une réforme des lois, impopulaire mais juste. (couronne/foi)

- [ ] **Step 2 : Vérifier le compte total.**

Run:
```bash
node -e "import('./src/game/cards/index.js').then(m=>console.log('total cartes:', m.CARDS.length))"
```
Expected: ~148-156. Si < 145, ajouter quelques cartes standalone dans les ères les plus maigres.

- [ ] **Step 3 : Lancer toute la suite.**

Run: `npm test`
Expected: PASS — intégrité, ordre des flags, équilibre des jauges, et fuzz 1000 règnes sans blocage.

- [ ] **Step 4 : Vérification de jeu (verify manuel).** Lancer `npm run dev`, jouer un règne long en poussant vers la survie, et confirmer qu'on traverse plusieurs ères et qu'au moins un dénouement d'arc apparaît. (Suivre le skill `verify` / le workflow visuel habituel avant merge.)

- [ ] **Step 5 : Commit.**

```bash
git add src/game/cards/common.js
git commit -m "feat(logres): +14 cartes common + passe d'équilibrage — contenu à ~150 cartes"
```

---

## Self-Review (couverture du spec)

- **Spec §1 (4 arcs, ~150, émergent)** → Tasks 2-5 (arcs), 6-11 (volume). ✓
- **Spec §2 invariants** : bornes/non-blocage/flags/next (tests existants, conservés) ; roster (test existant) ; ordre des flags + équilibre jauges (Task 1). ✓
- **Spec §3 répartition** → comptes par tâche : roche +12, camelot +14, graal +14+beats, chute +14+beats, avalon +8, common +14, arcs +12 ≈ 60→~150. ✓
- **Spec §4 analyse d'écart par arc** → Tasks 2-5 reprennent chaque beat `[+]` avec ids/flags réels. ✓
- **Spec §5 standalone (équilibre, roster, ton, thèmes)** → format commun Tasks 6-11 + directive d'équilibre gated par le test. ✓
- **Spec §6 extension des tests** → Task 1 (les deux nouveaux ; les deux déjà-existants notés). ✓
- **Spec §7 aucun changement moteur** → aucune tâche ne touche `src/game/{deck,reign,gauges,flags,relics}.js` ni `config.js`. ✓
- **Spec §8 découpage en sous-lots** → 11 tâches, tests d'abord, un lot par arc puis par ère. ✓
- **Spec §9 acceptation** → Task 11 (compte + suite verte + verify). ✓

Aucun placeholder de logique : les cartes d'arc (load-bearing) sont écrites en entier ; les cartes standalone sont spécifiées par prémisse + effets ciblés + patron de voix, et validées par les tests d'intégrité, d'équilibre et le fuzz.
