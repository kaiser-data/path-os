(function () {
  const FEN = {
    0: "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
    1: "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R1R2K1 b - - 3 20",
    2: "r4rk1/p3ppbp/1p4p1/1B1bP3/8/1q5P/1B2QPP1/R2R2K1 w - - 2 22"
  };
  const STEPS = [
    { name: "1 Diagnose", title: "After 19…Qa5, White to move",
      prompt: "This is where you felt worse. Play a move if you want, then fill the form. Eval stays hidden until Lock." },
    { name: "2 Trap", title: "After 20.Red1, Black to move",
      prompt: "He took on a2. Play …Qxa2 then White’s reply on the board, and answer the questions." },
    { name: "3 Hunt", title: "After 21…Qb3, White to move",
      prompt: "The queen ran to b3. Play the hunt move, then tag the game honestly." }
  ];
  const FORMS = [
    '<label>1.1 Material <span>Who is up, and by how much?</span><input name="s1_material" type="text" required placeholder="e.g. Black a pawn up"></label>' +
    '<label>1.2 Why did it feel worse? <span>Activity, hanging goods, uncoordinated pieces.</span><textarea name="s1_why" required></textarea></label>' +
    '<label>1.3 Three candidate moves</label><div class="triple"><input name="s1_c1" type="text" required placeholder="1"><input name="s1_c2" type="text" required placeholder="2"><input name="s1_c3" type="text" required placeholder="3"></div>' +
    '<label>1.4 a4 versus your move <span>What does a4 do that your move does not?</span><textarea name="s1_compare" required></textarea></label>',
    '<label>2.1 If …Qxa2, White’s next move?<input name="s2_white" type="text" required></label>' +
    '<label>2.2 Where can the queen go after that?<textarea name="s2_queen" required></textarea></label>' +
    '<label>2.3 After …Qb3, White’s hunt move?<input name="s2_hunt" type="text" required></label>' +
    '<label>2.4 Black should have played instead of …Qxa2?<input name="s2_instead" type="text" required></label>',
    '<label>3.1 Why did you win?<select name="s3_why" required><option value="">choose</option><option value="trap">I calculated the trap and he walked in</option><option value="blunder">He hung it; 20.Red1 was still a mistake</option><option value="both">Both: the hunt was real, and Red1 still needed the blunder</option></select></label>' +
    '<label>3.2 Next time, move 20 is<input name="s3_next" type="text" required></label>' +
    '<label>3.3 Path OS tag<select name="s3_tag" required><option value="">choose</option><option value="calculation">calculation</option><option value="conversion">conversion</option><option value="opening">opening</option><option value="time">time</option><option value="clean">clean</option></select></label>' +
    '<label>3.4 Log note<textarea name="s3_note" required placeholder="20.Red1 instead of a4; Qxa2 walked into Ra1"></textarea></label>'
  ];
  const KEYS = [
    '<p><b>Key.</b> Black is a pawn up. You are worse because the queen on a5 and the bishops outwork uncoordinated white pieces.</p><p>Hold: <b>20.a4</b>. Game move <b>20.Red1</b> is a mistake against <b>20…Rfd8</b>.</p>',
    '<p><b>Key.</b> 21.<b>Ra1</b>. Hunt: 22.<b>Ra3</b>. Instead of the grab: <b>20…Rfd8</b>.</p>',
    '<p><b>Key.</b> Tag <b>calculation</b>, not clean. Log: 1–0, “20.Red1 instead of a4; Qxa2 walked into Ra1.”</p>'
  ];

  let step = 0;
  let game = null;
  let selected = null;
  let locked = [false, false, false];
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
      if (h[0] !== "Qxa2" || h[1] !== "Ra1") {
        document.getElementById("boardErr").textContent = "On the board: play …Qxa2, then Ra1.";
        return;
      }
    }
    if (step === 2 && norm(game.history().slice(-1)[0] || "") !== "Ra3") {
      document.getElementById("boardErr").textContent = "On the board: play Ra3.";
      return;
    }
    locked[step] = true;
    const key = document.getElementById("boardKey");
    key.innerHTML = KEYS[step];
    key.classList.add("show");
    document.getElementById("boardLock").disabled = true;
    document.getElementById("boardNext").disabled = step >= 2;
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
      if (step < 2 && locked[step]) loadStep(step + 1);
    });
    ready = true;
  };
})();
