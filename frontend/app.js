// Pe Azure Static Web Apps, functiile "managed" sunt expuse automat sub /api,
// pe acelasi domeniu ca frontend-ul -> nu exista probleme de CORS.
const API_BASE = "/api/todos";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#ff6c6c" : "#8b8f99";
}

async function fetchTodos() {
  setStatus("Se incarca...");
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const todos = await res.json();
    renderTodos(todos);
    setStatus(`${todos.length} item(e)`);
  } catch (err) {
    setStatus(`Eroare la incarcare: ${err.message}`, true);
  }
}

function renderTodos(todos) {
  list.innerHTML = "";
  for (const todo of todos) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => toggleTodo(todo));

    const span = document.createElement("span");
    span.textContent = todo.title;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Sterge";
    deleteBtn.className = "delete";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span, deleteBtn);
    list.appendChild(li);
  }
}

async function addTodo(title) {
  setStatus("Se salveaza...");
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchTodos();
  } catch (err) {
    setStatus(`Eroare la salvare: ${err.message}`, true);
  }
}

async function toggleTodo(todo) {
  try {
    const res = await fetch(`${API_BASE}/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchTodos();
  } catch (err) {
    setStatus(`Eroare la actualizare: ${err.message}`, true);
  }
}

async function deleteTodo(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    await fetchTodos();
  } catch (err) {
    setStatus(`Eroare la stergere: ${err.message}`, true);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  addTodo(title);
});

fetchTodos();
