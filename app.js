import { agents as seedAgents } from "./data.js";

const STORAGE_KEY = "sales-tracker-agents-v1";
const THEME_KEY = "citifuel-theme";
const LAST_DARK_THEME_KEY = "citifuel-last-dark-theme";
const CHECKLIST_KEY = "citifuel-checklist-v1";
const CHECKLIST_POSITION_KEY = "citifuel-checklist-position-v1";
const DARK_THEMES = ["ocean", "slate", "cyber"];

const agentListEl = document.getElementById("agent-list");
const clientListEl = document.getElementById("client-list");
const agentCountEl = document.getElementById("agent-count");
const clientCountEl = document.getElementById("client-count");
const clientsTitleEl = document.getElementById("clients-title");
const themeToggleEl = document.getElementById("theme-toggle");
const themeCycleEl = document.getElementById("theme-cycle");
const tickerEl = document.getElementById("kpi-ticker");
const toastContainerEl = document.getElementById("toast-container");
const particlesCanvasEl = document.getElementById("bg-particles");

const addAgentFormEl = document.getElementById("add-agent-form");
const addClientFormEl = document.getElementById("add-client-form");
const addClientNameInputEl = document.getElementById("client-name-input");
const checklistPanelEl = document.getElementById("checklist-panel");
const checklistHeadEl = document.getElementById("checklist-head");
const checklistAddFormEl = document.getElementById("checklist-add-form");
const checklistListEl = document.getElementById("checklist-list");

const detailEl = document.getElementById("client-detail");
const emptyDetailEl = document.getElementById("empty-detail");
const detailClientNameEl = document.getElementById("detail-client-name");
const detailCompanyEl = document.getElementById("detail-company");
const detailPhoneEl = document.getElementById("detail-phone");
const detailEmailEl = document.getElementById("detail-email");
const smsTaskFormEl = document.getElementById("sms-task-form");
const smsTaskListEl = document.getElementById("sms-task-list");
const smsOverdueCountEl = document.getElementById("sms-overdue-count");
const smsTodayCountEl = document.getElementById("sms-today-count");
const smsUpcomingCountEl = document.getElementById("sms-upcoming-count");

const editClientFormEl = document.getElementById("edit-client-form");
const deleteClientBtnEl = document.getElementById("delete-client-btn");

const agents = loadAgents();
const checklist = loadChecklist();
const checklistPosition = loadChecklistPosition();
const savedTheme = localStorage.getItem(THEME_KEY);
const savedDarkTheme = localStorage.getItem(LAST_DARK_THEME_KEY);
const normalizedDarkTheme = DARK_THEMES.includes(savedDarkTheme) ? savedDarkTheme : "ocean";
const normalizedTheme =
  savedTheme === "light" || DARK_THEMES.includes(savedTheme) ? savedTheme : savedTheme === "dark" ? "ocean" : "ocean";

const state = {
  selectedAgentId: agents[0]?.id ?? null,
  selectedClientId: null,
  clientFilter: "all",
  theme: normalizedTheme,
  lastDarkTheme: normalizedDarkTheme,
  clientFormOpen: false,
  lastRenderedAgentId: null,
  checklistOpen: false,
  checklistEditingId: null,
  checklistPosition,
  smsEditingTaskId: null,
};

let particleSystem = null;
let tickerResizeFrame = null;

function cloneSeedAgents() {
  return JSON.parse(JSON.stringify(seedAgents));
}

function normalizeClient(client) {
  const smsTasks = Array.isArray(client.smsTasks)
    ? client.smsTasks
        .map((task) => ({
          id: String(task.id || ""),
          type: String(task.type || "SMS Invoice").trim() || "SMS Invoice",
          dueDate: String(task.dueDate || "").trim(),
          status: String(task.status || "Pendiente").trim() || "Pendiente",
          message: String(task.message || "").trim(),
        }))
        .filter((task) => task.id && task.message)
    : [];

  return {
    id: client.id,
    clientName: String(client.clientName || "").trim() || "Sin nombre",
    company: String(client.company || "").trim() || "Sin compania",
    phone: String(client.phone || "").trim(),
    email: String(client.email || "").trim(),
    contactStatus: String(client.contactStatus || "").trim() || "Pendiente",
    lastContactDate: String(client.lastContactDate || "").trim(),
    nextFollowUpDate: String(client.nextFollowUpDate || "").trim(),
    infoClear: String(client.infoClear || "").trim() || "Pendiente",
    followUpNotes: String(client.followUpNotes || client.notes || "").trim(),
    smsTasks,
  };
}

function normalizeAgent(agent) {
  const clients = Array.isArray(agent.clients) ? agent.clients.map(normalizeClient) : [];
  return {
    id: agent.id,
    name: String(agent.name || "").trim() || "Agente",
    clients,
  };
}

function loadAgents() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const fallback = cloneSeedAgents().map(normalizeAgent);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map(normalizeAgent);
  } catch {
    return fallback;
  }
}

function saveAgents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

function loadChecklist() {
  const raw = localStorage.getItem(CHECKLIST_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item.id || ""),
        text: String(item.text || "").trim(),
        done: Boolean(item.done),
      }))
      .filter((item) => item.id && item.text);
  } catch {
    return [];
  }
}

function saveChecklist() {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
}

function loadChecklistPosition() {
  const raw = localStorage.getItem(CHECKLIST_POSITION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function saveChecklistPosition() {
  if (!state.checklistPosition) {
    localStorage.removeItem(CHECKLIST_POSITION_KEY);
    return;
  }
  localStorage.setItem(CHECKLIST_POSITION_KEY, JSON.stringify(state.checklistPosition));
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function uniqueId(base, items) {
  let id = base || `item-${Date.now()}`;
  let counter = 1;
  while (items.some((item) => item.id === id)) {
    counter += 1;
    id = `${base}-${counter}`;
  }
  return id;
}

function setFormDisabled(formEl, disabled) {
  Array.from(formEl.elements).forEach((element) => {
    element.disabled = disabled;
  });
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "AG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getSeedNumber(seed) {
  const source = String(seed || "agent");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAgentAvatarSvg(seed) {
  const seedNum = getSeedNumber(seed);
  const palettes = [
    { bg: "#102944", shirt: "#34b7ff", face: "#f6cfab", hair: "#112e4a" },
    { bg: "#1d2a44", shirt: "#10b981", face: "#f2c7a2", hair: "#332016" },
    { bg: "#2a1f49", shirt: "#8b5cf6", face: "#f5cfb0", hair: "#1f1b38" },
    { bg: "#1f3b41", shirt: "#22d3ee", face: "#f1c9a8", hair: "#17312e" },
  ];
  const palette = palettes[seedNum % palettes.length];
  const eyeY = 26 + (seedNum % 2);
  const clipId = `clip-${seedNum}`;

  return `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <clipPath id="${clipId}"><circle cx="32" cy="32" r="31" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill="${palette.bg}" />
      <g clip-path="url(#${clipId})">
        <ellipse cx="32" cy="56" rx="22" ry="16" fill="${palette.shirt}" />
        <circle cx="32" cy="29" r="12" fill="${palette.face}" />
        <path d="M20 26c0-8 6-14 12-14s12 6 12 14v2H20z" fill="${palette.hair}" />
        <circle cx="27" cy="${eyeY}" r="1.4" fill="#1f2937" />
        <circle cx="37" cy="${eyeY}" r="1.4" fill="#1f2937" />
        <path d="M28 34c2 2 6 2 8 0" stroke="#8b5e3c" stroke-width="1.3" fill="none" stroke-linecap="round" />
        <circle cx="47" cy="47" r="8" fill="#0ea5e9" />
        <text x="47" y="50" text-anchor="middle" font-size="8" font-weight="800" fill="#eaf6ff" font-family="Arial, sans-serif">S</text>
      </g>
    </svg>
  `;
}

function notify(message, type = "success") {
  const toast = document.createElement("article");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainerEl.appendChild(toast);

  const removeToast = () => {
    toast.classList.add("toast-leave");
    window.setTimeout(() => toast.remove(), 180);
  };

  window.setTimeout(removeToast, 2600);
}

function animateIn(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function getSelectedAgent() {
  return agents.find((agent) => agent.id === state.selectedAgentId) ?? null;
}

function getSelectedClient() {
  const agent = getSelectedAgent();
  if (!agent) return null;
  return agent.clients.find((client) => client.id === state.selectedClientId) ?? null;
}

function getAllClients() {
  return agents.flatMap((agent) => agent.clients);
}

function isClientOverdue(client) {
  if (!client.nextFollowUpDate || client.contactStatus === "Cerrado") return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(`${client.nextFollowUpDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return Math.floor((date - today) / 86400000) < 0;
}

function isClientDueSoon(client) {
  if (!client.nextFollowUpDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(`${client.nextFollowUpDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = Math.floor((date - today) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

function getDateDiffFromToday(dateValue) {
  if (!dateValue) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((date - today) / 86400000);
}

function isSmsTaskOpen(task) {
  return task.status !== "Completado" && task.status !== "Enviado";
}

function getSmsTaskStats(tasks) {
  const openTasks = tasks.filter(isSmsTaskOpen);
  let overdue = 0;
  let today = 0;
  let upcoming = 0;

  openTasks.forEach((task) => {
    const diff = getDateDiffFromToday(task.dueDate);
    if (diff === null) return;
    if (diff < 0) overdue += 1;
    if (diff === 0) today += 1;
    if (diff > 0 && diff <= 3) upcoming += 1;
  });

  return { overdue, today, upcoming };
}

function matchesClientFilter(client) {
  switch (state.clientFilter) {
    case "pending":
      return client.contactStatus === "Pendiente";
    case "contacted":
      return client.contactStatus === "Contactado";
    case "active":
      return client.contactStatus === "Seguimiento activo";
    case "overdue":
      return isClientOverdue(client);
    case "dueSoon":
      return isClientDueSoon(client);
    case "infoPending":
      return client.infoClear !== "Si";
    case "all":
    default:
      return true;
  }
}

function getFilterLabel() {
  const map = {
    all: "Todos",
    pending: "Pendientes",
    contacted: "Contactados",
    active: "Seguimiento activo",
    overdue: "Vencidos",
    dueSoon: "Prox 7 dias",
    infoPending: "Info por aclarar",
  };
  return map[state.clientFilter] || "Todos";
}

function applyTheme() {
  document.body.setAttribute("data-theme", state.theme);
  themeToggleEl.textContent = state.theme === "light" ? "☀" : "☾";
  if (particleSystem) {
    particleSystem.updateColors();
  }
}

function toRgba(color, alpha) {
  const value = String(color || "").trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const fullHex = hex.length === 3 ? hex.split("").map((char) => `${char}${char}`).join("") : hex;
    const int = Number.parseInt(fullHex, 16);
    if (!Number.isNaN(int)) {
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  if (value.startsWith("rgb(")) {
    return value.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  return value;
}

function initParticles() {
  if (!particlesCanvasEl) return null;
  const context = particlesCanvasEl.getContext("2d");
  if (!context) return null;

  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = null;
  let particles = [];
  let dotColor = "rgba(56, 189, 248, 0.35)";
  let linkColor = "rgba(149, 164, 187, 0.15)";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateColors() {
    const styles = getComputedStyle(document.body);
    dotColor = toRgba(styles.getPropertyValue("--brand"), 0.35);
    linkColor = toRgba(styles.getPropertyValue("--text-muted"), 0.16);
  }

  function randomParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      size: Math.random() * 1.8 + 0.8,
    };
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    particlesCanvasEl.width = Math.floor(width * ratio);
    particlesCanvasEl.height = Math.floor(height * ratio);
    particlesCanvasEl.style.width = `${width}px`;
    particlesCanvasEl.style.height = `${height}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);

    const count = Math.max(30, Math.min(110, Math.floor((width * height) / 22000)));
    particles = Array.from({ length: count }, randomParticle);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.fillStyle = dotColor;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 110) {
          context.strokeStyle = linkColor;
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
    }

    frame = window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  updateColors();
  resize();

  if (!prefersReduced) {
    draw();
  } else {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      context.fillStyle = dotColor;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });
  }

  return {
    updateColors,
    destroy() {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    },
  };
}

function renderTicker() {
  const clients = getAllClients();

  const pending = clients.filter((client) => client.contactStatus === "Pendiente").length;
  const contacted = clients.filter((client) => client.contactStatus === "Contactado").length;
  const active = clients.filter((client) => client.contactStatus === "Seguimiento activo").length;
  const infoPending = clients.filter((client) => client.infoClear !== "Si").length;

  const overdue = clients.filter((client) => isClientOverdue(client)).length;
  const dueSoon = clients.filter((client) => isClientDueSoon(client)).length;

  const metrics = [
    { filter: "all", label: "Clientes", value: clients.length, tone: "", icon: "•" },
    { filter: "pending", label: "Pendientes", value: pending, tone: "warn", icon: "▼" },
    { filter: "contacted", label: "Contactados", value: contacted, tone: "ok", icon: "▲" },
    { filter: "active", label: "Seguimiento activo", value: active, tone: "ok", icon: "▲" },
    { filter: "overdue", label: "Vencidos", value: overdue, tone: overdue > 0 ? "danger" : "ok", icon: overdue > 0 ? "▼" : "▲" },
    { filter: "dueSoon", label: "Prox 7 dias", value: dueSoon, tone: "", icon: "•" },
    { filter: "infoPending", label: "Info por aclarar", value: infoPending, tone: infoPending > 0 ? "warn" : "ok", icon: infoPending > 0 ? "▼" : "▲" },
  ];

  const tickerItemsMarkup = metrics
    .map(
      (metric) =>
        `<button type="button" class="ticker-item ${metric.tone} ${metric.filter === state.clientFilter ? "is-active" : ""}" data-filter="${metric.filter}"><span class="ticker-dot"></span>${metric.label} <strong>${metric.icon} ${metric.value}</strong></button>`
    )
    .join("");

  tickerEl.innerHTML = `<div class="ticker-segment">${tickerItemsMarkup}</div>`;
  const segmentWidth = tickerEl.firstElementChild?.getBoundingClientRect().width || window.innerWidth;
  const repeats = Math.max(3, Math.ceil((window.innerWidth * 2) / Math.max(segmentWidth, 1)) + 1);
  tickerEl.innerHTML = Array.from({ length: repeats }, () => `<div class="ticker-segment">${tickerItemsMarkup}</div>`).join("");
}

function renderAgents() {
  agentCountEl.textContent = `${agents.length} total`;
  agentListEl.innerHTML = "";

  agents.forEach((agent, index) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", index);
    const button = document.createElement("button");
    button.className = agent.id === state.selectedAgentId ? "active" : "";
    button.innerHTML = `<span class="agent-avatar" title="${getInitials(agent.name)}">${getAgentAvatarSvg(agent.id)}</span><span class="card-copy"><strong>${agent.name}</strong><div class="agent-meta">${agent.clients.length} clientes</div></span>`;
    button.addEventListener("click", () => {
      state.selectedAgentId = agent.id;
      state.selectedClientId = null;
      state.smsEditingTaskId = null;
      render();
    });
    li.appendChild(button);
    agentListEl.appendChild(li);
  });

}

function renderClients() {
  const agent = getSelectedAgent();
  clientListEl.innerHTML = "";
  const shouldAnimate = state.lastRenderedAgentId !== state.selectedAgentId;

  if (!agent) {
    clientsTitleEl.textContent = "Clientes";
    clientCountEl.textContent = "0";
    setFormDisabled(addClientFormEl, true);
    return;
  }

  const filteredClients = agent.clients.filter(matchesClientFilter);
  clientsTitleEl.textContent = `Clientes de ${agent.name} (${getFilterLabel()})`;
  clientCountEl.textContent = `${filteredClients.length}/${agent.clients.length}`;
  setFormDisabled(addClientFormEl, false);

  if (agent.clients.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="empty-state">Este agente no tiene clientes todavia.</div>`;
    clientListEl.appendChild(li);
    return;
  }

  if (filteredClients.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="empty-state">No hay clientes para el filtro: ${getFilterLabel()}.</div>`;
    clientListEl.appendChild(li);
    return;
  }

  filteredClients.forEach((client, index) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", index);
    const button = document.createElement("button");
    const status = client.contactStatus || "Pendiente";
    button.className = client.id === state.selectedClientId ? "active" : "";
    button.innerHTML = `<strong>${client.clientName}</strong><div class="client-meta">${client.company} | ${status}</div>`;
    button.addEventListener("click", () => {
      state.selectedClientId = client.id;
      state.smsEditingTaskId = null;
      render();
    });
    li.appendChild(button);
    clientListEl.appendChild(li);
  });

  if (shouldAnimate) {
    animateIn(clientListEl, "detail-enter");
  }
}

function handleTickerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const button = target.closest("[data-filter]");
  if (!(button instanceof HTMLElement)) return;

  const filter = button.dataset.filter;
  if (!filter) return;

  state.clientFilter = state.clientFilter === filter && filter !== "all" ? "all" : filter;
  state.selectedClientId = null;
  state.smsEditingTaskId = null;
  render();
  clientListEl.scrollIntoView({ behavior: "smooth", block: "start" });
  notify(`Filtro aplicado: ${getFilterLabel()}`, "info");
}

function handleWindowResize() {
  if (tickerResizeFrame) {
    window.cancelAnimationFrame(tickerResizeFrame);
  }
  tickerResizeFrame = window.requestAnimationFrame(() => {
    renderTicker();
    tickerResizeFrame = null;
  });
}

function renderClientForm() {
  addClientFormEl.classList.toggle("hidden-form", !state.clientFormOpen);
}

function renderChecklist() {
  checklistPanelEl.classList.toggle("hidden", !state.checklistOpen);
  checklistPanelEl.setAttribute("aria-hidden", String(!state.checklistOpen));

  if (state.checklistPosition) {
    checklistPanelEl.style.left = `${state.checklistPosition.x}px`;
    checklistPanelEl.style.top = `${state.checklistPosition.y}px`;
    checklistPanelEl.style.right = "auto";
  } else {
    checklistPanelEl.style.left = "";
    checklistPanelEl.style.top = "";
    checklistPanelEl.style.right = "14px";
  }

  checklistListEl.innerHTML = "";

  if (checklist.length === 0) {
    checklistListEl.innerHTML = '<li class="empty-state">Sin tareas por ahora.</li>';
    return;
  }

  checklist.forEach((item) => {
    const li = document.createElement("li");
    li.className = `check-item ${item.done ? "done" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = item.id;
    checkbox.setAttribute("aria-label", "Marcar tarea");

    if (state.checklistEditingId === item.id) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = item.text;
      input.className = "check-inline-input";
      input.dataset.id = item.id;
      input.setAttribute("aria-label", "Editar tarea");

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "check-edit";
      saveBtn.dataset.action = "save-edit";
      saveBtn.dataset.id = item.id;
      saveBtn.setAttribute("aria-label", "Guardar edicion");
      saveBtn.textContent = "✓";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "check-remove";
      cancelBtn.dataset.action = "cancel-edit";
      cancelBtn.dataset.id = item.id;
      cancelBtn.setAttribute("aria-label", "Cancelar edicion");
      cancelBtn.textContent = "×";

      li.appendChild(checkbox);
      li.appendChild(input);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);
    } else {
      const label = document.createElement("span");
      label.className = "check-label";
      label.textContent = item.text;

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "check-edit";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = item.id;
      editBtn.setAttribute("aria-label", "Editar tarea");
      editBtn.textContent = "✎";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "check-remove";
      removeBtn.dataset.action = "remove";
      removeBtn.dataset.id = item.id;
      removeBtn.setAttribute("aria-label", "Eliminar tarea");
      removeBtn.textContent = "×";

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(editBtn);
      li.appendChild(removeBtn);
    }

    checklistListEl.appendChild(li);
  });

  if (state.checklistEditingId) {
    const activeInput = checklistListEl.querySelector(`.check-inline-input[data-id="${state.checklistEditingId}"]`);
    if (activeInput) {
      activeInput.focus();
      activeInput.setSelectionRange(activeInput.value.length, activeInput.value.length);
    }
  }
}

function renderSmsTasks(client) {
  const tasks = client.smsTasks || [];
  const stats = getSmsTaskStats(tasks);

  smsOverdueCountEl.textContent = String(stats.overdue);
  smsTodayCountEl.textContent = String(stats.today);
  smsUpcomingCountEl.textContent = String(stats.upcoming);

  smsTaskListEl.innerHTML = "";

  if (tasks.length === 0) {
    smsTaskListEl.innerHTML = '<li class="empty-state">Sin tareas SMS programadas para este cliente.</li>';
    return;
  }

  tasks
    .slice()
    .sort((a, b) => {
      const aDiff = getDateDiffFromToday(a.dueDate);
      const bDiff = getDateDiffFromToday(b.dueDate);
      if (aDiff === null && bDiff === null) return 0;
      if (aDiff === null) return 1;
      if (bDiff === null) return -1;
      return aDiff - bDiff;
    })
    .forEach((task) => {
      const li = document.createElement("li");
      li.className = "sms-task-item";

      if (state.smsEditingTaskId === task.id) {
        li.innerHTML = `
          <div class="sms-edit-grid">
            <select data-role="edit-type" data-id="${task.id}">
              <option value="SMS Invoice" ${task.type === "SMS Invoice" ? "selected" : ""}>SMS Invoice</option>
              <option value="Recordatorio pago" ${task.type === "Recordatorio pago" ? "selected" : ""}>Recordatorio pago</option>
              <option value="Seguimiento cliente" ${task.type === "Seguimiento cliente" ? "selected" : ""}>Seguimiento cliente</option>
            </select>
            <input data-role="edit-date" data-id="${task.id}" type="date" value="${task.dueDate || ""}" />
            <select data-role="edit-status" data-id="${task.id}">
              <option value="Pendiente" ${task.status === "Pendiente" ? "selected" : ""}>Pendiente</option>
              <option value="Enviado" ${task.status === "Enviado" ? "selected" : ""}>Enviado</option>
              <option value="Completado" ${task.status === "Completado" ? "selected" : ""}>Completado</option>
            </select>
            <input data-role="edit-message" data-id="${task.id}" type="text" value="${task.message.replace(/"/g, "&quot;")}" />
          </div>
          <div class="sms-task-actions">
            <button type="button" data-action="save-sms" data-id="${task.id}">Guardar</button>
            <button type="button" data-action="cancel-edit-sms" data-id="${task.id}">Cancelar</button>
          </div>
        `;
      } else {
        li.innerHTML = `
          <div class="sms-task-top">
            <span class="sms-task-meta">${task.type} | ${task.dueDate || "Sin fecha"}</span>
            <span class="sms-task-status">${task.status}</span>
          </div>
          <div class="sms-task-message">${task.message}</div>
          <div class="sms-task-actions">
            <button type="button" data-action="mark-sent" data-id="${task.id}">Marcar enviado</button>
            <button type="button" data-action="edit-sms" data-id="${task.id}">Editar</button>
            <button type="button" data-action="remove-sms" data-id="${task.id}">Eliminar</button>
          </div>
        `;
      }

      smsTaskListEl.appendChild(li);
    });
}

function renderDetail() {
  const client = getSelectedClient();
  if (!client) {
    state.smsEditingTaskId = null;
    detailEl.classList.add("hidden");
    emptyDetailEl.classList.remove("hidden");
    setFormDisabled(editClientFormEl, true);
    setFormDisabled(smsTaskFormEl, true);
    smsTaskListEl.innerHTML = "";
    smsOverdueCountEl.textContent = "0";
    smsTodayCountEl.textContent = "0";
    smsUpcomingCountEl.textContent = "0";
    editClientFormEl.reset();
    return;
  }

  detailEl.classList.remove("hidden");
  animateIn(detailEl, "detail-enter");
  emptyDetailEl.classList.add("hidden");
  setFormDisabled(editClientFormEl, false);
  setFormDisabled(smsTaskFormEl, false);

  detailClientNameEl.textContent = client.clientName;
  detailCompanyEl.textContent = client.company;
  detailPhoneEl.textContent = client.phone || "-";
  detailEmailEl.textContent = client.email || "-";

  editClientFormEl.elements.clientName.value = client.clientName;
  editClientFormEl.elements.company.value = client.company;
  editClientFormEl.elements.phone.value = client.phone || "";
  editClientFormEl.elements.email.value = client.email || "";
  editClientFormEl.elements.contactStatus.value = client.contactStatus || "Pendiente";
  editClientFormEl.elements.lastContactDate.value = client.lastContactDate || "";
  editClientFormEl.elements.nextFollowUpDate.value = client.nextFollowUpDate || "";
  editClientFormEl.elements.infoClear.value = client.infoClear || "Pendiente";
  editClientFormEl.elements.followUpNotes.value = client.followUpNotes || "";

  renderSmsTasks(client);
}

function handleAddAgent(event) {
  event.preventDefault();
  const name = String(new FormData(addAgentFormEl).get("name") || "").trim();
  if (!name) return;

  const id = uniqueId(slugify(name), agents);
  agents.push({ id, name, clients: [] });
  state.selectedAgentId = id;
  state.selectedClientId = null;
  addAgentFormEl.reset();

  saveAgents();
  render();
  notify(`Agente creado: ${name}`);
}

function handleAddClient(event) {
  event.preventDefault();
  const agent = getSelectedAgent();
  if (!agent) return;

  const formData = new FormData(addClientFormEl);
  const clientName = String(formData.get("clientName") || "").trim();
  const company = String(formData.get("company") || "").trim();
  if (!clientName || !company) return;

  const id = uniqueId(slugify(clientName), agent.clients);
  const client = normalizeClient({
    id,
    clientName,
    company,
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    contactStatus: "Pendiente",
    lastContactDate: "",
    nextFollowUpDate: "",
    infoClear: "Pendiente",
    followUpNotes: "",
    smsTasks: [],
  });

  agent.clients.push(client);
  state.selectedClientId = id;
  state.clientFormOpen = false;
  addClientFormEl.reset();

  saveAgents();
  render();
  notify(`Cliente agregado: ${clientName}`);
}

function handleUpdateClient(event) {
  event.preventDefault();
  const client = getSelectedClient();
  if (!client) return;

  const formData = new FormData(editClientFormEl);
  const clientName = String(formData.get("clientName") || "").trim();
  const company = String(formData.get("company") || "").trim();
  if (!clientName || !company) return;

  client.clientName = clientName;
  client.company = company;
  client.phone = String(formData.get("phone") || "").trim();
  client.email = String(formData.get("email") || "").trim();
  client.contactStatus = String(formData.get("contactStatus") || "Pendiente");
  client.lastContactDate = String(formData.get("lastContactDate") || "");
  client.nextFollowUpDate = String(formData.get("nextFollowUpDate") || "");
  client.infoClear = String(formData.get("infoClear") || "Pendiente");
  client.followUpNotes = String(formData.get("followUpNotes") || "").trim();

  saveAgents();
  render();
  notify(`Tracking actualizado: ${clientName}`, "info");
}

function handleAddSmsTask(event) {
  event.preventDefault();
  const client = getSelectedClient();
  if (!client) return;

  const formData = new FormData(smsTaskFormEl);
  const type = String(formData.get("type") || "SMS Invoice").trim() || "SMS Invoice";
  const dueDate = String(formData.get("dueDate") || "").trim();
  const status = String(formData.get("status") || "Pendiente").trim() || "Pendiente";
  const message = String(formData.get("message") || "").trim();
  if (!dueDate || !message) return;

  const smsTasks = client.smsTasks || (client.smsTasks = []);
  smsTasks.push({
    id: uniqueId(slugify(`${type}-${dueDate}`), smsTasks),
    type,
    dueDate,
    status,
    message,
  });

  smsTaskFormEl.reset();
  smsTaskFormEl.elements.type.value = "SMS Invoice";
  smsTaskFormEl.elements.status.value = "Pendiente";
  state.smsEditingTaskId = null;
  saveAgents();
  render();
  notify("Tarea SMS agregada");
}

function handleSmsTaskListClick(event) {
  const client = getSelectedClient();
  if (!client) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionEl = target.closest("[data-action]");
  if (!(actionEl instanceof HTMLElement)) return;

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;
  if (!action || !id) return;

  const tasks = client.smsTasks || [];
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  if (action === "mark-sent") {
    tasks[index].status = "Enviado";
    saveAgents();
    render();
    notify("SMS marcado como enviado", "info");
    return;
  }

  if (action === "edit-sms") {
    state.smsEditingTaskId = id;
    render();
    return;
  }

  if (action === "cancel-edit-sms") {
    state.smsEditingTaskId = null;
    render();
    return;
  }

  if (action === "save-sms") {
    const row = actionEl.closest(".sms-task-item");
    if (!(row instanceof HTMLElement)) return;
    const typeInput = row.querySelector('[data-role="edit-type"]');
    const dateInput = row.querySelector('[data-role="edit-date"]');
    const statusInput = row.querySelector('[data-role="edit-status"]');
    const messageInput = row.querySelector('[data-role="edit-message"]');

    if (!(typeInput instanceof HTMLSelectElement)) return;
    if (!(dateInput instanceof HTMLInputElement)) return;
    if (!(statusInput instanceof HTMLSelectElement)) return;
    if (!(messageInput instanceof HTMLInputElement)) return;

    const message = messageInput.value.trim();
    const dueDate = dateInput.value.trim();
    if (!message || !dueDate) return;

    tasks[index].type = typeInput.value;
    tasks[index].dueDate = dueDate;
    tasks[index].status = statusInput.value;
    tasks[index].message = message;

    state.smsEditingTaskId = null;
    saveAgents();
    render();
    notify("Tarea SMS actualizada", "info");
    return;
  }

  if (action === "remove-sms") {
    tasks.splice(index, 1);
    if (state.smsEditingTaskId === id) {
      state.smsEditingTaskId = null;
    }
    saveAgents();
    render();
    notify("Tarea SMS eliminada", "error");
  }
}

function handleDeleteClient() {
  const agent = getSelectedAgent();
  const client = getSelectedClient();
  if (!agent || !client) return;
  const deletedName = client.clientName;

  const index = agent.clients.findIndex((item) => item.id === client.id);
  if (index === -1) return;

  agent.clients.splice(index, 1);
  state.selectedClientId = null;
  saveAgents();
  render();
  notify(`Cliente eliminado: ${deletedName}`, "error");
}

function handleOpenClientForm() {
  state.clientFormOpen = true;
  renderClientForm();
  addClientNameInputEl?.focus();
}

function handleCloseClientForm() {
  state.clientFormOpen = false;
  renderClientForm();
}

function handleChecklistAdd(event) {
  event.preventDefault();
  const text = String(new FormData(checklistAddFormEl).get("item") || "").trim();
  if (!text) return;

  checklist.unshift({
    id: uniqueId(slugify(text), checklist),
    text,
    done: false,
  });

  checklistAddFormEl.reset();
  saveChecklist();
  renderChecklist();
  notify("Tarea agregada al checklist");
}

function commitChecklistEdit(id, text) {
  const index = checklist.findIndex((item) => item.id === id);
  if (index === -1) return;
  const normalized = String(text || "").trim();
  if (!normalized) return;

  checklist[index].text = normalized;
  state.checklistEditingId = null;
  saveChecklist();
  renderChecklist();
  notify("Tarea actualizada", "info");
}

function handleChecklistListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionEl = target.closest("[data-action]");
  if (!(actionEl instanceof HTMLElement)) return;
  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;
  if (!action || !id) return;

  const index = checklist.findIndex((item) => item.id === id);
  if (index === -1) return;

  if (action === "toggle") {
    checklist[index].done = !checklist[index].done;
    saveChecklist();
    renderChecklist();
    return;
  }

  if (action === "remove") {
    checklist.splice(index, 1);
    if (state.checklistEditingId === id) {
      state.checklistEditingId = null;
    }
    saveChecklist();
    renderChecklist();
    notify("Tarea eliminada", "info");
    return;
  }

  if (action === "edit") {
    state.checklistEditingId = id;
    renderChecklist();
    return;
  }

  if (action === "cancel-edit") {
    state.checklistEditingId = null;
    renderChecklist();
    return;
  }

  if (action === "save-edit") {
    const li = actionEl.closest(".check-item");
    const input = li?.querySelector(".check-inline-input");
    if (input instanceof HTMLInputElement) {
      commitChecklistEdit(id, input.value);
    }
  }
}

function handleChecklistListKeydown(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.classList.contains("check-inline-input")) return;

  const id = target.dataset.id;
  if (!id) return;

  if (event.key === "Enter") {
    event.preventDefault();
    commitChecklistEdit(id, target.value);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    state.checklistEditingId = null;
    renderChecklist();
  }
}

function toggleChecklist() {
  state.checklistOpen = !state.checklistOpen;
  renderChecklist();
}

function closeChecklist() {
  if (!state.checklistOpen) return;
  state.checklistEditingId = null;
  state.checklistOpen = false;
  renderChecklist();
}

function setupChecklistDrag() {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function onPointerMove(event) {
    if (!dragging || !state.checklistOpen) return;
    const rect = checklistPanelEl.getBoundingClientRect();
    const nextX = Math.min(Math.max(8, event.clientX - offsetX), window.innerWidth - rect.width - 8);
    const nextY = Math.min(Math.max(8, event.clientY - offsetY), window.innerHeight - rect.height - 8);

    state.checklistPosition = { x: nextX, y: nextY };
    checklistPanelEl.style.left = `${nextX}px`;
    checklistPanelEl.style.top = `${nextY}px`;
    checklistPanelEl.style.right = "auto";
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    checklistPanelEl.classList.remove("dragging");
    document.body.style.userSelect = "";
    saveChecklistPosition();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  checklistHeadEl.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !state.checklistOpen) return;

    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button,input,textarea,select,a")) return;

    const rect = checklistPanelEl.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    dragging = true;
    checklistPanelEl.classList.add("dragging");
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    event.preventDefault();
  });
}

function handleGlobalShortcuts(event) {
  const key = event.key.toLowerCase();
  const code = event.code;
  const target = event.target;
  const typingOnField =
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

  if (typingOnField && !event.altKey && key !== "escape") {
    return;
  }

  const openClientShortcut =
    (event.altKey && (key === "z" || code === "KeyZ")) ||
    ((event.ctrlKey || event.metaKey) && event.altKey && (key === "z" || code === "KeyZ"));
  const toggleChecklistShortcut =
    (event.altKey && (key === "c" || code === "KeyC")) ||
    ((event.ctrlKey || event.metaKey) && event.altKey && (key === "c" || code === "KeyC"));
  const closePanelsShortcut =
    (event.altKey && (key === "x" || code === "KeyX")) ||
    ((event.ctrlKey || event.metaKey) && event.altKey && (key === "x" || code === "KeyX")) ||
    key === "escape" ||
    code === "Escape";

  if (openClientShortcut) {
    event.preventDefault();
    handleOpenClientForm();
    return;
  }

  if (toggleChecklistShortcut) {
    event.preventDefault();
    toggleChecklist();
    return;
  }

  if (closePanelsShortcut) {
    event.preventDefault();
    handleCloseClientForm();
    closeChecklist();
  }
}

function toggleTheme() {
  if (state.theme === "light") {
    state.theme = state.lastDarkTheme;
  } else {
    state.lastDarkTheme = state.theme;
    state.theme = "light";
  }
  localStorage.setItem(THEME_KEY, state.theme);
  localStorage.setItem(LAST_DARK_THEME_KEY, state.lastDarkTheme);
  applyTheme();
  notify(`Tema ${state.theme === "light" ? "claro" : state.theme}`, "info");
}

function cyclePaletteTheme() {
  const current = state.theme === "light" ? state.lastDarkTheme : state.theme;
  const currentIndex = DARK_THEMES.indexOf(current);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % DARK_THEMES.length;
  const nextTheme = DARK_THEMES[nextIndex];

  state.theme = nextTheme;
  state.lastDarkTheme = nextTheme;
  localStorage.setItem(THEME_KEY, state.theme);
  localStorage.setItem(LAST_DARK_THEME_KEY, state.lastDarkTheme);
  applyTheme();
  notify(`Paleta activa: ${nextTheme}`, "info");
}

function render() {
  if (!getSelectedAgent() && agents.length > 0) {
    state.selectedAgentId = agents[0].id;
  }
  if (!getSelectedAgent()) {
    state.selectedClientId = null;
  }

  renderAgents();
  renderClients();
  renderDetail();
  renderTicker();
  renderClientForm();
  renderChecklist();
  state.lastRenderedAgentId = state.selectedAgentId;
}

themeToggleEl.addEventListener("click", toggleTheme);
themeCycleEl.addEventListener("click", cyclePaletteTheme);
addAgentFormEl.addEventListener("submit", handleAddAgent);
addClientFormEl.addEventListener("submit", handleAddClient);
editClientFormEl.addEventListener("submit", handleUpdateClient);
deleteClientBtnEl.addEventListener("click", handleDeleteClient);
smsTaskFormEl.addEventListener("submit", handleAddSmsTask);
smsTaskListEl.addEventListener("click", handleSmsTaskListClick);
checklistAddFormEl.addEventListener("submit", handleChecklistAdd);
checklistListEl.addEventListener("click", handleChecklistListClick);
checklistListEl.addEventListener("keydown", handleChecklistListKeydown);
tickerEl.addEventListener("click", handleTickerClick);
window.addEventListener("keydown", handleGlobalShortcuts);
window.addEventListener("resize", handleWindowResize);

applyTheme();
particleSystem = initParticles();
setupChecklistDrag();
render();
