export const STORAGE_KEY = 'taskflow-kanban-state';
export const DATA_URL = 'sources/data/data.json';

export function createId(prefix = 'id') {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeColumn(column) {
  return {
    ...column,
    locked: Boolean(column.locked),
    fixed: column.fixed === true || column.id === 'todo',
    canCreateTasks: Boolean(column.canCreateTasks),
    wipLimit: typeof column.wipLimit === 'number' ? column.wipLimit : 0,
    tasks: Array.isArray(column.tasks) ? column.tasks : [],
  };
}

function normalizeState(state) {
  return {
    ...state,
    columns: state.columns.map(normalizeColumn),
  };
}

export function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && Array.isArray(parsed.columns)) {
      return normalizeState(parsed);
    }
  } catch {
    /* Estado corrupto: se ignora y se recarga desde data.json. */
  }

  return null;
}

export async function loadDefaultState() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL}: ${response.status}`);

  const data = await response.json();

  return normalizeState({
    columns: data.columns.map((column) => ({
      ...column,
      id: column.id || createId('c'),
      color: column.color || 'custom',
      tasks: (column.tasks || []).map((task) => ({
        ...task,
        id: createId('t'),
        description: task.description || '',
        assignee: task.assignee || '',
        tags: task.tags || [],
        priority: task.priority || 'normal',
      })),
    })),
  });
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function findTask(state, taskId) {
  for (const column of state.columns) {
    const task = column.tasks.find((item) => item.id === taskId);
    if (task) return task;
  }

  return null;
}

export function findColumnByTaskId(state, taskId) {
  return state.columns.find((column) => column.tasks.some((item) => item.id === taskId));
}
