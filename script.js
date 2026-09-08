const STORAGE_KEY = 'taskflow-kanban-state';

const DEFAULT_COLUMNS = [
  {
    id: 'todo',
    name: 'Por Hacer',
    color: 'todo',
    tasks: [
      {
        id: createTaskId(),
        title: 'Investigación UX: testing de usabilidad',
        description: 'Recopilar feedback cualitativo sobre el nuevo dashboard de permisos y roles.',
        tags: ['DiseñoUI', 'Research'],
        assignee: 'Ana Cruz',
        priority: 'normal',
      },
    ],
  },
  {
    id: 'progress',
    name: 'En Curso',
    color: 'progress',
    tasks: [
      {
        id: createTaskId(),
        title: 'Preparar presentación para el Q4 Review',
        description: 'Alinear OKRs alcanzados y proyecciones de lanzamiento del Q1.',
        tags: ['Urgente', 'Producto'],
        assignee: 'Marcos Pla',
        priority: 'alta',
      },
    ],
  },
  {
    id: 'done',
    name: 'Completado',
    color: 'done',
    tasks: [
      {
        id: createTaskId(),
        title: 'Definir paleta de colores del Design System',
        description: 'Verificada en QA.',
        tags: ['DesignSystem'],
        assignee: 'Eva Vidal',
        priority: 'baja',
      },
    ],
  },
];

function createTaskId() {
  return crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createColumnId() {
  return crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.columns)) return parsed;
  } catch {
    /* estado corrupto: se ignora y se regenera por defecto */
  }
  return { columns: DEFAULT_COLUMNS };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let searchQuery = '';
let activeColumnId = null;
let editingTaskId = null;
let draggedTaskId = null;

const board = document.querySelector('#board');
const searchInput = document.querySelector('#searchInput');
const addColumnBtn = document.querySelector('#addColumnBtn');

const taskModalBackdrop = document.querySelector('#taskModalBackdrop');
const taskForm = document.querySelector('#taskForm');
const taskModalTitle = document.querySelector('#taskModalTitle');
const taskTitleInput = document.querySelector('#taskTitleInput');
const taskDescriptionInput = document.querySelector('#taskDescriptionInput');
const taskAssigneeInput = document.querySelector('#taskAssigneeInput');
const taskTagsInput = document.querySelector('#taskTagsInput');
const taskPriorityInput = document.querySelector('#taskPriorityInput');
const cancelTaskBtn = document.querySelector('#cancelTaskBtn');

const columnModalBackdrop = document.querySelector('#columnModalBackdrop');
const columnForm = document.querySelector('#columnForm');
const columnNameInput = document.querySelector('#columnNameInput');
const cancelColumnBtn = document.querySelector('#cancelColumnBtn');

function openTaskModal(columnId, taskId = null) {
  activeColumnId = columnId;
  editingTaskId = taskId;

  if (taskId) {
    const task = findTask(taskId);
    taskModalTitle.textContent = 'Editar tarea';
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description || '';
    taskAssigneeInput.value = task.assignee || '';
    taskTagsInput.value = (task.tags || []).join(', ');
    taskPriorityInput.value = task.priority || 'normal';
  } else {
    taskModalTitle.textContent = 'Nueva tarea';
    taskForm.reset();
  }

  taskModalBackdrop.classList.add('open');
  taskTitleInput.focus();
}

function closeTaskModal() {
  taskModalBackdrop.classList.remove('open');
  taskForm.reset();
  activeColumnId = null;
  editingTaskId = null;
}

function findTask(taskId) {
  for (const column of state.columns) {
    const task = column.tasks.find((item) => item.id === taskId);
    if (task) return task;
  }
  return null;
}

function findColumnByTaskId(taskId) {
  return state.columns.find((column) => column.tasks.some((item) => item.id === taskId));
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const tags = taskTagsInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (editingTaskId) {
    const task = findTask(editingTaskId);
    task.title = title;
    task.description = taskDescriptionInput.value.trim();
    task.assignee = taskAssigneeInput.value.trim();
    task.tags = tags;
    task.priority = taskPriorityInput.value;
  } else {
    const column = state.columns.find((item) => item.id === activeColumnId);
    column.tasks.unshift({
      id: createTaskId(),
      title,
      description: taskDescriptionInput.value.trim(),
      assignee: taskAssigneeInput.value.trim(),
      tags,
      priority: taskPriorityInput.value,
    });
  }

  saveState();
  render();
  closeTaskModal();
});

cancelTaskBtn.addEventListener('click', closeTaskModal);
taskModalBackdrop.addEventListener('click', (event) => {
  if (event.target === taskModalBackdrop) closeTaskModal();
});

function openColumnModal() {
  columnModalBackdrop.classList.add('open');
  columnNameInput.focus();
}

function closeColumnModal() {
  columnModalBackdrop.classList.remove('open');
  columnForm.reset();
}

addColumnBtn.addEventListener('click', openColumnModal);
cancelColumnBtn.addEventListener('click', closeColumnModal);
columnModalBackdrop.addEventListener('click', (event) => {
  if (event.target === columnModalBackdrop) closeColumnModal();
});

columnForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = columnNameInput.value.trim();
  if (!name) return;

  state.columns.push({ id: createColumnId(), name, color: 'custom', tasks: [] });
  saveState();
  render();
  closeColumnModal();
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape') {
    closeTaskModal();
    closeColumnModal();
  }
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.toLowerCase().trim();
  render();
});

function taskMatchesSearch(task) {
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

function buildCard(task) {
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
    const column = findColumnByTaskId(task.id);
    column.tasks = column.tasks.filter((item) => item.id !== task.id);
    saveState();
    render();
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

  card.addEventListener('click', () => openTaskModal(findColumnByTaskId(task.id).id, task.id));

  card.addEventListener('dragstart', () => {
    draggedTaskId = task.id;
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  card.addEventListener('dragend', () => {
    draggedTaskId = null;
    card.classList.remove('dragging');
  });

  return card;
}

function buildColumn(column) {
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

  const visibleTasks = column.tasks.filter(taskMatchesSearch);
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = visibleTasks.length;

  const actions = document.createElement('span');
  actions.className = 'column-actions';

  const addCardBtn = document.createElement('button');
  addCardBtn.type = 'button';
  addCardBtn.className = 'add-card-btn';
  addCardBtn.textContent = '＋';
  addCardBtn.setAttribute('aria-label', `Añadir tarea en ${column.name}`);
  addCardBtn.addEventListener('click', () => openTaskModal(column.id));
  actions.append(addCardBtn);

  if (!['todo', 'progress', 'done'].includes(column.id)) {
    const deleteColumnBtn = document.createElement('button');
    deleteColumnBtn.type = 'button';
    deleteColumnBtn.className = 'delete-column-btn';
    deleteColumnBtn.textContent = '⋯';
    deleteColumnBtn.setAttribute('aria-label', `Eliminar columna ${column.name}`);
    deleteColumnBtn.addEventListener('click', () => {
      state.columns = state.columns.filter((item) => item.id !== column.id);
      saveState();
      render();
    });
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
    visibleTasks.forEach((task) => cardsWrap.append(buildCard(task)));
  }

  const quickAdd = document.createElement('button');
  quickAdd.type = 'button';
  quickAdd.className = 'quick-add';
  quickAdd.textContent = '＋ Añadir tarea';
  quickAdd.addEventListener('click', () => openTaskModal(column.id));

  cardsWrap.addEventListener('dragover', (event) => {
    event.preventDefault();
    section.classList.add('drag-over');
  });
  cardsWrap.addEventListener('dragleave', () => section.classList.remove('drag-over'));
  cardsWrap.addEventListener('drop', (event) => {
    event.preventDefault();
    section.classList.remove('drag-over');
    if (!draggedTaskId) return;

    const sourceColumn = findColumnByTaskId(draggedTaskId);
    if (!sourceColumn || sourceColumn.id === column.id) return;

    const taskIndex = sourceColumn.tasks.findIndex((item) => item.id === draggedTaskId);
    const [task] = sourceColumn.tasks.splice(taskIndex, 1);
    column.tasks.unshift(task);

    saveState();
    render();
  });

  section.append(header, cardsWrap, quickAdd);
  return section;
}

function render() {
  board.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.columns.forEach((column) => fragment.append(buildColumn(column)));
  board.append(fragment);
}

render();
