/* =========================================================
   SeaGuide — логика приложения
   ========================================================= */

(function () {
  "use strict";

  /* ---------- состояние ---------- */
  const state = {
    profession: "all",
    audience: "all",
    level: "all",
    query: ""
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- карточки профессий ---------- */
  function renderProfessions() {
    const grid = $("#professionGrid");
    grid.innerHTML = PROFESSIONS.map((p) => {
      const count = MODULES.filter((m) => m.profession === p.id).length;
      return `
        <button class="profession-card" data-profession="${p.id}" aria-pressed="false">
          <span class="profession-icon" aria-hidden="true">${p.icon}</span>
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
          <span class="profession-tag">
            <span class="check">✓</span>
            ${count} ${p.modulesCount}
          </span>
        </button>
      `;
    }).join("");
  }

  /* ---------- модули ---------- */
  function getFiltered() {
    const q = state.query.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (state.profession !== "all" && m.profession !== state.profession) return false;
      if (state.audience !== "all" && !m.audiences.includes(state.audience)) return false;
      if (state.level !== "all" && m.level !== state.level) return false;
      if (q) {
        const haystack = [
          m.title, m.desc,
          ...m.topics,
          PROFESSIONS.find((p) => p.id === m.profession)?.title || ""
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function badgeLevel(level) {
    return `<span class="badge badge-level-${level}">${LEVEL_LABELS[level]}</span>`;
  }
  function badgeProfession(id) {
    const p = PROFESSIONS.find((x) => x.id === id);
    return `<span class="badge badge-prof">${p ? p.title : id}</span>`;
  }

  function renderModules() {
    const grid = $("#moduleGrid");
    const list = getFiltered();

    grid.innerHTML = list
      .map(
        (m) => `
      <button class="module-card" data-module="${m.id}">
        <div class="module-top">
          <span class="module-icon" aria-hidden="true">${m.icon}</span>
          <span class="module-meta">
            ${badgeProfession(m.profession)}
            ${badgeLevel(m.level)}
          </span>
        </div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
        <div class="module-topics-preview">
          ${m.topics.slice(0, 3).map((t) => `<span>${t}</span>`).join("")}
          ${m.topics.length > 3 ? `<span class="more">+${m.topics.length - 3} ещё</span>` : ""}
        </div>
        <span class="module-open">Учебный модуль →</span>
      </button>
    `
      )
      .join("");

    const count = $("#resultCount");
    count.textContent =
      list.length === 0
        ? ""
        : `Найдено модулей: ${list.length} ${plural(list.length)}`;

    $("#emptyState").hidden = list.length !== 0;
  }

  function plural(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "модуль";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "модуля";
    return "модулей";
  }

  /* ---------- базовые курсы ---------- */
  let coursesGroup = "cadet";

  function renderCourses() {
    $("#coursesIntro").textContent = COURSE_INTROS[coursesGroup] || "";
    const items = BASIC_COURSES[coursesGroup] || [];
    $("#coursesList").innerHTML = items
      .map((c, i) => {
        const m = MODULES.find((x) => x.id === c.module);
        if (!m) return "";
        return `
      <button class="course-step" data-module="${c.module}">
        <span class="course-num">${i + 1}</span>
        <span class="course-body">
          <h3>${m.icon} ${c.title}</h3>
          <p>${c.note}</p>
        </span>
        <span class="course-go">→</span>
      </button>
    `;
      })
      .join("");
  }

  function bindCourses() {
    $("#coursesTabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".courses-tab");
      if (!tab) return;
      coursesGroup = tab.dataset.group;
      $$(".courses-tab").forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      renderCourses();
    });

    $("#coursesList").addEventListener("click", (e) => {
      const step = e.target.closest(".course-step");
      if (step) openModule(step.dataset.module);
    });
  }

  /* ---------- выбор профессии ---------- */
  function selectProfession(id) {
    // повторный клик по выбранной — сброс
    state.profession = state.profession === id ? "all" : id;
    $$(".profession-card").forEach((card) => {
      const active = card.dataset.profession === state.profession;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
    renderModules();
    // прокрутить к базе знаний, чтобы показать отфильтрованные модули
    $("#knowledge").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- фильтры-пилюли ---------- */
  function bindPillGroup(groupId, key) {
    const group = $(groupId);
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      group.querySelectorAll(".pill").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      state[key] = btn.dataset[key === "audience" ? "audience" : "level"];
      renderModules();
    });
  }

  /* ---------- модальное окно ---------- */
  function openModule(id) {
    const m = MODULES.find((x) => x.id === id);
    if (!m) return;
    const p = PROFESSIONS.find((x) => x.id === m.profession);

    $("#modalBadges").innerHTML = [
      badgeProfession(m.profession),
      badgeLevel(m.level),
      ...m.audiences.map((a) => `<span class="badge">${AUDIENCE_LABELS[a]}</span>`)
    ].join("");
    $("#modalTitle").textContent = m.title;
    $("#modalDesc").textContent = m.desc;
    const cta = $("#modalCta");
    cta.href = `module.html?id=${m.id}`;
    $("#modalContent").innerHTML = (m.content || []).map((sec) => `
      <section class="mod-sec">
        <h4>${sec.h}</h4>
        ${sec.p ? `<p>${sec.p}</p>` : ""}
        ${sec.list ? `<ul>${sec.list.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
        ${sec.tip ? `<div class="mod-tip"><span>💡</span><p>${sec.tip}</p></div>` : ""}
      </section>
    `).join("");

    const modal = $("#moduleModal");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $(".modal-close").focus();
  }
  function closeModal() {
    $("#moduleModal").hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- счётчики в hero ---------- */
  function animateCounters() {
    const els = $$(".stat-num");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.forEach((el) => {
      const target = Number(el.dataset.count || 0);
      if (reduce) { el.textContent = target; return; }
      const dur = 900, start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- мобильное меню ---------- */
  function bindMobileNav() {
    const toggle = $("#navToggle");
    const nav = $("#mainNav");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- инициализация ---------- */
  function init() {
    renderProfessions();
    renderModules();
    renderCourses();
    bindPillGroup("#audienceFilter", "audience");
    bindPillGroup("#levelFilter", "level");
    bindMobileNav();
    bindCourses();

    $("#professionGrid").addEventListener("click", (e) => {
      const card = e.target.closest(".profession-card");
      if (card) selectProfession(card.dataset.profession);
    });

    $("#moduleGrid").addEventListener("click", (e) => {
      const card = e.target.closest(".module-card");
      if (card) openModule(card.dataset.module);
    });

    let debounce;
    $("#searchInput").addEventListener("input", (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.query = e.target.value;
        renderModules();
      }, 180);
    });

    $("#resetFilters").addEventListener("click", () => {
      state.profession = "all";
      state.audience = "all";
      state.level = "all";
      state.query = "";
      $("#searchInput").value = "";
      $$(".pill-group").forEach((g) => {
        g.querySelectorAll(".pill").forEach((p, i) =>
          p.classList.toggle("is-active", i === 0)
        );
      });
      $$(".profession-card").forEach((c) => {
        c.classList.remove("is-selected");
        c.setAttribute("aria-pressed", "false");
      });
      renderModules();
    });

    // закрытие модального окна (крестик + фон)
    $$("[data-close-modal]").forEach((el) =>
      el.addEventListener("click", closeModal)
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#moduleModal").hidden) closeModal();
    });

    animateCounters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
