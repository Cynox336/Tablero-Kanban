import {
  createId,
  loadStateFromStorage,
  loadDefaultState,
  saveState,
  findTask,
  findColumnByTaskId,
} from './sources/state.js';
import { render, renderError } from './sources/render.js';
import { createTaskModalController, createColumnModalController } from './sources/modals.js';
import { createConfirmController } from './sources/confirm.js';

let state = { columns: [] };
let searchQuery = '';
let priorityFilter = '';
let draggedTaskId = null;
let draggedColumnId = null;

/* ── DOM references ──────────────────────── */
const board = document.getElementById('board');
const searchInput = document.getElementById('searchInput');
const addColumnBtn = document.getElementById('addColumnBtn');
const taskCounter = document.getElementById('taskCounter');
const priorityFilterEl = document.getElementById('priorityFilter');
const themeToggle = document.getElementById('themeToggle');

/* ── Controllers ─────────────────────────── */
const taskModal = createTaskModalController(
  {
    dialog: document.getElementById('taskDialog'),
    form: document.getElementById('taskForm'),
    titleEl: document.getElementById('taskModalTitle'),
    titleInput: document.getElementById('taskTitleInput'),
    descriptionInput: document.getElementById('taskDescriptionInput'),
    assigneeInput: document.getElementById('taskAssigneeInput'),
    tagsInput: document.getElementById('taskTagsInput'),
    priorityInput: document.getElementById('taskPriorityInput'),
    cancelBtn: document.getElementById('cancelTaskBtn'),
  },
  handleTaskFormSubmit,
);

const columnModal = createColumnModalController(
  {
    dialog: document.getElementById('columnDialog'),
    form: document.getElementById('columnForm'),
    nameInput: document.getElementById('columnNameInput'),
    wipInput: document.getElementById('columnWipInput'),
    cancelBtn: document.getElementById('cancelColumnBtn'),
  },
  handleColumnFormSubmit,
);

const confirmDialog = createConfirmController({
  dialog: document.getElementById('confirmDialog'),
  titleEl: document.getElementById('confirmTitle'),
  messageEl: document.getElementById('confirmMessage'),
  cancelBtn: document.getElementById('confirmCancelBtn'),
  deleteBtn: document.getElementById('confirmDeleteBtn'),
});

/* ── Render ───────────────────────────────── */
function persistAndRender() {
  saveState(state);
  renderBoard();
}

function updateTaskCounter() {
  const total = state.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  taskCounter.textContent = `${total} tarea${total !== 1 ? 's' : ''}`;
}

function renderBoard() {
  render(board, state, searchQuery, priorityFilter, {
    onAddTask: (columnId) => {
      const column = state.columns.find((item) => item.id === columnId);
      if (!column?.canCreateTasks) return;
      /* WIP check */
      if (column.wipLimit > 0 && column.tasks.length >= column.wipLimit) return;
      taskModal.open(columnId);
    },
    onOpenTask: (columnId, taskId) => {
      const task = findTask(state, taskId);
      if (task) taskModal.open(columnId, task);
    },
    onDeleteTask: async (taskId) => {
      const task = findTask(state, taskId);
      const column = findColumnByTaskId(state, taskId);
      if (!column || !task) return;

      const confirmed = await confirmDialog.show(
        '¿Eliminar tarea?',
        `Se eliminará "${task.title}" de la columna "${column.name}".`,
      );
      if (!confirmed) return;

      column.tasks = column.tasks.filter((item) => item.id !== taskId);
      persistAndRender();
    },
    onDeleteColumn: async (columnId) => {
      const column = state.columns.find((item) => item.id === columnId);
      if (!column) return;

      const taskCount = column.tasks.length;
      const message = taskCount > 0
        ? `Se eliminará la columna "${column.name}" con ${taskCount} tarea${taskCount !== 1 ? 's' : ''}.`
        : `Se eliminará la columna "${column.name}".`;

      const confirmed = await confirmDialog.show('¿Eliminar columna?', message);
      if (!confirmed) return;

      state.columns = state.columns.filter((item) => item.id !== columnId);
      persistAndRender();
    },
    onDragStartTask: (taskId) => {
      draggedTaskId = taskId;
    },
    onDragEndTask: () => {
      draggedTaskId = null;
    },
    getDraggedTaskId: () => draggedTaskId,
    onDropTask: (taskId, targetColumnId, dropIndex) => {
      const sourceColumn = findColumnByTaskId(state, taskId);
      const targetColumn = state.columns.find((item) => item.id === targetColumnId);

      if (!sourceColumn || !targetColumn) return;

      /* WIP check (solo al mover a OTRA columna) */
      if (sourceColumn.id !== targetColumn.id) {
        if (targetColumn.wipLimit > 0 && targetColumn.tasks.length >= targetColumn.wipLimit) return;
      }

      const taskIndex = sourceColumn.tasks.findIndex((item) => item.id === taskId);
      const [task] = sourceColumn.tasks.splice(taskIndex, 1);

      /* Ajustar dropIndex si es la misma columna y se movió desde antes */
      let insertIndex = dropIndex;
      if (sourceColumn.id === targetColumn.id && taskIndex < dropIndex) {
        insertIndex = Math.max(0, dropIndex - 1);
      }

      targetColumn.tasks.splice(insertIndex, 0, task);
      persistAndRender();
    },
    /* ── Column drag & drop ──────────────── */
    onDragStartColumn: (columnId) => {
      draggedColumnId = columnId;
    },
    onDragEndColumn: () => {
      draggedColumnId = null;
    },
    getDraggedColumnId: () => draggedColumnId,
    onDropColumn: (columnId, targetIndex) => {
      const sourceIndex = state.columns.findIndex((c) => c.id === columnId);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;

      /* No mover columnas fijas ni ocupar la posición de una fija */
      const sourceCol = state.columns[sourceIndex];
      const targetCol = state.columns[targetIndex];
      if (sourceCol.fixed || targetCol?.fixed) return;

      const [column] = state.columns.splice(sourceIndex, 1);
      state.columns.splice(targetIndex, 0, column);
      persistAndRender();
    },
  });

  updateTaskCounter();
}

/* ── Task form ───────────────────────────── */
function handleTaskFormSubmit({ columnId, taskId, title, description, assignee, tags, priority }) {
  if (taskId) {
    const task = findTask(state, taskId);
    if (!task) return;

    task.title = title;
    task.description = description;
    task.assignee = assignee;
    task.tags = tags;
    task.priority = priority;
  } else {
    const column = state.columns.find((item) => item.id === columnId);

    if (!column?.canCreateTasks) return;
    if (column.wipLimit > 0 && column.tasks.length >= column.wipLimit) return;

    column.tasks.unshift({
      id: createId('t'),
      title,
      description,
      assignee,
      tags,
      priority,
    });
  }

  persistAndRender();
}

/* ── Column form ─────────────────────────── */
function handleColumnFormSubmit({ name, wipLimit }) {
  state.columns.push({
    id: createId('c'),
    name,
    color: 'custom',
    locked: false,
    canCreateTasks: true,
    wipLimit,
    tasks: [],
  });

  persistAndRender();
}

/* ── Event listeners ─────────────────────── */
addColumnBtn.addEventListener('click', () => columnModal.open());

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

/* Búsqueda con debounce */
let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderBoard();
  }, 200);
});

/* Filtro por prioridad */
priorityFilterEl.addEventListener('change', () => {
  priorityFilter = priorityFilterEl.value;
  renderBoard();
});

/* ── Dark mode ───────────────────────────── */
const THEME_KEY = 'taskflow-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) {
    applyTheme(stored);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* Escuchar cambios del OS */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!localStorage.getItem(THEME_KEY)) {
    applyTheme(event.matches ? 'dark' : 'light');
  }
});

/* ── Init ────────────────────────────────── */
async function init() {
  initTheme();

  const stored = loadStateFromStorage();

  if (stored) {
    state = stored;
    renderBoard();
    return;
  }

  try {
    state = await loadDefaultState();
    saveState(state);
    renderBoard();
  } catch (error) {
    renderError(board, `No se pudo cargar el estado inicial: ${error.message}`);
    console.error(error);
  }
}

init();
