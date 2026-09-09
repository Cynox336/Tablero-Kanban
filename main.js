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

let state = { columns: [] };
let searchQuery = '';
let draggedTaskId = null;

const board = document.getElementById('board');
const searchInput = document.getElementById('searchInput');
const addColumnBtn = document.getElementById('addColumnBtn');

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
    cancelBtn: document.getElementById('cancelColumnBtn'),
  },
  handleColumnFormSubmit,
);

function persistAndRender() {
  saveState(state);
  renderBoard();
}

function renderBoard() {
  render(board, state, searchQuery, {
    onAddTask: (columnId) => {
      const column = state.columns.find((item) => item.id === columnId);
      if (column?.canCreateTasks) taskModal.open(columnId);
    },
    onOpenTask: (columnId, taskId) => {
      const task = findTask(state, taskId);
      if (task) taskModal.open(columnId, task);
    },
    onDeleteTask: (taskId) => {
      const column = findColumnByTaskId(state, taskId);
      if (!column) return;

      column.tasks = column.tasks.filter((item) => item.id !== taskId);
      persistAndRender();
    },
    onDeleteColumn: (columnId) => {
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
    onDropTask: (taskId, targetColumnId) => {
      const sourceColumn = findColumnByTaskId(state, taskId);
      const targetColumn = state.columns.find((item) => item.id === targetColumnId);

      if (!sourceColumn || !targetColumn || sourceColumn.id === targetColumn.id) return;

      const taskIndex = sourceColumn.tasks.findIndex((item) => item.id === taskId);
      const [task] = sourceColumn.tasks.splice(taskIndex, 1);
      targetColumn.tasks.unshift(task);
      persistAndRender();
    },
  });
}

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

function handleColumnFormSubmit(name) {
  state.columns.push({
    id: createId('c'),
    name,
    color: 'custom',
    locked: false,
    canCreateTasks: false,
    tasks: [],
  });

  persistAndRender();
}

addColumnBtn.addEventListener('click', () => columnModal.open());

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderBoard();
  }, 200);
});

async function init() {
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
