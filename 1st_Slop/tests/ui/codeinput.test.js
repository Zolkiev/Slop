import { describe, it, expect } from 'vitest';
import { createCodeInput } from '../../src/ui/codeinput.js';

function fakeElement(tag) {
  return {
    tag,
    style: {},
    children: [],
    listeners: {},
    value: '',
    textContent: '',
    focused: false,
    removed: false,
    setAttribute() {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    focus() { this.focused = true; },
    select() {},
    remove() { this.removed = true; },
  };
}

function fakeDoc() {
  const body = fakeElement('body');
  return {
    body,
    created: [],
    createElement(tag) {
      const el = fakeElement(tag);
      this.created.push(el);
      return el;
    },
  };
}

function find(doc, tag) {
  return doc.created.filter((e) => e.tag === tag);
}

function keyEvent(key) {
  return {
    key,
    stopped: false,
    prevented: false,
    stopPropagation() { this.stopped = true; },
    preventDefault() { this.prevented = true; },
  };
}

describe('codeinput overlay', () => {
  it('open monte l\'overlay, focus l\'input, porte message et valeur', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ value: 'JB1-XX', message: 'ENTRE TON CODE', onSubmit: () => true, onCancel: () => {} });
    expect(ci.isOpen()).toBe(true);
    expect(doc.body.children.length).toBe(1);
    const input = find(doc, 'input')[0];
    expect(input.value).toBe('JB1-XX');
    expect(input.focused).toBe(true);
  });

  it('Enter: submit true ferme l\'overlay', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let got = null;
    ci.open({ onSubmit: (t) => { got = t; return true; }, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.value = 'jb1-72';
    const e = keyEvent('Enter');
    input.listeners.keydown(e);
    expect(got).toBe('jb1-72');
    expect(ci.isOpen()).toBe(false);
    expect(e.stopped).toBe(true);
  });

  it('Enter: submit false garde l\'overlay et affiche CODE INVALIDE', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => false, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.listeners.keydown(keyEvent('Enter'));
    expect(ci.isOpen()).toBe(true);
    const error = doc.created.find((e) => e.textContent === 'CODE INVALIDE');
    expect(error).toBeTruthy();
  });

  it('Escape annule et ferme', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let cancelled = false;
    ci.open({ onSubmit: () => true, onCancel: () => { cancelled = true; } });
    const input = find(doc, 'input')[0];
    input.listeners.keydown(keyEvent('Escape'));
    expect(cancelled).toBe(true);
    expect(ci.isOpen()).toBe(false);
  });

  it('toute touche stoppe la propagation (le jeu ne la voit pas)', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => true, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    const e = keyEvent('a');
    input.listeners.keydown(e);
    expect(e.stopped).toBe(true);
    expect(ci.isOpen()).toBe(true);
  });

  it('boutons OK / ANNULER cliquables', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let got = null; let cancelled = false;
    ci.open({ onSubmit: (t) => { got = t; return true; }, onCancel: () => { cancelled = true; } });
    const [okBtn, cancelBtn] = find(doc, 'button');
    find(doc, 'input')[0].value = 'X';
    okBtn.listeners.click({ preventDefault() {} });
    expect(got).toBe('X');
    const ci2 = createCodeInput(doc);
    ci2.open({ onSubmit: () => true, onCancel: () => { cancelled = true; } });
    find(doc, 'button')[3].listeners.click({ preventDefault() {} });
    expect(cancelled).toBe(true);
  });

  it('rouvrir réinitialise erreur et valeur', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => false, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.value = 'BAD';
    input.listeners.keydown(keyEvent('Enter')); // submit false -> erreur affichée
    input.listeners.keydown(keyEvent('Escape')); // annule, ferme
    ci.open({ onSubmit: () => true, onCancel: () => {} });
    expect(input.value).toBe('');
    // le module marque la ligne d'erreur (el.errorLine = true) pour la retrouver ici
    const errorEl = doc.created.find((e) => e.tag === 'div' && 'errorLine' in e);
    expect(errorEl.textContent).toBe('');
  });
});
