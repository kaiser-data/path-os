(function () {
  function sessions() {
    return window.PATH_SESSIONS || {};
  }
  // Newest first by optional `date`; undated sessions keep bundle order at the end.
  function orderedIds() {
    const all = sessions();
    return Object.keys(all).sort(function (a, b) {
      return String(all[b].date || "").localeCompare(String(all[a].date || ""));
    });
  }
  function currentId() {
    const q = new URLSearchParams(location.search).get("session");
    if (q && sessions()[q]) return q;
    return orderedIds()[0] || null;
  }

  let sessionId = null;
  let session = null;
  let step = 0;
  let game = null;
  let selected = null;
  let locked = [];
  let branchLocked = [];
  let activeBranch = 0;
  let ready = false;
  let stopPassed = false;

  function steps() { return (session && session.steps) || []; }
  function cur() { return steps()[step] || {}; }

  function pieceSVG(color, type) {
    const key = (color === "w" ? "w" : "b") + type.toUpperCase();
    return (window.CHESS_PIECES && window.CHESS_PIECES[key]) || "";
  }

  function renderBoard() {
    const boardEl = document.getElementById("chessBoard");
    if (!boardEl || !game) return;
    const files = "abcdefgh".split("");
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
    boardEl.innerHTML = "";
    const last = game.history({ verbose: true }).slice(-1)[0];
    const legal = selected ? game.moves({ square: selected, verbose: true }) : [];
    const dests = new Set(legal.map(function (m) { return m.to; }));
    ranks.forEach(function (r, ri) {
      files.forEach(function (f, fi) {
        const sq = f + r;
        const piece = game.get(sq);
        const el = document.createElement("button");
        el.type = "button";
        el.className = "sq " + ((fi + ri) % 2 ? "dark" : "light");
        if (selected === sq) el.classList.add("sel");
        if (dests.has(sq)) el.classList.add("hint", piece ? "piece" : "empty");
        if (last && (last.from === sq || last.to === sq)) el.classList.add("last");
        if (piece) el.innerHTML = pieceSVG(piece.color, piece.type);
        if (r === 1) {
          const c = document.createElement("span");
          c.className = "coord file";
          c.textContent = f;
          el.appendChild(c);
        }
        if (f === "a") {
          const c = document.createElement("span");
          c.className = "coord rank";
          c.textContent = String(r);
          el.appendChild(c);
        }
        el.addEventListener("click", function () { onSquare(sq); });
        boardEl.appendChild(el);
      });
    });
    const turn = game.turn() === "w" ? "White" : "Black";
    const hist = game.history().join(" ");
    const need = mustPlayNow();
    const extra = need.length ? " · need " + need.join(" ") : "";
    document.getElementById("boardStatus").textContent = turn + " to move" + (hist ? " · " + hist : "") + extra;
  }

  function onSquare(sq) {
    if (locked[step]) return;
    const piece = game.get(sq);
    if (selected) {
      const move = game.move({ from: selected, to: sq, promotion: "q" });
      selected = null;
      if (!move && piece && piece.color === game.turn()) selected = sq;
      renderBoard();
      return;
    }
    if (piece && piece.color === game.turn()) {
      selected = sq;
      renderBoard();
    }
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }

  function renderQuestion(q) {
    const hint = q.hint ? "<span>" + esc(q.hint) + "</span>" : "";
    if (q.type === "textarea") {
      return "<label>" + esc(q.label) + hint + "<textarea name='" + esc(q.name) + "' required></textarea></label>";
    }
    if (q.type === "select") {
      const opts = (q.options || []).map(function (o) {
        return "<option value='" + esc(o.value) + "'>" + esc(o.label) + "</option>";
      }).join("");
      return "<label>" + esc(q.label) + hint + "<select name='" + esc(q.name) + "' required>" + opts + "</select></label>";
    }
    if (q.type === "triple") {
      const names = q.names || ["a", "b", "c"];
      const inputs = names.map(function (n, i) {
        return "<input name='" + esc(n) + "' type='text' required placeholder='" + (i + 1) + "'>";
      }).join("");
      return "<label>" + esc(q.label) + hint + "</label><div class='triple'>" + inputs + "</div>";
    }
    return "<label>" + esc(q.label) + hint + "<input name='" + esc(q.name) + "' type='text' required></label>";
  }

  function renderBranches() {
    const list = cur().branches;
    const host = document.getElementById("branchList");
    if (!host) return;
    if (!list || !list.length) {
      host.innerHTML = "";
      host.classList.add("hidden");
      return;
    }
    host.classList.remove("hidden");
    host.innerHTML = list.map(function (b, i) {
      const cls = i === activeBranch ? "on" : (branchLocked[i] ? "done" : "");
      const mark = branchLocked[i] ? " ✓" : "";
      return "<button type='button' class='branch " + cls + "' data-i='" + i + "'>" + esc(b.label) + mark + "</button>";
    }).join("");
    host.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (locked[step]) return;
        activeBranch = Number(btn.dataset.i);
        game = new Chess(cur().fen);
        selected = null;
        renderBranches();
        renderBoard();
      });
    });
  }

  function renderSteps() {
    document.getElementById("boardSteps").innerHTML = steps().map(function (s, i) {
      const cls = i === step ? "on" : (locked[i] ? "done" : "");
      return "<span class='" + cls + "'>" + esc(s.name) + "</span>";
    }).join("");
    document.getElementById("boardTitle").textContent = cur().title || "";
    document.getElementById("boardPrompt").textContent = cur().prompt || "";
    const qs = cur().questions || [];
    const lead = cur().type === "stopPly" ? renderStopPly(cur().stopPly || {}) : "";
    document.getElementById("boardForm").innerHTML = lead + qs.map(renderQuestion).join("");
    document.getElementById("boardKey").classList.remove("show");
    document.getElementById("boardKey").innerHTML = "";
    document.getElementById("boardErr").textContent = "";
    document.getElementById("boardNext").disabled = !locked[step];
    document.getElementById("boardLock").disabled = locked[step];
    renderBranches();
  }

  function norm(s) { return (s || "").replace(/\s+/g, "").replace(/[+#]/g, ""); }

  // Stop-ply: name the reply that stopped you, then keep going. The continuation box is
  // not required, so an empty one reaches the grader and gets "that is ply 1".
  function renderStopPly(sp) {
    return "<label>After " + esc(sp.candidate) + ", which reply stopped you?<span>One move.</span>" +
      "<input name='scare' type='text' required></label>" +
      "<label>Now the moves after it<span>In order, until nothing can take back or check.</span>" +
      "<input name='continue' type='text'></label>";
  }

  function tokens(text) {
    return String(text || "")
      .replace(/…/g, " ")
      .replace(/(^|\s)\d+\s*\.+/g, " ")
      .split(/[\s,;]+/)
      .map(function (t) { return norm(t).replace(/^\.+/, "").replace(/[.!?]+$/, ""); })
      .filter(Boolean);
  }

  function startsWith(have, prefix) {
    return have.length >= prefix.length && prefix.every(function (m, i) { return have[i] === norm(m); });
  }

  function gradeStopPly(s, form) {
    const sp = s.stopPly || {};
    const cont = sp.continue || [];
    // Accept the whole line typed into the first box too.
    const all = tokens(form.elements.scare && form.elements.scare.value)
      .concat(tokens(form.elements["continue"] && form.elements["continue"].value));
    if (all[0] !== norm(sp.scare)) {
      return { ok: false, msg: "After " + sp.candidate + ", that is not the reply that stopped you. Which move was it?" };
    }
    const rest = all.slice(1);
    if (!rest.length) {
      return { ok: false, msg: "That is ply 1. " + sp.scare + " is where you stopped. Write the moves after it." };
    }
    const mix = (sp.mixups || []).find(function (m) { return startsWith(rest, m.match || []); });
    if (mix && !startsWith(rest, cont)) {
      return { ok: false, contrast: mix, msg: "Not that line. The board shows where it goes. Reset position, then write it again." };
    }
    const g = new Chess(s.fen);
    g.move(sp.candidate, { sloppy: true });
    g.move(sp.scare, { sloppy: true });
    for (let i = 0; i < cont.length; i++) {
      const ply = i + 2;
      if (i >= rest.length) {
        return { ok: false, msg: "You stopped at ply " + (ply - 1) + " (" + (i ? rest[i - 1] : sp.scare) + "). Can anything still capture or check? Keep going." };
      }
      const mv = g.move(rest[i], { sloppy: true });
      if (!mv) return { ok: false, msg: "Ply " + ply + ": " + rest[i] + " is not legal there. Set it up on the board and look again." };
      if (norm(mv.san) !== norm(cont[i])) {
        return { ok: false, msg: "Ply " + ply + ": " + rest[i] + " is not the critical move. Look again from there." };
      }
    }
    return { ok: true };
  }

  function showContrast(s, mix) {
    game = new Chess(s.fen);
    (mix.line || []).forEach(function (m) { game.move(m, { sloppy: true }); });
    selected = null;
    renderBoard();
    const key = document.getElementById("boardKey");
    key.innerHTML = mix.key || "";
    key.classList.add("show");
  }

  function mustPlayNow() {
    const s = cur();
    if (s.type === "stopPly") {
      const sp = s.stopPly || {};
      // Hidden until the written line passes, so the status bar cannot give it away.
      return stopPassed ? [sp.candidate, sp.scare].concat(sp.continue || []) : [];
    }
    if (s.branches && s.branches.length) return s.branches[activeBranch].mustPlay || [];
    return s.mustPlay || [];
  }

  function historyMatches(need) {
    const h = game.history().map(norm);
    if (!need.length) return true;
    if (h.length < need.length) return false;
    return need.every(function (m, i) { return h[i] === norm(m); });
  }

  function lockStep() {
    const form = document.getElementById("boardForm");
    const s = cur();
    const missing = Array.from(form.querySelectorAll("[required]")).filter(function (el) {
      return !String(el.value || "").trim();
    });
    if (missing.length) {
      document.getElementById("boardErr").textContent = "Fill every field.";
      missing[0].focus();
      return;
    }
    if (s.type === "stopPly" && !stopPassed) {
      const graded = gradeStopPly(s, form);
      if (!graded.ok) {
        if (graded.contrast) {
          showContrast(s, graded.contrast);
        } else if (game.history().length || document.getElementById("boardKey").innerHTML) {
          // Drop a comparison board left over from an earlier mix-up.
          game = new Chess(s.fen);
          selected = null;
          renderBoard();
          document.getElementById("boardKey").classList.remove("show");
          document.getElementById("boardKey").innerHTML = "";
        }
        document.getElementById("boardErr").textContent = graded.msg;
        return;
      }
      stopPassed = true;
      document.getElementById("boardKey").classList.remove("show");
      document.getElementById("boardKey").innerHTML = "";
      if (!historyMatches(mustPlayNow())) {
        game = new Chess(s.fen);
        selected = null;
        renderBoard();
        document.getElementById("boardErr").textContent = "Right. Now play it on the board: " + mustPlayNow().join(" ");
        return;
      }
    }
    const need = mustPlayNow();
    if (!historyMatches(need)) {
      document.getElementById("boardErr").textContent = "On the board play: " + need.join(" ");
      return;
    }
    if (s.branches && s.branches.length) {
      branchLocked[activeBranch] = true;
      const bkey = s.branches[activeBranch].key || "";
      document.getElementById("boardKey").innerHTML = bkey;
      document.getElementById("boardKey").classList.add("show");
      const nextOpen = branchLocked.indexOf(false);
      if (nextOpen !== -1) {
        // Jump to the next unplayed line; the key of the one just locked stays visible.
        activeBranch = nextOpen;
        game = new Chess(s.fen);
        selected = null;
        renderBranches();
        renderBoard();
        const left = branchLocked.filter(function (x) { return !x; }).length;
        document.getElementById("boardErr").textContent =
          "Locked. Now play: " + s.branches[nextOpen].label + " (" + left + " left)";
        return;
      }
      renderBranches();
    }
    locked[step] = true;
    const key = document.getElementById("boardKey");
    key.innerHTML = (s.branches && s.branches.length ? key.innerHTML : "") + (s.key || "");
    key.classList.add("show");
    document.getElementById("boardLock").disabled = true;
    document.getElementById("boardNext").disabled = step >= steps().length - 1;
    document.getElementById("boardErr").textContent = "";
    if (step === steps().length - 1 && typeof window.pathLogGame === "function") {
      const noteEl = form.note;
      window.pathLogGame({
        date: new Date().toISOString().slice(0, 10),
        event: session.event || session.id,
        result: session.result || "",
        tag: (form.tag && form.tag.value) || "calculation",
        note: (noteEl && noteEl.value) || session.logNote || "",
      });
    }
  }

  function loadStep(n) {
    step = n;
    activeBranch = 0;
    stopPassed = false;
    branchLocked = (cur().branches || []).map(function () { return false; });
    game = new Chess(cur().fen);
    selected = null;
    renderSteps();
    renderBoard();
  }

  function renderPicker() {
    const wrap = document.getElementById("sessionPickWrap");
    const sel = document.getElementById("sessionPick");
    if (!wrap || !sel) return;
    const ids = orderedIds();
    wrap.classList.toggle("hidden", ids.length <= 1);
    sel.innerHTML = ids.map(function (id) {
      const s = sessions()[id];
      const label = (s.date ? s.date + " · " : "") + (s.title || id) + (s.result ? " · " + s.result : "");
      return "<option value='" + esc(id) + "'>" + esc(label) + "</option>";
    }).join("");
    sel.value = sessionId || "";
  }

  function loadSession(id) {
    sessionId = id;
    session = id ? sessions()[id] : null;
    locked = steps().map(function () { return false; });
    renderPicker();
    if (!session) {
      document.getElementById("boardTitle").textContent = "No session loaded";
      document.getElementById("boardPrompt").textContent = "Add sessions/*.json and run python3 scripts/bundle_sessions.py";
      return false;
    }
    loadStep(0);
    return true;
  }

  window.initPathBoard = function () {
    if (ready) {
      renderBoard();
      return;
    }
    if (typeof Chess !== "function" || !window.CHESS_PIECES) return;
    if (!loadSession(currentId())) return;
    const pick = document.getElementById("sessionPick");
    if (pick) {
      pick.addEventListener("change", function () {
        loadSession(pick.value);
        // Keep ?session= in step so a reload stays on this game; file:// may refuse, which is harmless.
        try {
          const u = new URL(location.href);
          u.searchParams.set("session", pick.value);
          history.replaceState(null, "", u);
        } catch (e) { /* ignore */ }
      });
    }
    document.getElementById("boardUndo").addEventListener("click", function () {
      if (locked[step]) return;
      game.undo();
      selected = null;
      renderBoard();
    });
    document.getElementById("boardReset").addEventListener("click", function () {
      if (locked[step]) return;
      game = new Chess(cur().fen);
      selected = null;
      renderBoard();
    });
    document.getElementById("boardLock").addEventListener("click", lockStep);
    document.getElementById("boardNext").addEventListener("click", function () {
      if (step < steps().length - 1 && locked[step]) loadStep(step + 1);
    });
    ready = true;
  };
})();
