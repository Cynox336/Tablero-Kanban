const API_URL = 'http://localhost:3000';
const STATUS_COLUMNS = [
  { id: 'todo', name: 'Por Hacer', color: 'todo' },
  { id: 'doing', name: 'En Proceso', color: 'doing' },
  { id: 'done', name: 'Finalizado', color: 'done' },
];

const board = document.querySelector('#board');
const statsPanel = document.querySelector('#statsPanel');
const searchInput = document.querySelector('#searchInput');
const errorMessage = document.querySelector('#errorMessage');

const taskModalBackdrop = document.querySelector('#taskModalBackdrop');
const taskForm = document.querySelector('#taskForm');
const taskModalTitle = document.querySelector('#taskModalTitle');
const taskTitle = document.querySelector('#taskTitle');
const taskDescription = document.querySelector('#taskDescription');
const taskPriority = document.querySelector('#taskPriority');
const taskDueDate = document.querySelector('#taskDueDate');
const taskAssignee = document.querySelector('#taskAssignee');
const taskTags = document.querySelector('#taskTags');

const detailModalBackdrop = document.querySelector('#detailModalBackdrop');
const detailTitle = document.querySelector('#detailTitle');
const detailMeta = document.querySelector('#detailMeta');
const detailDescription = document.querySelector('#detailDescription');
const commentsList = document.querySelector('#commentsList');
const commentForm = document.querySelector('#commentForm');
const commentAuthor = document.querySelector('#commentAuthor');
const commentText = document.querySelector('#commentText');

let tasks = [];
let selectedTask = null;
let editingTaskId = null;
let draggedTaskId = null;
let searchTerm = '';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

function showError(error) {
  errorMessage.hidden = false;
  errorMessage.textContent = `No se pudo completar la operación. Comprueba que json-server está ejecutándose en ${API_URL}. (${error.message})`;
  console.error(error);
}

function hideError() {
  errorMessage.hidden = true;
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function isOverdue(value) {
  return value && new Date(`${value}T23:59:59`) < new Date();
}

function filteredTasks() {
  if (!searchTerm) return tasks;
  return tasks.filter((task) => task.title.toLowerCase().includes(searchTerm));
}

function renderStats() {
  const fragment = document.createDocumentFragment();
  STATUS_COLUMNS.forEach((column) => {
    const stat = document.createElement('div');
    stat.className = 'stat';
    const value = tasks.filter((task) => task.status === column.id).length;
    stat.innerHTML = `<strong>${value}</strong><span>${column.name}</span>`;
    fragment.append(stat);
  });
  statsPanel.replaceChildren(fragment);
}

function buildCard(task) {
  const card = document.createElement('article');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  const tags = document.createElement('div');
  tags.className = 'tags';
  const priority = document.createElement('span');
  priority.className = `tag ${task.priority}`;
  priority.textContent = task.priority;
  tags.append(priority);
  (task.tags || []).forEach((value) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = `#${value}`;
    tags.append(tag);
  });

  const title = document.createElement('h2');
  title.textContent = task.title;
  const description = document.createElement('p');
  description.textContent = task.description || 'Sin descripción.';

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const assignee = document.createElement('span');
  assignee.className = 'assignee';
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = initials(task.assignee);
  assignee.append(avatar, document.createTextNode(task.assignee || 'Sin asignar'));
  const due = document.createElement('span');
  due.className = `due-date${isOverdue(task.dueDate) ? ' overdue' : ''}`;
  due.textContent = formatDate(task.dueDate);
  footer.append(assignee, due);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'card-delete';
  deleteButton.type = 'button';
  deleteButton.textContent = '×';
  deleteButton.setAttribute('aria-label', `Eliminar ${task.title}`);
  deleteButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await deleteTask(task.id);
  });

  card.append(deleteButton, tags, title, description, footer);
  card.addEventListener('click', () => openDetail(task));
  card.addEventListener('dragstart', () => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    draggedTaskId = null;
    card.classList.remove('dragging');
  });
  return card;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  const visible = filteredTasks();

  STATUS_COLUMNS.forEach((column) => {
    const section = document.createElement('section');
    section.className = 'column';
    section.dataset.status = column.id;

    const header = document.createElement('div');
    header.className = 'column-header';
    const dot = document.createElement('span');
    dot.className = 'dot';
    const name = document.createElement('span');
    name.textContent = column.name;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = tasks.filter((task) => task.status === column.id).length;
    header.append(dot, name, count);

    const cards = document.createElement('div');
    cards.className = 'cards';
    const columnTasks = visible.filter((task) => task.status === column.id);
    if (!columnTasks.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-column';
      empty.textContent = searchTerm ? 'Sin coincidencias.' : 'Sin tareas.';
      cards.append(empty);
    } else columnTasks.forEach((task) => cards.append(buildCard(task)));

    if (column.id === 'todo') {
      const addButton = document.createElement('button');
      addButton.className = 'quick-add';
      addButton.type = 'button';
      addButton.textContent = '＋ Añadir tarjeta';
      addButton.addEventListener('click', () => openTaskForm());
      section.append(header, cards, addButton);
    } else section.append(header, cards);

    // NUEVO CÓDIGO: Event listeners movidos a la etiqueta <section>
    section.addEventListener('dragover', (event) => {
      event.preventDefault();
      section.classList.add('drag-over');
    });
    section.addEventListener('dragleave', () => section.classList.remove('drag-over'));
    section.addEventListener('drop', async (event) => {
      event.preventDefault();
      section.classList.remove('drag-over');
      if (!draggedTaskId) return;
      const task = tasks.find((item) => String(item.id) === String(draggedTaskId));
      if (!task || task.status === column.id) return;
      try {
        await request(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: column.id }) });
        await loadTasks();
      } catch (error) { showError(error); }
    });
    
    fragment.append(section);
  });
  
  board.replaceChildren(fragment);
}

async function loadTasks() {
  try {
    tasks = await request('/tasks');
    hideError();
    renderStats();
    renderBoard();
  } catch (error) { showError(error); }
}

function openTaskForm(task = null) {
  editingTaskId = task ? task.id : null;
  taskModalTitle.textContent = task ? 'Editar tarea' : 'Nueva tarea';
  taskTitle.value = task?.title || '';
  taskDescription.value = task?.description || '';
  taskPriority.value = task?.priority || 'media';
  taskDueDate.value = task?.dueDate || '';
  taskAssignee.value = task?.assignee || '';
  taskTags.value = (task?.tags || []).join(', ');
  taskModalBackdrop.hidden = false;
  taskTitle.focus();
}

function closeTaskForm() { taskModalBackdrop.hidden = true; taskForm.reset(); editingTaskId = null; }

async function saveTask(event) {
  event.preventDefault();
  const payload = {
    title: taskTitle.value.trim(), description: taskDescription.value.trim(), priority: taskPriority.value,
    dueDate: taskDueDate.value || null, assignee: taskAssignee.value.trim(),
    tags: taskTags.value.split(',').map((value) => value.trim()).filter(Boolean),
  };
  if (!payload.title) return;

  try {
    if (editingTaskId) await request(`/tasks/${editingTaskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    else await request('/tasks', { method: 'POST', body: JSON.stringify({ ...payload, status: 'todo' }) });
    closeTaskForm();
    await loadTasks();
  } catch (error) { showError(error); }
}

async function openDetail(task) {
  selectedTask = task;
  detailTitle.textContent = task.title;
  detailDescription.textContent = task.description || 'Sin descripción.';
  detailMeta.innerHTML = '';
  [`Prioridad: ${task.priority}`, `Límite: ${formatDate(task.dueDate)}`, `Asignado: ${task.assignee || 'Sin asignar'}`].forEach((text) => {
    const item = document.createElement('span'); item.className = 'tag'; item.textContent = text; detailMeta.append(item);
  });
  detailModalBackdrop.hidden = false;
  await loadComments(task.id);
}

async function loadComments(taskId) {
  try {
    const comments = await request(`/comments?taskId=${encodeURIComponent(taskId)}&_sort=createdAt&_order=asc`);
    if (!comments.length) {
      commentsList.innerHTML = '<p class="empty-column">Todavía no hay comentarios.</p>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    comments.forEach((comment) => {
      const item = document.createElement('article'); item.className = 'comment';
      const author = document.createElement('strong'); author.textContent = comment.author;
      const text = document.createElement('p'); text.textContent = comment.text;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'comment-delete';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Eliminar comentario';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) return;
        try {
          await request(`/comments/${comment.id}`, { method: 'DELETE' });
          await loadComments(taskId); // Recarga los comentarios de la tarea
        } catch (error) { showError(error); }
      });
      
      item.append(author, text, deleteBtn); fragment.append(item);
    });
    commentsList.replaceChildren(fragment);
  } catch (error) { showError(error); }
}

async function addComment(event) {
  event.preventDefault();
  if (!selectedTask) return;
  try {
    await request('/comments', { method: 'POST', body: JSON.stringify({ taskId: selectedTask.id, author: commentAuthor.value.trim(), text: commentText.value.trim(), createdAt: new Date().toISOString() }) });
    commentText.value = '';
    await loadComments(selectedTask.id);
  } catch (error) { showError(error); }
}

async function deleteTask(taskId) {
  if (!window.confirm('¿Eliminar esta tarea permanentemente?')) return;
  try {
    await request(`/tasks/${taskId}`, { method: 'DELETE' });
    if (selectedTask?.id === taskId) closeDetail();
    await loadTasks();
  } catch (error) { showError(error); }
}

function closeDetail() { detailModalBackdrop.hidden = true; selectedTask = null; commentsList.innerHTML = ''; }

document.querySelector('#closeTaskModal').addEventListener('click', closeTaskForm);
document.querySelector('#cancelTaskModal').addEventListener('click', closeTaskForm);
taskModalBackdrop.addEventListener('click', (event) => { if (event.target === taskModalBackdrop) closeTaskForm(); });
taskForm.addEventListener('submit', saveTask);
document.querySelector('#closeDetailModal').addEventListener('click', closeDetail);
detailModalBackdrop.addEventListener('click', (event) => { if (event.target === detailModalBackdrop) closeDetail(); });
document.querySelector('#editTaskButton').addEventListener('click', () => { const task = selectedTask; closeDetail(); openTaskForm(task); });
document.querySelector('#deleteTaskButton').addEventListener('click', () => selectedTask && deleteTask(selectedTask.id));
commentForm.addEventListener('submit', addComment);
searchInput.addEventListener('input', () => { searchTerm = searchInput.value.toLowerCase().trim(); renderBoard(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeTaskForm(); closeDetail(); } });

/* ── Dark Mode ── */
const themeToggle = document.querySelector('#themeToggle');
const THEME_KEY = 'taskflow-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
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

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(event.matches ? 'dark' : 'light');
});

initTheme();
loadTasks();
