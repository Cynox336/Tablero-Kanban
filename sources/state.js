export const STORAGE_KEY = 'taskflow-kanban-state';
export const DATA_URL = 'data.json';

export function createTaskId() {
  return crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createColumnId() {
  return crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.columns)) return parsed;
  } catch {
    /* estado corrupto: se ignora y se recarga desde data.json */
  }
  return null;
}

export async function loadDefaultState() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL}: ${response.status}`);
  const data = await response.json();

  return {
    columns: data.columns.map((column) => ({
      id: column.id || createColumnId(),
      name: column.name,
      color: column.color || 'custom',
      locked: Boolean(column.locked),
      tasks: (column.tasks || []).map((task) => ({
        id: createTaskId(),
        title: task.title,
        description: task.description || '',
        assignee: task.assignee || '',
        tags: task.tags || [],
        priority: task.priority || 'normal',
      })),
    })),
  };
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
