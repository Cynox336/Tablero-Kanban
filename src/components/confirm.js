export function createConfirmController(elements) {
  const { dialog, titleEl, messageEl, cancelBtn, deleteBtn } = elements;

  let resolvePromise = null;

  function show(title, message) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.showModal();

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  deleteBtn.addEventListener('click', () => {
    resolvePromise?.(true);
    resolvePromise = null;
    dialog.close();
  });

  cancelBtn.addEventListener('click', () => {
    resolvePromise?.(false);
    resolvePromise = null;
    dialog.close();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInside =
      rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
    if (!clickedInside) {
      resolvePromise?.(false);
      resolvePromise = null;
      dialog.close();
    }
  });

  /* Si el usuario cierra con Escape */
  dialog.addEventListener('cancel', () => {
    resolvePromise?.(false);
    resolvePromise = null;
  });

  return { show };
}
