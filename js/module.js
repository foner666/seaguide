/* =========================================================
   SeaGuide — страница модуля
   Подробный материал + тест самопроверки
   ========================================================= */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- получение id модуля ---------- */
  const params = new URLSearchParams(location.search);
  const modId = params.get("id");
  const m = MODULES.find((x) => x.id === modId);

  if (!m) {
    document.body.innerHTML =
      '<div class="container" style="padding:6rem 0;text-align:center">' +
      '<div style="font-size:3rem">🧭</div>' +
      "<h1>Модуль не найден</h1>" +
      '<p style="margin:1rem 0">Проверьте ссылку или выберите модуль в базе знаний.</p>' +
      '<a class="btn btn-primary" href="index.html#knowledge">К базе знаний</a></div>';
    return;
  }

  const prof = PROFESSIONS.find((p) => p.id === m.profession);
  const hasDeep = m.detail && m.detail.length > 0;

  /* ---------- заполнение шапки ---------- */
  document.title = `${m.title} — SeaGuide`;
  $("#crumbs").innerHTML = `
    <a href="index.html">SeaGuide</a>
    <span>›</span>
    <a href="index.html#professions">${prof.title}</a>
    <span>›</span>
    <span class="crumb-current">${m.title}</span>
  `;
  $("#modIcon").textContent = m.icon;
  $("#modTitle").textContent = m.title;
  $("#modDesc").textContent = m.desc;
  $("#modGoal").textContent = m.goal || "";
  $("#modBadges").innerHTML = [
    `<span class="badge badge-prof">${prof.title}</span>`,
    `<span class="badge badge-level-${m.level}">${LEVEL_LABELS[m.level]}</span>`,
    ...m.audiences.map((a) => `<span class="badge">${AUDIENCE_LABELS[a]}</span>`)
  ].join("");

  /* ---------- контент ---------- */
  const content = hasDeep ? m.detail : m.content;

  $("#modContent").innerHTML = content
    .map((sec) => {
      let html = `<section class="mod-sec"><h3>${sec.h}</h3>`;
      if (sec.p) html += `<p>${sec.p}</p>`;
      if (sec.list) html += `<ul>${sec.list.map((t) => `<li>${t}</li>`).join("")}</ul>`;
      if (sec.tip) html += `<div class="mod-tip"><span>💡</span><p>${sec.tip}</p></div>`;
      return html + "</section>";
    })
    .join("");

  $("#devBanner").hidden = hasDeep;

  /* ---------- тест самопроверки ---------- */
  const quiz = m.quiz;
  if (quiz && quiz.length > 0) {
    renderQuiz(quiz);
  }

  function renderQuiz(questions) {
    $("#quizWrap").hidden = false;
    const box = $("#quizBox");

    box.innerHTML = questions
      .map((q, i) => {
        const opts = q.options
          .map((o, j) => `
            <label class="quiz-opt">
              <input type="radio" name="q${i}" value="${j}" />
              <span class="quiz-opt-text">${o}</span>
            </label>
          `)
          .join("");
        return `
      <div class="quiz-q" data-answer="${q.answer}">
        <p class="quiz-q-text"><span class="quiz-num">${i + 1}</span> ${q.text}</p>
        <div class="quiz-opts">${opts}</div>
        <div class="quiz-explain" hidden>
          <span class="quiz-mark"></span><p>${q.explain}</p>
        </div>
      </div>
    `;
      })
      .join("") +
      '<button class="btn btn-primary" id="quizCheck">Проверить ответы</button>';

    $("#quizCheck").addEventListener("click", checkQuiz);
  }

  function checkQuiz() {
    const qs = $$("#quizWrap .quiz-q");
    let correct = 0;
    let answered = 0;

    qs.forEach((q) => {
      const answer = Number(q.dataset.answer);
      const selected = q.querySelector("input:checked");
      const explain = q.querySelector(".quiz-explain");
      const mark = q.querySelector(".quiz-mark");

      if (!selected) {
        // вопрос без ответа
        q.classList.add("quiz-unanswered");
        explain.hidden = false;
        mark.textContent = "❓";
        mark.className = "quiz-mark quiz-mark-skip";
        return;
      }
      answered++;
      const val = Number(selected.value);

      // подсветка выбранного и правильного
      q.querySelectorAll(".quiz-opt").forEach((opt, j) => {
        opt.classList.remove("quiz-opt-correct", "quiz-opt-wrong");
        if (j === answer) opt.classList.add("quiz-opt-correct");
        else if (j === val) opt.classList.add("quiz-opt-wrong");
      });
      // блокируем выбор
      q.querySelectorAll("input").forEach((inp) => (inp.disabled = true));

      if (val === answer) {
        correct++;
        mark.textContent = "✅";
        mark.className = "quiz-mark quiz-mark-ok";
      } else {
        mark.textContent = "❌";
        mark.className = "quiz-mark quiz-mark-bad";
      }
      explain.hidden = false;
    });

    const result = $("#quizResult");
    const total = questions.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const score = $("#quizScore");

    let verdict;
    if (pct === 100) verdict = "Отлично! Модуль усвоен — можно двигаться дальше. 🎓";
    else if (pct >= 70) verdict = "Хороший результат. Перечитайте материалы по ошибкам — и ещё раз.";
    else if (pct >= 40) verdict = "Базовое понимание есть, но материал стоит пройти ещё раз.";
    else verdict = "Пока рано. Изучите материал внимательно и вернитесь к тесту.";

    score.innerHTML = `<strong>${correct} из ${total}</strong> (${pct}%)<br><span>${verdict}</span>`;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "center" });

    $("#quizCheck").disabled = true;
    $("#quizCheck").textContent = "Ответы проверены";

    $("#quizRetry").onclick = () => {
      result.hidden = true;
      $("#quizCheck").disabled = false;
      $("#quizCheck").textContent = "Проверить ответы";
      renderQuiz(questions);
      $("#quizWrap").scrollIntoView({ behavior: "smooth" });
    };
  }
})();
