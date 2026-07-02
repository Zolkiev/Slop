// Overlay DOM isolé pour saisir/copier un code de sauvegarde.
// Seul module UI hors canvas — nécessaire pour le clavier mobile.
export function createCodeInput(doc = document) {
  let overlay = null;
  let messageEl = null;
  let input = null;
  let errorEl = null;
  let okBtn = null;
  let cancelBtn = null;
  let current = null; // { onSubmit, onCancel }

  function submit() {
    if (!current) return;
    const session = current;
    if (session.onSubmit(input.value)) {
      if (current === session) close();
    } else if (current === session) {
      errorEl.textContent = 'CODE INVALIDE';
    }
  }

  function cancel() {
    if (!current) return;
    const cb = current.onCancel;
    close();
    cb();
  }

  function ensure() {
    if (overlay) return;
    overlay = doc.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10;display:flex;align-items:center;'
      + 'justify-content:center;background:rgba(10,10,20,0.85);';
    const box = doc.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;'
      + "font-family:'PressStart2P',monospace;";
    messageEl = doc.createElement('div');
    messageEl.style.cssText = 'color:#ffffff;font-size:12px;';
    input = doc.createElement('input');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.style.cssText = 'width:240px;padding:10px;font-family:inherit;font-size:14px;'
      + 'text-transform:uppercase;background:#0a0a14;color:#3ef0ff;border:2px solid #3ef0ff;'
      + 'outline:none;text-align:center;';
    errorEl = doc.createElement('div');
    errorEl.errorLine = true;
    errorEl.style.cssText = 'color:#ff2e88;font-size:10px;min-height:12px;';
    const row = doc.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;';
    const btnCss = 'padding:10px 18px;font-family:inherit;font-size:12px;cursor:pointer;'
      + 'background:#0a0a14;border:2px solid #3ef0ff;color:#ffffff;';
    okBtn = doc.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = btnCss;
    cancelBtn = doc.createElement('button');
    cancelBtn.textContent = 'ANNULER';
    cancelBtn.style.cssText = btnCss;

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    okBtn.addEventListener('click', (e) => { e.preventDefault(); submit(); });
    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); cancel(); });
    const keyGuard = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    };
    okBtn.addEventListener('keydown', keyGuard);
    cancelBtn.addEventListener('keydown', keyGuard);

    row.appendChild(okBtn);
    row.appendChild(cancelBtn);
    box.appendChild(messageEl);
    box.appendChild(input);
    box.appendChild(errorEl);
    box.appendChild(row);
    overlay.appendChild(box);
  }

  function open({ value = '', message = '', onSubmit, onCancel = () => {} }) {
    ensure();
    current = { onSubmit, onCancel };
    messageEl.textContent = message;
    input.value = value;
    errorEl.textContent = '';
    overlay.style.display = 'flex';
    if (!overlay.mounted) {
      doc.body.appendChild(overlay);
      overlay.mounted = true;
    }
    input.focus();
    if (value) input.select();
  }

  function close() {
    if (!current) return;
    current = null;
    if (overlay) overlay.style.display = 'none';
  }

  return { open, close, isOpen: () => current !== null };
}
