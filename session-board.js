(function () {
  const FEN = {
    0: "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
    1: "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
    2: "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R1R2K1 b - - 3 20",
    3: "r4rk1/p3ppbp/1p4p1/1B1bP3/8/1q5P/1B2QPP1/R2R2K1 w - - 2 22"
  };
  const STEPS = [
    { name: "1 Diagnose", title: "After 19…Qa5, White to move",
      prompt: "Candidates only. Do not stop at the first reply you dislike." },
    { name: "2 Calculate a4", title: "You rejected a4 because of …a6. Calculate past it.",
      prompt: "Play the line on the board: a4 a6 Bd7 Bxg2 e6. Then answer. Stopping at a6 is the 2170 habit. Bd7 and Bxg2 are the 2300 moves." },
    { name: "3 Trap", title: "After 20.Red1, Black to move",
      prompt: "The game. Play …Qxa2 then Ra1. The refutation if he does not grab is still …Rfd8." },
    { name: "4 Hunt", title: "After 21…Qb3, White to move",
      prompt: "Play the hunt move, then tag the game honestly." }
  ];
  const FORMS = [
    '<label>1.1 Material <span>Who is up, and by how much?</span><input name="s1_material" type="text" required></label>' +
    '<label>1.2 Why did it feel worse?</label><textarea name="s1_why" required></textarea>' +
    '<label>1.3 Three candidate moves</label><div class="triple"><input name="s1_c1" type="text" required><input name="s1_c2" type="text" required><input name="s1_c3" type="text" required></div>' +
    '<label>1.4 You did not play a4. Which Black move stopped you?<input name="s1_stop" type="text" required placeholder="e.g. a6"></label>',
    '<label>2.1 After 20.a4 a6 the bishop on b5 is attacked. Three legal squares that keep it.</label><div class="triple"><input name="s2_sq1" type="text" required placeholder="e.g. Bd7"><input name="s2_sq2" type="text" required><input name="s2_sq3" type="text" required></div>' +
    '<label>2.2 Play on the board: <b>a4 a6 Bd7 Bxg2 e6</b> <span>That is the line you skipped. Lock will not open until those five moves are on the board.</span></label>' +
    '<label>2.3 After 21…Bxg2, is 22.e6 or 22.Kxg2 stronger — and why? <span>One of them is a zwischenzug. Name the check or threat.</span><textarea name="s2_zwischen" required></textarea></label>' +
    '<label>2.4 20.Bd4 …Qxa2 — is the queen trapped like in the game? Why / why not?<textarea name="s2_bd4" required></textarea></label>',
    '<label>3.1 If …Qxa2, White’s next move?<input name="s3_white" type="text" required></label>' +
    '<label>3.2 After …Qb3, White’s hunt move?<input name="s3_hunt" type="text" required></label>' +
    '<label>3.3 The move that refutes Red1 if Black does not grab?<input name="s3_instead" type="text" required placeholder="Rfd8"></label>',
    '<label>4.1 Why did you win?<select name="s4_why" required><option value="">choose</option><option value="trap">I calculated the trap and he walked in</option><option value="blunder">He hung it; 20.Red1 was still a mistake</option><option value="both">Both: the hunt was real, and Red1 still needed the blunder</option></select></label>' +
    '<label>4.2 Next time, move 20 is<input name="s4_next" type="text" required></label>' +
    '<label>4.3 Tag<select name="s4_tag" required><option value="">choose</option><option value="calculation">calculation</option><option value="conversion">conversion</option><option value="opening">opening</option><option value="time">time</option><option value="clean">clean</option></select></label>' +
    '<label>4.4 Log note<textarea name="s4_note" required placeholder="Skipped a4 because of a6; did not calculate Bd7 Bxg2 e6"></textarea></label>'
  ];
  function keyStep0(form) {
    const cands = [form.s1_c1 && form.s1_c1.value, form.s1_c2 && form.s1_c2.value, form.s1_c3 && form.s1_c3.value]
      .map(function (s) { return (s || "").replace(/\s+/g, "").replace(/[+#]/g, ""); });
    const hasA4 = cands.some(function (s) { return s.toLowerCase() === "a4"; });
    const why = ((form.s1_why && form.s1_why.value) || "").toLowerCase();
    const compare = ((form.s1_compare && form.s1_compare.value) || "").toLowerCase();
    let html = "<p><b>Your sheet.</b> Material is right: Black is a pawn up.</p>";
    if (why.indexOf("a2") !== -1 || why.indexOf("pawn") !== -1) {
      html += "<p>The weak a2-pawn is real. It is not the whole minus. The queen on a5 and the two bishops outwork White’s uncoordinated pieces. Saving a2 without fixing that still leaves you worse.</p>";
    }
    if (hasA4) {
      html += "<p class='ok'>a4 is in your candidate list. That is the hold: space, a2, and Bb5.</p>";
    } else {
      html += "<p class='bad'>a4 was missing from the three candidates. That was the move that keeps the position.</p>";
    }
    html += "<p><b>20.Red1 is pseudo-activity.</b> The rook looks busy on the open file. Black does not take on a2 — he plays <b>…Rfd8</b>, contests the file, and you are simply worse. The game win needed his grab. Next time: a4, not the rook lift.</p>";
    if (compare.indexOf("protect") !== -1 || compare.indexOf("bb5") !== -1 || compare.indexOf("pawn") !== -1) {
      html += "<p>Your note on a4 (pawn / Bb5) is the useful part. Red1 does neither of those things.</p>";
    }
    return html;
  }

  let step = 0;
  let game = null;
  let selected = null;
  let locked = [false, false, false, false];
  let ready = false;

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
        el.dataset.sq = sq;
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
    document.getElementById("boardStatus").textContent = turn + " to move" + (hist ? " · " + hist : "");
  }

  function onSquare(sq) {
    if (locked[step]) return;
    const piece = game.get(sq);
    if (selected) {
      const move = game.move({ from: selected, to: sq, promotion: "q" });
      selected = null;
      if (!move && piece && piece.color === game.turn()) selected = sq;
      const form = document.getElementById("boardForm");
      if (move && form && form.s1_c1 && !form.s1_c1.value) form.s1_c1.value = move.san;
      renderBoard();
      return;
    }
    if (piece && piece.color === game.turn()) {
      selected = sq;
      renderBoard();
    }
  }

  function renderSteps() {
    document.getElementById("boardSteps").innerHTML = STEPS.map(function (s, i) {
      const cls = i === step ? "on" : (locked[i] ? "done" : "");
      return "<span class='" + cls + "'>" + s.name + "</span>";
    }).join("");
    document.getElementById("boardTitle").textContent = STEPS[step].title;
    document.getElementById("boardPrompt").textContent = STEPS[step].prompt;
    document.getElementById("boardForm").innerHTML = FORMS[step];
    const key = document.getElementById("boardKey");
    key.classList.remove("show");
    key.innerHTML = "";
    document.getElementById("boardErr").textContent = "";
    document.getElementById("boardNext").disabled = !locked[step];
    document.getElementById("boardLock").disabled = locked[step];
  }

  function norm(s) { return (s || "").replace(/\s+/g, "").replace(/[+#]/g, ""); }

  function lockStep() {
    const form = document.getElementById("boardForm");
    const missing = Array.from(form.querySelectorAll("[required]")).filter(function (el) {
      return !String(el.value || "").trim();
    });
    if (missing.length) {
      document.getElementById("boardErr").textContent = "Fill every field.";
      missing[0].focus();
      return;
    }
    if (step === 1) {
      const h = game.history().map(norm);
      const need = ["a4", "a6", "Bd7", "Bxg2", "e6"];
      if (h.length < 5 || need.some(function (m, i) { return h[i] !== m; })) {
        document.getElementById("boardErr").textContent = "On the board play exactly: a4 a6 Bd7 Bxg2 e6.";
        return;
      }
    }
    if (step === 2) {
      const h = game.history().map(norm);
      if (h[0] !== "Qxa2" || h[1] !== "Ra1") {
        document.getElementById("boardErr").textContent = "On the board: play …Qxa2, then Ra1.";
        return;
      }
    }
    if (step === 3 && norm(game.history().slice(-1)[0] || "") !== "Ra3") {
      document.getElementById("boardErr").textContent = "On the board: play Ra3.";
      return;
    }
    locked[step] = true;
    const key = document.getElementById("boardKey");
    const keys = [
      keyStep0(form),
      "<p><b>Key — past a6.</b> After 20.a4 a6 the bishop is attacked. <b>21.Bd7</b> keeps it (Bc4 and Bd3 also). Then <b>21…Bxg2</b> is the shot you have to see — not a reason to reject a4.</p><p>Do <b>not</b> recapture first. <b>22.e6!</b> is the zwischenzug (pawn to e6, bishop still hanging). 22.Kxg2 Qd5+ is playable and worse. Engine at this depth: a4 a6 Bd7 is about equal. 20.Bd4 …Qxa2 is −3: the dark-squared bishop left b2, so Ra1 does not trap the queen.</p>",
      "<p><b>Key.</b> 21.Ra1, 22.Ra3. Refutation if he does not grab: <b>…Rfd8</b>.</p>",
      "<p><b>Key.</b> Tag calculation. The miss was stopping at …a6. Log: “Did not calculate a4 a6 Bd7 Bxg2 e6.”</p>"
    ];
    key.innerHTML = keys[step];
    key.classList.add("show");
    document.getElementById("boardLock").disabled = true;
    document.getElementById("boardNext").disabled = step >= 3;
    document.getElementById("boardErr").textContent = "";
  }

  function loadStep(n) {
    step = n;
    game = new Chess(FEN[step]);
    selected = null;
    renderSteps();
    renderBoard();
  }

  window.initPathBoard = function () {
    if (ready) {
      renderBoard();
      return;
    }
    if (typeof Chess !== "function" || !window.CHESS_PIECES) return;
    loadStep(0);
    document.getElementById("boardUndo").addEventListener("click", function () {
      if (locked[step]) return;
      game.undo();
      selected = null;
      renderBoard();
    });
    document.getElementById("boardReset").addEventListener("click", function () {
      if (locked[step]) return;
      game = new Chess(FEN[step]);
      selected = null;
      renderBoard();
    });
    document.getElementById("boardLock").addEventListener("click", lockStep);
    document.getElementById("boardNext").addEventListener("click", function () {
      if (step < 3 && locked[step]) loadStep(step + 1);
    });
    ready = true;
  };
})();
