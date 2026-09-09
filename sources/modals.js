export function createTaskModalController(elements, onSubmit) {
  const {
    dialog, form, titleEl, titleInput, descriptionInput,
    assigneeInput, tagsInput, priorityInput, cancelBtn,
  } = elements;

  let activeColumnId = null;
  let editingTaskId = null;

  function open(columnId, task = null) {
    activeColumnId = columnId;
    editingTaskId = task ? task.id : null;

    if (task) {
      titleEl.textContent = 'Editar tarea';
      titleInput.value = task.title;
      descriptionInput.value = task.description || '';
      assigneeInput.value = task.assignee || '';
      tagsInput.value = (task.tags || []).join(', ');
      priorityInput.value = task.priority || 'normal';
    } else {
      titleEl.textContent = 'Nueva tarea';
      form.reset();
    }

    dialog.showModal();
    titleInput.focus();
  }

  function close() {
    dialog.close();
    form.reset();
    activeColumnId = null;
    editingTaskId = null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSubmit({
      columnId: activeColumnId,
      taskId: editingTaskId,
      title,
      description: descriptionInput.value.trim(),
      assignee: assigneeInput.value.trim(),
      tags,
      priority: priorityInput.value,
    });

    close();
  });

  cancelBtn.addEventListener('click', close);

  /* Light-dismiss: cerrar al hacer clic en el backdrop */
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInside =
      rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
    if (!clickedInside) close();
  });

  return { open, close };
}

export function createColumnModalController(elements, onSubmit) {
  const { dialog, form, nameInput, cancelBtn } = elements;

  function open() {
    dialog.showModal();
    nameInput.focus();
  }

  function close() {
    dialog.close();
    form.reset();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    onSubmit(name);
    close();
  });

  cancelBtn.addEventListener('click', close);

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInside =
      rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
    if (!clickedInside) close();
  });

  return { open, close };
}
