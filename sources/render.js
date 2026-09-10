export function taskMatchesFilters(task, searchQuery, priorityFilter) {
  if (priorityFilter && task.priority !== priorityFilter) return false;

  if (!searchQuery) return true;

  const haystack = [task.title, task.description, task.assignee, ...(task.tags || [])]
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchQuery);
}

function initials(name) {
  if (!name) return '?';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function buildCard(task, columnId) {
  const card = document.createElement('article');
  card.className = 'card';
  card.draggable = true;
  card.setAttribute('role', 'listitem');
  card.dataset.id = task.id;
  card.dataset.columnId = columnId;

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'card-delete';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', `Eliminar tarea "${task.title}"`);

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'tags';

  const priorityTag = document.createElement('span');
  priorityTag.className = `tag priority-${task.priority}`;
  priorityTag.textContent = task.priority;
  tagsWrap.append(priorityTag);

  (task.tags || []).forEach((tagText) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = `#${tagText}`;
    tagsWrap.append(tag);
  });

  const title = document.createElement('h2');
  title.textContent = task.title;

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  if (task.assignee) {
    const assignee = document.createElement('span');
    assignee.className = 'assignee';

    const avatar = document.createElement('span');
    avatar.className = 'assignee-avatar';
    avatar.textContent = initials(task.assignee);

    assignee.append(avatar, document.createTextNode(task.assignee));
    footer.append(assignee);
  }

  card.append(deleteBtn, tagsWrap, title);

  if (task.description) {
    const description = document.createElement('p');
    description.textContent = task.description;
    card.append(description);
  }

  card.append(footer);

  return card;
}

/**
 * Calcula el índice de inserción según la posición Y del cursor entre las cards.
 */
function getDropIndex(cardsWrap, clientY) {
  const cards = [...cardsWrap.querySelectorAll('.card:not(.dragging)')];

  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (clientY < midY) return i;
  }

  return cards.length;
}

/**
 * Elimina cualquier indicador de inserción previo.
 */
function clearDropIndicators(board) {
  board.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
}

export function buildColumn(column, state, searchQuery, priorityFilter, callbacks) {
  const {
    onAddTask, onDeleteColumn, onDropTask, getDraggedTaskId,
    onDragStartColumn, onDragEndColumn, getDraggedColumnId, onDropColumn,
  } = callbacks;

  const section = document.createElement('section');
  section.className = 'column';
  section.dataset.color = column.color;
  section.dataset.id = column.id;

  /* ── WIP check ───────────────────────────── */
  const wipExceeded = column.wipLimit > 0 && column.tasks.length >= column.wipLimit;
  if (wipExceeded) section.classList.add('wip-exceeded');

  /* ── Header (draggable para reordenar columnas, solo si no es fija) ── */
  const header = document.createElement('div');
  header.className = 'column-header';

  if (!column.fixed) {
    header.draggable = true;

    header.addEventListener('dragstart', (event) => {
      /* Evitar que se propague como drag de tarjeta */
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      onDragStartColumn(column.id);
      requestAnimationFrame(() => section.classList.add('dragging-column'));
    });

    header.addEventListener('dragend', () => {
      onDragEndColumn();
      section.classList.remove('dragging-column');
    });
  }

  const dot = document.createElement('span');
  dot.className = 'dot';

  const name = document.createElement('span');
  name.className = 'column-name';
  name.textContent = column.name;

  const visibleTasks = column.tasks.filter((task) => taskMatchesFilters(task, searchQuery, priorityFilter));

  const count = document.createElement('span');
  count.className = 'count';
  if (column.wipLimit > 0) {
    count.textContent = `${column.tasks.length}/${column.wipLimit}`;
    if (wipExceeded) count.classList.add('wip-count-exceeded');
  } else {
    count.textContent = visibleTasks.length;
  }

  const actions = document.createElement('span');
  actions.className = 'column-actions';

  if (column.canCreateTasks) {
    const addCardBtn = document.createElement('button');
    addCardBtn.type = 'button';
    addCardBtn.className = 'add-card-btn';
    addCardBtn.textContent = '＋';
    addCardBtn.setAttribute('aria-label', `Añadir tarea en ${column.name}`);
    if (wipExceeded) {
      addCardBtn.disabled = true;
      addCardBtn.title = 'Límite WIP alcanzado';
    }
    addCardBtn.addEventListener('click', () => onAddTask(column.id));
    actions.append(addCardBtn);
  }

  if (!column.locked) {
    const deleteColumnBtn = document.createElement('button');
    deleteColumnBtn.type = 'button';
    deleteColumnBtn.className = 'delete-column-btn';
    deleteColumnBtn.textContent = '⋯';
    deleteColumnBtn.setAttribute('aria-label', `Eliminar columna ${column.name}`);
    deleteColumnBtn.addEventListener('click', () => onDeleteColumn(column.id));
    actions.append(deleteColumnBtn);
  }

  header.append(dot, name, count, actions);

  /* ── Cards container ─────────────────────── */
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'cards';
  cardsWrap.setAttribute('role', 'list');

  if (visibleTasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-column';
    empty.textContent = searchQuery || priorityFilter ? 'Sin coincidencias.' : 'Sin tareas.';
    cardsWrap.append(empty);
  } else {
    visibleTasks.forEach((task) => {
      cardsWrap.append(buildCard(task, column.id));
    });
  }

  /* ── Event delegation: clicks ────────────── */
  cardsWrap.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.card-delete');
    if (deleteBtn) {
      event.stopPropagation();
      const card = deleteBtn.closest('.card');
      if (card) callbacks.onDeleteTask(card.dataset.id);
      return;
    }

    const card = event.target.closest('.card');
    if (card) {
      callbacks.onOpenTask(card.dataset.columnId, card.dataset.id);
    }
  });

  /* ── Event delegation: drag de tarjetas ──── */
  cardsWrap.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    callbacks.onDragStartTask(card.dataset.id);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  cardsWrap.addEventListener('dragend', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    callbacks.onDragEndTask();
    card.classList.remove('dragging');
  });

  /* ── Drop zone: tarjetas (con indicador de posición) ── */
  cardsWrap.addEventListener('dragover', (event) => {
    /* Ignorar si se está arrastrando una columna */
    if (getDraggedColumnId()) return;
    event.preventDefault();
    section.classList.add('drag-over');

    /* Mostrar indicador de inserción */
    clearDropIndicators(section);
    const dropIndex = getDropIndex(cardsWrap, event.clientY);
    const cards = [...cardsWrap.querySelectorAll('.card:not(.dragging)')];
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    if (cards[dropIndex]) {
      cardsWrap.insertBefore(indicator, cards[dropIndex]);
    } else {
      cardsWrap.append(indicator);
    }
  });

  cardsWrap.addEventListener('dragleave', (event) => {
    /* Solo limpiar si realmente salimos del contenedor */
    if (!cardsWrap.contains(event.relatedTarget)) {
      section.classList.remove('drag-over');
      clearDropIndicators(section);
    }
  });

  cardsWrap.addEventListener('drop', (event) => {
    event.preventDefault();
    section.classList.remove('drag-over');
    clearDropIndicators(section);

    const draggedTaskId = getDraggedTaskId();
    if (draggedTaskId) {
      const dropIndex = getDropIndex(cardsWrap, event.clientY);
      onDropTask(draggedTaskId, column.id, dropIndex);
    }
  });

  /* ── Assemble column ─────────────────────── */
  if (column.canCreateTasks && !wipExceeded) {
    const quickAdd = document.createElement('button');
    quickAdd.type = 'button';
    quickAdd.className = 'quick-add';
    quickAdd.textContent = '＋ Añadir tarjeta';
    quickAdd.addEventListener('click', () => onAddTask(column.id));
    section.append(header, cardsWrap, quickAdd);
  } else {
    section.append(header, cardsWrap);
  }

  /* ── Drop zone: columnas (reordenar) ─────── */
  section.addEventListener('dragover', (event) => {
    if (!getDraggedColumnId()) return;
    if (column.fixed) return;
    event.preventDefault();
    section.classList.add('column-drop-target');
  });

  section.addEventListener('dragleave', (event) => {
    if (!getDraggedColumnId()) return;
    if (!section.contains(event.relatedTarget)) {
      section.classList.remove('column-drop-target');
    }
  });

  section.addEventListener('drop', (event) => {
    if (!getDraggedColumnId()) return;
    if (column.fixed) return;
    event.preventDefault();
    event.stopPropagation();
    section.classList.remove('column-drop-target');

    const draggedColId = getDraggedColumnId();
    if (draggedColId && draggedColId !== column.id) {
      const targetIndex = state.columns.findIndex((c) => c.id === column.id);
      onDropColumn(draggedColId, targetIndex);
    }
  });

  return section;
}

export function render(board, state, searchQuery, priorityFilter, callbacks) {
  const fragment = document.createDocumentFragment();
  state.columns.forEach((column) => {
    fragment.append(buildColumn(column, state, searchQuery, priorityFilter, callbacks));
  });

  board.replaceChildren(fragment);
}

export function renderError(board, message) {
  const errorBox = document.createElement('p');
  errorBox.className = 'empty-column';
  errorBox.textContent = message;
  board.replaceChildren(errorBox);
}
