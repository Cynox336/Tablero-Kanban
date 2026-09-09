import { findColumnByTaskId } from './state.js';

export function taskMatchesSearch(task, searchQuery) {
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

export function buildCard(task, state, callbacks) {
  const { onDelete, onOpen, onDragStart, onDragEnd } = callbacks;

  const card = document.createElement('article');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'card-delete';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', `Eliminar tarea "${task.title}"`);
  deleteBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    onDelete(task.id);
  });

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

  card.addEventListener('click', () => {
    const column = findColumnByTaskId(state, task.id);
    if (column) onOpen(column.id, task.id);
  });

  card.addEventListener('dragstart', () => {
    onDragStart(task.id);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  card.addEventListener('dragend', () => {
    onDragEnd();
    card.classList.remove('dragging');
  });

  return card;
}

export function buildColumn(column, state, searchQuery, callbacks) {
  const { onAddTask, onDeleteColumn, onDropTask, getDraggedTaskId } = callbacks;

  const section = document.createElement('section');
  section.className = 'column';
  section.dataset.color = column.color;
  section.dataset.id = column.id;

  const header = document.createElement('div');
  header.className = 'column-header';

  const dot = document.createElement('span');
  dot.className = 'dot';

  const name = document.createElement('span');
  name.className = 'column-name';
  name.textContent = column.name;

  const visibleTasks = column.tasks.filter((task) => taskMatchesSearch(task, searchQuery));

  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = visibleTasks.length;

  const actions = document.createElement('span');
  actions.className = 'column-actions';

  if (column.canCreateTasks) {
    const addCardBtn = document.createElement('button');
    addCardBtn.type = 'button';
    addCardBtn.className = 'add-card-btn';
    addCardBtn.textContent = '＋';
    addCardBtn.setAttribute('aria-label', `Añadir tarea en ${column.name}`);
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

  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'cards';

  if (visibleTasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-column';
    empty.textContent = searchQuery ? 'Sin coincidencias.' : 'Sin tareas.';
    cardsWrap.append(empty);
  } else {
    visibleTasks.forEach((task) => {
      cardsWrap.append(
        buildCard(task, state, {
          onDelete: callbacks.onDeleteTask,
          onOpen: callbacks.onOpenTask,
          onDragStart: callbacks.onDragStartTask,
          onDragEnd: callbacks.onDragEndTask,
        }),
      );
    });
  }

  if (column.canCreateTasks) {
    const quickAdd = document.createElement('button');
    quickAdd.type = 'button';
    quickAdd.className = 'quick-add';
    quickAdd.textContent = '＋ Añadir tarjeta';
    quickAdd.addEventListener('click', () => onAddTask(column.id));
    section.append(header, cardsWrap, quickAdd);
  } else {
    section.append(header, cardsWrap);
  }

  cardsWrap.addEventListener('dragover', (event) => {
    event.preventDefault();
    section.classList.add('drag-over');
  });

  cardsWrap.addEventListener('dragleave', () => {
    section.classList.remove('drag-over');
  });

  cardsWrap.addEventListener('drop', (event) => {
    event.preventDefault();
    section.classList.remove('drag-over');

    const draggedTaskId = getDraggedTaskId();
    if (draggedTaskId) onDropTask(draggedTaskId, column.id);
  });

  return section;
}

export function render(board, state, searchQuery, callbacks) {
  board.innerHTML = '';

  const fragment = document.createDocumentFragment();
  state.columns.forEach((column) => {
    fragment.append(buildColumn(column, state, searchQuery, callbacks));
  });

  board.append(fragment);
}

export function renderError(board, message) {
  board.innerHTML = '';

  const errorBox = document.createElement('p');
  errorBox.className = 'empty-column';
  errorBox.textContent = message;
  board.append(errorBox);
}
