import { agents as seedAgents } from "./data.js";

const STORAGE_KEY = "sales-tracker-agents-v1";
const THEME_KEY = "citifuel-theme";
const LAST_DARK_THEME_KEY = "citifuel-last-dark-theme";
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

const detailEl = document.getElementById("client-detail");
const emptyDetailEl = document.getElementById("empty-detail");
const detailClientNameEl = document.getElementById("detail-client-name");
const detailCompanyEl = document.getElementById("detail-company");
const detailPhoneEl = document.getElementById("detail-phone");
const detailEmailEl = document.getElementById("detail-email");

const editClientFormEl = document.getElementById("edit-client-form");
const deleteClientBtnEl = document.getElementById("delete-client-btn");

const agents = loadAgents();
const savedTheme = localStorage.getItem(THEME_KEY);
const savedDarkTheme = localStorage.getItem(LAST_DARK_THEME_KEY);
const normalizedDarkTheme = DARK_THEMES.includes(savedDarkTheme) ? savedDarkTheme : "ocean";
const normalizedTheme =
  savedTheme === "light" || DARK_THEMES.includes(savedTheme) ? savedTheme : savedTheme === "dark" ? "ocean" : "ocean";

const state = {
  selectedAgentId: agents[0]?.id ?? null,
  selectedClientId: null,
  theme: normalizedTheme,
  lastDarkTheme: normalizedDarkTheme,
  clientFormOpen: false,
  lastRenderedAgentId: null,
};

let particleSystem = null;

function cloneSeedAgents() {
  return JSON.parse(JSON.stringify(seedAgents));
}

function normalizeClient(client) {
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
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const pending = clients.filter((client) => client.contactStatus === "Pendiente").length;
  const contacted = clients.filter((client) => client.contactStatus === "Contactado").length;
  const active = clients.filter((client) => client.contactStatus === "Seguimiento activo").length;
  const infoPending = clients.filter((client) => client.infoClear !== "Si").length;

  let overdue = 0;
  let dueSoon = 0;
  clients.forEach((client) => {
    if (!client.nextFollowUpDate) return;
    const date = new Date(`${client.nextFollowUpDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;

    const diffDays = Math.floor((date - today) / 86400000);
    if (diffDays < 0 && client.contactStatus !== "Cerrado") overdue += 1;
    if (diffDays >= 0 && diffDays <= 7) dueSoon += 1;
  });

  const metrics = [
    { label: "Clientes", value: clients.length, tone: "", icon: "•" },
    { label: "Pendientes", value: pending, tone: "warn", icon: "▼" },
    { label: "Contactados", value: contacted, tone: "ok", icon: "▲" },
    { label: "Seguimiento activo", value: active, tone: "ok", icon: "▲" },
    { label: "Vencidos", value: overdue, tone: overdue > 0 ? "danger" : "ok", icon: overdue > 0 ? "▼" : "▲" },
    { label: "Prox 7 dias", value: dueSoon, tone: "", icon: "•" },
    { label: "Info por aclarar", value: infoPending, tone: infoPending > 0 ? "warn" : "ok", icon: infoPending > 0 ? "▼" : "▲" },
  ];

  const tickerItems = metrics
    .map(
      (metric) =>
        `<span class="ticker-item ${metric.tone}"><span class="ticker-dot"></span>${metric.label} <strong>${metric.icon} ${metric.value}</strong></span>`
    )
    .join("");

  tickerEl.innerHTML = `<div class="ticker-segment">${tickerItems}</div><div class="ticker-segment">${tickerItems}</div>`;
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

  clientsTitleEl.textContent = `Clientes de ${agent.name}`;
  clientCountEl.textContent = `${agent.clients.length} total`;
  setFormDisabled(addClientFormEl, false);

  if (agent.clients.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="empty-state">Este agente no tiene clientes todavia.</div>`;
    clientListEl.appendChild(li);
    return;
  }

  agent.clients.forEach((client, index) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", index);
    const button = document.createElement("button");
    const status = client.contactStatus || "Pendiente";
    button.className = client.id === state.selectedClientId ? "active" : "";
    button.innerHTML = `<strong>${client.clientName}</strong><div class="client-meta">${client.company} | ${status}</div>`;
    button.addEventListener("click", () => {
      state.selectedClientId = client.id;
      render();
    });
    li.appendChild(button);
    clientListEl.appendChild(li);
  });

  if (shouldAnimate) {
    animateIn(clientListEl, "detail-enter");
  }
}

function renderClientForm() {
  addClientFormEl.classList.toggle("hidden-form", !state.clientFormOpen);
}

function renderDetail() {
  const client = getSelectedClient();
  if (!client) {
    detailEl.classList.add("hidden");
    emptyDetailEl.classList.remove("hidden");
    setFormDisabled(editClientFormEl, true);
    editClientFormEl.reset();
    return;
  }

  detailEl.classList.remove("hidden");
  animateIn(detailEl, "detail-enter");
  emptyDetailEl.classList.add("hidden");
  setFormDisabled(editClientFormEl, false);

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

function handleGlobalShortcuts(event) {
  const key = event.key.toLowerCase();
  const withModifier = event.ctrlKey || event.metaKey;

  if ((event.altKey && key === "z") || (withModifier && event.shiftKey && key === "n")) {
    event.preventDefault();
    handleOpenClientForm();
    return;
  }

  if ((key === "escape" && state.clientFormOpen) || (event.altKey && key === "x")) {
    event.preventDefault();
    handleCloseClientForm();
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
  state.lastRenderedAgentId = state.selectedAgentId;
}

themeToggleEl.addEventListener("click", toggleTheme);
themeCycleEl.addEventListener("click", cyclePaletteTheme);
addAgentFormEl.addEventListener("submit", handleAddAgent);
addClientFormEl.addEventListener("submit", handleAddClient);
editClientFormEl.addEventListener("submit", handleUpdateClient);
deleteClientBtnEl.addEventListener("click", handleDeleteClient);
window.addEventListener("keydown", handleGlobalShortcuts);

applyTheme();
particleSystem = initParticles();
render();
