export function createTaskModalController(elements, onSubmit) {
  const {
    backdrop, form, titleEl, titleInput, descriptionInput,
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

    backdrop.classList.add('open');
    titleInput.focus();
  }

  function close() {
    backdrop.classList.remove('open');
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
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  return { open, close };
}

export function createColumnModalController(elements, onSubmit) {
  const { backdrop, form, nameInput, cancelBtn } = elements;

  function open() {
    backdrop.classList.add('open');
    nameInput.focus();
  }

  function close() {
    backdrop.classList.remove('open');
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
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  return { open, close };
}
