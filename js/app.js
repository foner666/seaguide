/* SeaGuide — интерактивная палуба. Данные профессий живут в crew.js. */
(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animeApi = window.anime || {};
  const animate = animeApi.animate;
  const easeOut = "out(4)";
  const easeExpo = "out(5)";
  const easeCinema = "inOut(3)";
  let currentZone = null;
  let currentFilter = "all";
  let seaFrame = 0;
  let roomFrame = 0;
  let roomRenderToken = 0;
  let lastFocused = null;

  const moduleById = (id) => MODULES.find((module) => module.id === id);
  const zoneById = (id) => ZONES.find((zone) => zone.id === id);
  const profById = (id) => PROFESSIONS.find((profession) => profession.id === id);

  function motion(targets, options) {
    if (!targets || (Array.isArray(targets) && !targets.length)) return;
    if (reduceMotion) {
      if (options.opacity !== undefined) {
        const value = Array.isArray(options.opacity) ? options.opacity.at(-1) : options.opacity;
        $$(typeof targets === "string" ? targets : "*", document).forEach((el) => { el.style.opacity = value; });
      }
      return;
    }
    if (typeof animate === "function") animate(targets, options);
  }

  function renderContainers() {
    const containerGroup = $("#containers");
    if (!containerGroup) return;
    const colors = ["#a44f3c", "#d09d4d", "#3d7182", "#6a8a86", "#b95e49"];
    const result = [];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const x = 650 + col * 72 + (row % 2 ? 7 : 0);
        const y = 493 - row * 25;
        const color = colors[(row * 8 + col) % colors.length];
        result.push(`<rect x="${x}" y="${y}" width="64" height="22" rx="2" fill="${color}" opacity=".9"/><path d="M${x + 20} ${y}v22M${x + 42} ${y}v22" stroke="#fff" opacity=".13"/>`);
      }
    }
    containerGroup.innerHTML = result.join("");
  }

  function renderSmoke() {
    const smoke = $("#smoke");
    if (!smoke) return;
    smoke.innerHTML = [
      [577, 445, 12, .18], [588, 415, 19, .14], [570, 378, 28, .1], [600, 340, 38, .08]
    ].map(([cx, cy, r, opacity]) => `<circle cx="${cx}" cy="${cy}" r="${r}" opacity="${opacity}"/>`).join("");
  }

  function renderHotspots() {
    const root = $("#hotspots");
    if (!root) return;
    const shapes = {
      bridge: `<path class="zone-shape" d="M274 350 L533 350 L550 435 L270 435 Z"/>`,
      deck: `<path class="zone-shape" d="M617 450 L1288 450 L1294 563 L617 562 Z"/>`,
      engine: `<path class="zone-shape" d="M510 570 L645 570 L645 654 L510 654 Z"/>`,
      radio: `<path class="zone-shape" d="M287 425 L525 425 L525 565 L287 565 Z"/>`
    };
    root.innerHTML = ZONES.map((zone) => `
      <g class="zone-hit" data-zone="${zone.id}" role="button" tabindex="0" aria-label="Открыть отсек: ${zone.title}">
        ${shapes[zone.id]}
        <g class="zone-label" transform="translate(${zone.labelX} ${zone.labelY})">
          <text>${zone.short}</text><text class="zone-label-sub" y="18">${zone.subtitle}</text>
        </g>
      </g>
    `).join("");
  }

  function renderDock() {
    $("#zoneDock").innerHTML = ZONES.map((zone) => `<button class="zone-tab" data-zone="${zone.id}" aria-label="Открыть ${zone.title}">${zone.short}</button>`).join("");
    $("#roomRail").innerHTML = ZONES.map((zone) => `<button class="rail-btn" data-zone="${zone.id}">${zone.short}</button>`).join("");
  }

  function renderCounts() {
    $$(`[data-count]`).forEach((element) => {
      const target = Number(element.dataset.count);
      if (reduceMotion || typeof animate !== "function") {
        element.textContent = target;
        return;
      }
      const counter = { value: 0 };
      animate(counter, { value: target, duration: 900, ease: easeExpo, delay: 450, onUpdate: () => { element.textContent = Math.round(counter.value); } });
    });
  }

  function renderZone(zone) {
    if (!zone) return;
    currentZone = zone;
    roomRenderToken += 1;
    const room = $("#room");
    room.dataset.zone = zone.id;
    room.hidden = false;
    $("#roomKicker").textContent = `${zone.short} · ${ZONES.indexOf(zone) + 1} из ${ZONES.length}`;
    $("#roomTitle").textContent = zone.title;
    $("#roomDesc").textContent = zone.desc;
    const count = CREW.filter((member) => member.zone === zone.id).length;
    $("#roomMeta").textContent = `${count} ${plural(count, "профессия", "профессии", "профессий")} · ${zone.modules.length} модуля`;
    $("#crewGrid").innerHTML = CREW.filter((member) => member.zone === zone.id).map((member) => `
      <button class="crew-card" data-crew="${member.id}" style="--crew-accent:${zone.accent}">
        <span class="crew-role">${member.role}</span>
        <h3>${member.title}</h3>
        <p>${member.desc}</p>
        <span class="open-card">Профиль профессии <span aria-hidden="true">→</span></span>
      </button>
    `).join("");
    $$(".rail-btn").forEach((button) => button.setAttribute("aria-current", String(button.dataset.zone === zone.id)));
    $("#heroCopy").style.opacity = "0";
    $("#zoneDock").style.opacity = "0";
    $("#scrollHint").style.opacity = "0";
    if (reduceMotion) return;
    motion(room, { opacity: [0, 1], duration: 460, ease: easeCinema });
    motion(".room-head > *, .crew-card", { opacity: [0, 1], translateY: [22, 0], duration: 560, delay: animeApi.stagger ? animeApi.stagger(70, { from: "first" }) : 0, ease: easeOut });
    drawRoom(zone.id);
  }

  function closeRoom() {
    const room = $("#room");
    if (reduceMotion) {
      room.hidden = true;
      $("#heroCopy").style.opacity = "1";
      $("#zoneDock").style.opacity = "1";
      $("#scrollHint").style.opacity = "1";
      return;
    }
    motion(room, { opacity: [1, 0], duration: 340, ease: easeCinema, onComplete: () => { room.hidden = true; } });
    motion("#heroCopy, #zoneDock, #scrollHint", { opacity: [0, 1], duration: 420, delay: 140, ease: easeOut });
  }

  function openCrew(id) {
    const member = CREW.find((item) => item.id === id);
    if (!member) return;
    lastFocused = document.activeElement;
    const zone = zoneById(member.zone);
    $("#crewScroll").innerHTML = `
      <div class="crew-sheet-top">
        <div><div class="crew-sheet-role" style="color:${zone.accent}">${member.role}</div><h2 id="crewName">${member.title}</h2></div>
        <span style="color:${zone.accent};font-size:11px;letter-spacing:.1em;text-transform:uppercase">${zone.short}</span>
      </div>
      <p class="sheet-lead">${member.desc}</p>
      <div class="crew-sheet-copy">
        <div><h3>Что делает</h3><ul>${member.duties.map((duty) => `<li>${duty}</li>`).join("")}</ul></div>
        <div><h3>Как прийти в профессию</h3><p>${member.path}</p></div>
      </div>
      <div class="module-section"><h3>Маршрут обучения</h3><div class="mod-grid">${member.modules.map(moduleCard).join("")}</div></div>
    `;
    const layer = $("#crewLayer");
    layer.hidden = false;
    document.body.style.overflow = "hidden";
    if (!reduceMotion) motion("#crewLayer .sheet", { opacity: [0, 1], translateY: [30, 0], duration: 420, ease: easeOut });
    $(".sheet-close", layer).focus();
  }

  function moduleCard(id) {
    const module = moduleById(id);
    if (!module) return "";
    const profession = profById(module.profession);
    return `<button class="mod-card" data-module="${module.id}"><small>${profession ? profession.title : "Модуль"} · ${LEVEL_LABELS[module.level] || ""}</small><strong>${module.title}</strong><span>${module.desc}</span></button>`;
  }

  function openModule(id) {
    const module = moduleById(id);
    if (!module) return;
    const profession = profById(module.profession);
    const content = module.detail || module.content || [];
    $("#moduleScroll").innerHTML = `
      <div class="module-sheet-meta">${profession ? profession.title : "Учебный модуль"} · ${LEVEL_LABELS[module.level] || ""}</div>
      <h2 id="modName">${module.title}</h2>
      <p class="sheet-lead">${module.desc}</p>
      ${module.goal ? `<p class="sheet-note">Цель: ${module.goal}</p>` : ""}
      ${content.map((section) => `<section class="module-section"><h3>${section.h}</h3>${section.p ? `<p>${section.p}</p>` : ""}${section.list ? `<ul>${section.list.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}${section.tip ? `<div class="module-tip"><p>${section.tip}</p></div>` : ""}</section>`).join("")}
      ${module.quiz?.length ? `<a class="module-cta" href="module.html?id=${module.id}">Открыть полный материал и тест <span aria-hidden="true">→</span></a>` : ""}
    `;
    const layer = $("#moduleLayer");
    layer.hidden = false;
    document.body.style.overflow = "hidden";
    if (!reduceMotion) motion("#moduleLayer .sheet", { opacity: [0, 1], translateY: [30, 0], duration: 420, ease: easeOut });
    $(".sheet-close", layer).focus();
  }

  function renderAll() {
    const filterRoot = $("#allFilters");
    filterRoot.innerHTML = [{ id: "all", title: "Все" }, ...ZONES.map((zone) => ({ id: zone.id, title: zone.short }))].map((item) => `<button class="filter-btn" data-filter="${item.id}" aria-pressed="${item.id === currentFilter}">${item.title}</button>`).join("");
    drawAll();
  }

  function drawAll() {
    const query = $("#allSearch").value.trim().toLowerCase();
    const zoneIds = currentFilter === "all" ? null : new Set((CREW.filter((member) => member.zone === currentFilter).flatMap((member) => member.modules)));
    const modules = MODULES.filter((module) => {
      if (zoneIds && !zoneIds.has(module.id)) return false;
      return !query || `${module.title} ${module.desc} ${(module.topics || []).join(" ")}`.toLowerCase().includes(query);
    });
    $("#allGrid").innerHTML = modules.map(moduleCard).join("") || `<p class="sheet-lead">Ничего не найдено. Попробуйте другое слово.</p>`;
    if (!reduceMotion) motion("#allGrid .mod-card", { opacity: [0, 1], translateY: [12, 0], duration: 300, delay: animeApi.stagger ? animeApi.stagger(35) : 0, ease: easeOut });
  }

  function closeLayer(name) {
    const layer = $(`#${name}Layer`);
    if (!layer) return;
    if (reduceMotion) {
      layer.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused?.focus) lastFocused.focus();
      return;
    }
    motion(".sheet", { opacity: [1, 0], translateY: [0, 18], duration: 220, ease: easeOut, onComplete: () => { layer.hidden = true; document.body.style.overflow = ""; if (lastFocused?.focus) lastFocused.focus(); } });
  }

  function plural(number, one, few, many) {
    const n10 = number % 10, n100 = number % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }

  function bindEvents() {
    $("#hotspots").addEventListener("click", (event) => { const hit = event.target.closest("[data-zone]"); if (hit) renderZone(zoneById(hit.dataset.zone)); });
    $("#hotspots").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const hit = event.target.closest("[data-zone]"); if (hit) renderZone(zoneById(hit.dataset.zone)); } });
    $("#zoneDock").addEventListener("click", (event) => { const button = event.target.closest("[data-zone]"); if (button) renderZone(zoneById(button.dataset.zone)); });
    $("#roomBack").addEventListener("click", closeRoom);
    $("#roomRail").addEventListener("click", (event) => { const button = event.target.closest("[data-zone]"); if (button) renderZone(zoneById(button.dataset.zone)); });
    $("#crewGrid").addEventListener("click", (event) => { const card = event.target.closest("[data-crew]"); if (card) openCrew(card.dataset.crew); });
    document.addEventListener("click", (event) => {
      const open = event.target.closest("[data-open]");
      if (open) {
        const layerName = open.dataset.open;
        lastFocused = open;
        const layer = $(`#${layerName}Layer`);
        if (!layer) return;
        layer.hidden = false;
        document.body.style.overflow = "hidden";
        if (layerName === "all") renderAll();
        if (!reduceMotion) motion(".sheet", { opacity: [0, 1], translateY: [30, 0], duration: 420, ease: easeOut });
        $(".sheet-close", layer).focus();
        return;
      }
      const closer = event.target.closest("[data-close]");
      if (closer) closeLayer(closer.dataset.close);
      const module = event.target.closest("[data-module]");
      if (module) openModule(module.dataset.module);
      const goHome = event.target.closest('[data-go="hero"]');
      if (goHome) { event.preventDefault(); if (!$("#room").hidden) closeRoom(); }
    });
    $("#allFilters").addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; currentFilter = button.dataset.filter; $$(".filter-btn").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); drawAll(); });
    $("#allSearch").addEventListener("input", drawAll);
    document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!$("#crewLayer").hidden) closeLayer("crew"); else if (!$("#moduleLayer").hidden) closeLayer("module"); else if (!$("#allLayer").hidden) closeLayer("all"); else if (!$("#aboutLayer").hidden) closeLayer("about"); });
  }

  function drawSea() {
    const canvas = $("#seaCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight * .55;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr); }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b6172"; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(185, 231, 220, .14)"; ctx.lineWidth = 1;
    const time = reduceMotion ? 0 : seaFrame / 35;
    for (let row = 0; row < 14; row += 1) {
      const y = 10 + row * (height / 15);
      ctx.beginPath();
      for (let x = -30; x <= width + 30; x += 16) { const wave = Math.sin(x / 70 + time * .024 + row) * (2 + row * .12); ctx.lineTo(x, y + wave); }
      ctx.stroke();
    }
    if (!reduceMotion) { seaFrame += 1; requestAnimationFrame(drawSea); }
  }

  function drawRoom(zoneId, token = roomRenderToken) {
    if (token !== roomRenderToken) return;
    const canvas = $("#roomCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr); }
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = .2;
    ctx.strokeStyle = currentZone?.accent || "#e8bb73";
    ctx.lineWidth = 1;
    const time = reduceMotion ? 0 : roomFrame / 60;
    for (let y = 90; y < height; y += 85) { ctx.beginPath(); for (let x = 0; x < width; x += 28) ctx.lineTo(x, y + Math.sin(x / 100 + time + y) * 4); ctx.stroke(); }
    ctx.globalAlpha = .08;
    for (let x = -height; x < width + height; x += 140) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height, height); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (!reduceMotion && !$("#room").hidden) { roomFrame += 1; requestAnimationFrame(() => drawRoom(zoneId, token)); }
  }

  function init() {
    renderContainers(); renderSmoke(); renderHotspots(); renderDock(); renderCounts(); bindEvents(); drawSea();
    motion("#heroCopy .line", { opacity: [0, 1], translateY: [26, 0], duration: 760, delay: animeApi.stagger ? animeApi.stagger(90) : 0, ease: easeExpo });
    motion("#heroCopy .hero-lead, #heroCopy .hero-stats", { opacity: [0, 1], translateY: [18, 0], duration: 620, delay: 620, ease: easeOut });
    motion("#scene", { opacity: [0, 1], scale: [.96, 1], duration: 1100, delay: 160, ease: easeCinema });
    motion("#zoneDock, #scrollHint", { opacity: [0, 1], duration: 500, delay: 900, ease: easeOut });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
