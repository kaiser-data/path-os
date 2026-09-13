window.PATH_SESSIONS = {
  "JB2bQpWt": {
    "id": "JB2bQpWt",
    "url": "https://lichess.org/JB2bQpWt",
    "title": "15+10 \u00b7 you White \u00b7 Alapin",
    "date": "2026-09-12 18:31",
    "result": "1-0",
    "event": "Lichess 15+10 vs justlik3that",
    "startFen": "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
    "logNote": "Stopped at a6; missed Bd7 Bxg2 e6. Red1 is pseudo-activity vs Rfd8.",
    "steps": [
      {
        "id": "diagnose",
        "name": "1 Diagnose",
        "title": "After 19\u2026Qa5, White to move",
        "prompt": "Candidates only. Do not stop at the first reply you dislike.",
        "fen": "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
        "mustPlay": [],
        "questions": [
          {
            "name": "material",
            "label": "1.1 Material",
            "hint": "Who is up, and by how much?",
            "type": "text"
          },
          {
            "name": "why",
            "label": "1.2 Why did it feel worse?",
            "type": "textarea"
          },
          {
            "name": "c1",
            "label": "1.3 Three candidate moves",
            "type": "triple",
            "names": [
              "c1",
              "c2",
              "c3"
            ]
          },
          {
            "name": "stop",
            "label": "1.4 You did not play a4. Which Black move stopped you?",
            "hint": "e.g. a6",
            "type": "text"
          }
        ],
        "key": "<p><b>Material:</b> Black a pawn up. The minus is also the queen on a5 and the bishops vs uncoordinated White.</p><p>If you stopped at <b>\u2026a6</b>, that is the leak. Next step is the line past a6 \u2014 not Red1.</p>"
      },
      {
        "id": "calculate",
        "name": "2 Calculate",
        "title": "Four lines. Same capture is not the same eval.",
        "prompt": "Open a branch. Play the moves on the board. Lock that branch. Next stays closed until all four are done.",
        "fen": "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20",
        "questions": [
          {
            "name": "retreats",
            "label": "After 20.a4 a6, three legal squares that keep Bb5",
            "type": "triple",
            "names": [
              "sq1",
              "sq2",
              "sq3"
            ]
          },
          {
            "name": "zwischen",
            "label": "After 21\u2026Bxg2, e6 or Kxg2 \u2014 and why?",
            "hint": "Name the zwischenzug.",
            "type": "textarea"
          },
          {
            "name": "bd4q",
            "label": "Bd4 \u2026Qxa2 \u2014 is the queen trapped like in the game?",
            "type": "textarea"
          }
        ],
        "branches": [
          {
            "id": "main",
            "label": "a4 a6 Bd7 Bxg2 e6",
            "mustPlay": [
              "a4",
              "a6",
              "Bd7",
              "Bxg2",
              "e6"
            ],
            "key": "<p class='ok'>The skipped line. 21.Bd7 keeps the bishop (Bc4, Bd3 also). 21\u2026Bxg2 is the shot \u2014 not a reason to reject a4. <b>22.e6!</b> zwischenzug, do not recapture first. \u2248 equal.</p>"
          },
          {
            "id": "mixup",
            "label": "a4 Bxg2?? (no Bd7)",
            "mustPlay": [
              "a4",
              "Bxg2"
            ],
            "key": "<p class='bad'>Same capture, opposite eval. Without a6/Bd7, <b>21.Kxg2</b> and White is winning (~+5). Do not mix this with the Bd7 line.</p>"
          },
          {
            "id": "bd4",
            "label": "Bd4 Qxa2",
            "mustPlay": [
              "Bd4",
              "Qxa2"
            ],
            "key": "<p class='bad'>Looks central, drops a2. Bishop left b2, so Ra1 does not trap the queen. ~\u22123.</p>"
          },
          {
            "id": "red1",
            "label": "Red1 Rfd8",
            "mustPlay": [
              "Red1",
              "Rfd8"
            ],
            "key": "<p>Pseudo-activity. The rook looks busy. Black contests the file and you are worse (~\u22121.7). This is the move if he does not grab a2.</p>"
          }
        ],
        "key": "<p><b>All four.</b> a4 is not refuted by a6. Bxg2 with Bd7 is a fight; Bxg2 without Bd7 is a blunder. Bd4 loses a2. Red1 dies to Rfd8.</p>"
      },
      {
        "id": "trap",
        "name": "3 Trap",
        "title": "The game: after 20.Red1, Black to move",
        "prompt": "He grabbed. Play \u2026Qxa2 then Ra1.",
        "fen": "r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R1R2K1 b - - 3 20",
        "mustPlay": [
          "Qxa2",
          "Ra1"
        ],
        "questions": [
          {
            "name": "hunt",
            "label": "After \u2026Qb3, White\u2019s hunt move?",
            "type": "text"
          },
          {
            "name": "instead",
            "label": "The move that refutes Red1 if Black does not grab?",
            "hint": "Rfd8",
            "type": "text"
          }
        ],
        "key": "<p><b>21.Ra1</b>, then <b>22.Ra3</b>. Refutation if he does not grab: <b>\u2026Rfd8</b>.</p>"
      },
      {
        "id": "hunt",
        "name": "4 Hunt",
        "title": "After 21\u2026Qb3, White to move",
        "prompt": "Play the hunt move, then tag the game honestly.",
        "fen": "r4rk1/p3ppbp/1p4p1/1B1bP3/8/1q5P/1B2QPP1/R2R2K1 w - - 2 22",
        "mustPlay": [
          "Ra3"
        ],
        "questions": [
          {
            "name": "why",
            "label": "4.1 Why did you win?",
            "type": "select",
            "options": [
              {
                "value": "",
                "label": "choose"
              },
              {
                "value": "trap",
                "label": "I calculated the trap and he walked in"
              },
              {
                "value": "blunder",
                "label": "He hung it; 20.Red1 was still a mistake"
              },
              {
                "value": "both",
                "label": "Both: the hunt was real, and Red1 still needed the blunder"
              }
            ]
          },
          {
            "name": "next",
            "label": "4.2 Next time, move 20 is",
            "type": "text"
          },
          {
            "name": "tag",
            "label": "4.3 Tag",
            "type": "select",
            "options": [
              {
                "value": "",
                "label": "choose"
              },
              {
                "value": "calculation",
                "label": "calculation"
              },
              {
                "value": "conversion",
                "label": "conversion"
              },
              {
                "value": "opening",
                "label": "opening"
              },
              {
                "value": "time",
                "label": "time"
              },
              {
                "value": "clean",
                "label": "clean"
              }
            ]
          },
          {
            "name": "note",
            "label": "4.4 Log note",
            "type": "textarea"
          }
        ],
        "key": "<p>Tag <b>calculation</b>, not clean. The miss was stopping at \u2026a6. Logged to the dossier.</p>"
      }
    ]
  },
  "XbhWoWMi": {
    "id": "XbhWoWMi",
    "url": "https://lichess.org/XbhWoWMi",
    "title": "15+10 \u00b7 you White \u00b7 French Winawer",
    "date": "2026-09-12 20:56",
    "result": "0-1",
    "event": "Lichess 15+10 vs marky0",
    "startFen": "r4rk1/pppq1ppp/2nn2b1/3p1NB1/3P2P1/2PB1P2/P1P4P/R3QRK1 w - - 5 15",
    "logNote": "Saw Nxf5 gxf5 Bxf5 Bxf5 and stopped on my own capture; missed \u2026Qxf5 (ply 5). Clock 12:05 \u2192 3:26 over moves 22\u201326, then 32.Kg2?? Qg5+.",
    "steps": [
      {
        "id": "diagnose",
        "name": "1 Diagnose",
        "title": "After 14\u2026Nd6, White to move",
        "prompt": "Count f5 before you move. Count to the last capture, not to the one you like.",
        "fen": "r4rk1/pppq1ppp/2nn2b1/3p1NB1/3P2P1/2PB1P2/P1P4P/R3QRK1 w - - 5 15",
        "mustPlay": [],
        "questions": [
          {
            "name": "material",
            "label": "1.1 Material",
            "hint": "Who is up, and by how much?",
            "type": "text"
          },
          {
            "name": "attackers",
            "label": "1.2 Black pieces that hit f5",
            "hint": "There are three.",
            "type": "triple",
            "names": [
              "a1",
              "a2",
              "a3"
            ]
          },
          {
            "name": "defenders",
            "label": "1.3 White pieces that defend f5",
            "hint": "How many, and which?",
            "type": "text"
          },
          {
            "name": "stop",
            "label": "1.4 You saw Nxf5 gxf5 Bxf5 Bxf5. Which Black move comes next?",
            "hint": "Ply 5.",
            "type": "text"
          }
        ],
        "key": "<p><b>Material:</b> equal. The opening was not the problem: you were better through move 13 (8.O-O and 13.Bg5 let some of it go, nothing more).</p><p><b>f5:</b> three attackers \u2014 Nd6, Bg6 and <b>Qd7</b> \u2014 against two defenders, g4 and Bd3. The queen looks through e6, which has been empty since 4.exd5 exd5.</p><p>You did not stop at a scary reply this time. You stopped at <b>your own recapture</b>. Ply 5 is <b>\u2026Qxf5</b>.</p>"
      },
      {
        "id": "calculate",
        "name": "2 Calculate",
        "title": "Four lines from move 15. Count to the end of the captures.",
        "prompt": "Open a branch. Play every move, including the one you stopped before. Lock that branch. Next stays closed until all four are done.",
        "fen": "r4rk1/pppq1ppp/2nn2b1/3p1NB1/3P2P1/2PB1P2/P1P4P/R3QRK1 w - - 5 15",
        "questions": [
          {
            "name": "whynot",
            "label": "After 15.Qg3 Nxf5 gxf5 Bxf5, why not 17.Bxf5?",
            "type": "textarea"
          },
          {
            "name": "nxd6",
            "label": "15.Nxd6 first \u2014 what does it remove from the count?",
            "type": "text"
          }
        ],
        "branches": [
          {
            "id": "count",
            "label": "Qg3 Nxf5 gxf5 Bxf5 Bxf5 Qxf5",
            "mustPlay": [
              "Qg3",
              "Nxf5",
              "gxf5",
              "Bxf5",
              "Bxf5",
              "Qxf5"
            ],
            "key": "<p class='bad'>The line you stopped one ply short. You counted the knights off and the bishop taken, then the queen takes back. A pawn down with the kingside open (~\u22123). Nothing is won.</p>"
          },
          {
            "id": "game",
            "label": "Qg3 Nxf5 gxf5 Bxf5 Bf6 (game)",
            "mustPlay": [
              "Qg3",
              "Nxf5",
              "gxf5",
              "Bxf5",
              "Bf6"
            ],
            "key": "<p class='bad'>The game. You saw \u2026Qxf5 one move too late and put the bishop on f6 for an attack. After 17\u2026Bg6 18.f4 gxf6 it is still about \u22122. The attack did not pay for the pawn.</p>"
          },
          {
            "id": "nxd6",
            "label": "Nxd6 Bxd3 cxd3 Qxd6",
            "mustPlay": [
              "Nxd6",
              "Bxd3",
              "cxd3",
              "Qxd6"
            ],
            "key": "<p class='ok'>Take the attacker first. The knight is gone, the bishops come off, and nobody is aiming at f5 anymore. About equal.</p>"
          },
          {
            "id": "ne3",
            "label": "Ne3",
            "mustPlay": [
              "Ne3"
            ],
            "key": "<p class='ok'>Engine's first choice, about equal. The knight leaves before it can be counted off and hits d5 from e3. Stepping back is fine when the count is 3 against 2.</p>"
          }
        ],
        "key": "<p><b>All four.</b> Qg3 does nothing about f5, and the count loses a pawn. Nxd6 and Ne3 keep it equal. The skill is not seeing Nxf5. You saw it. The skill is playing to the last capture.</p>"
      },
      {
        "id": "trap",
        "name": "3 Clock",
        "title": "After 31\u2026Qe3+, White to move (1:42 left)",
        "prompt": "Three king moves draw. One loses. Play the game move and the check that punishes it.",
        "fen": "6n1/ppp3k1/5pPp/3Q4/3P4/2PBq3/P1P5/6K1 w - - 1 32",
        "questions": [
          {
            "name": "check",
            "label": "3.1 After 32.Kg2, which check wins?",
            "type": "text"
          },
          {
            "name": "safe",
            "label": "3.2 Three king moves that draw",
            "type": "triple",
            "names": [
              "k1",
              "k2",
              "k3"
            ]
          }
        ],
        "branches": [
          {
            "id": "kg2",
            "label": "Kg2 Qg5+ Qxg5 hxg5 (game)",
            "mustPlay": [
              "Kg2",
              "Qg5+",
              "Qxg5",
              "hxg5"
            ],
            "key": "<p class='bad'>\u2026Qg5+ checks down the g-file and hits your queen on d5 along the fifth rank. You have to trade. In the knight-vs-bishop ending g6 falls and Black wins.</p>"
          },
          {
            "id": "kh2",
            "label": "Kh2 Qf4+ Kh3 Qe3+",
            "mustPlay": [
              "Kh2",
              "Qf4+",
              "Kh3",
              "Qe3+"
            ],
            "key": "<p class='ok'>Off the g-file. Black has only checks, and it is a draw. Kh1 and Kf1 are the same.</p>"
          }
        ],
        "key": "<p>At 1:42 the question is only: <b>which squares let him check and hit something at the same time?</b> g2 was the only one.</p>"
      },
      {
        "id": "log",
        "name": "4 Log",
        "title": "Tag the loss honestly",
        "prompt": "Three moments. Pick the one that cost the game first.",
        "fen": "r4rk1/pppq1ppp/2nn2b1/3p1NB1/3P2P1/2PB1P2/P1P4P/R3QRK1 w - - 5 15",
        "mustPlay": [],
        "questions": [
          {
            "name": "why",
            "label": "4.1 Why did you lose?",
            "type": "select",
            "options": [
              {
                "value": "",
                "label": "choose"
              },
              {
                "value": "count",
                "label": "15.Qg3: I stopped at my own Bxf5 and missed \u2026Qxf5"
              },
              {
                "value": "time",
                "label": "The clock: 12:05 \u2192 3:26 over moves 22\u201326 in a level position"
              },
              {
                "value": "kg2",
                "label": "32.Kg2?? in time trouble"
              },
              {
                "value": "all",
                "label": "All three, in that order"
              }
            ]
          },
          {
            "name": "minutes",
            "label": "4.2 Moves 22\u201326 cost nine minutes at about equal. What were you calculating?",
            "type": "textarea"
          },
          {
            "name": "tag",
            "label": "4.3 Tag",
            "type": "select",
            "options": [
              {
                "value": "",
                "label": "choose"
              },
              {
                "value": "calculation",
                "label": "calculation"
              },
              {
                "value": "time",
                "label": "time"
              },
              {
                "value": "conversion",
                "label": "conversion"
              },
              {
                "value": "opening",
                "label": "opening"
              },
              {
                "value": "clean",
                "label": "clean"
              }
            ]
          },
          {
            "name": "note",
            "label": "4.4 Log note",
            "type": "textarea"
          }
        ],
        "key": "<p>Tag <b>calculation</b>. Move 15 put you two pawns' worth down, and the clock and Kg2 came after it. Last week you stopped at the reply you disliked (\u2026a6). This week you stopped at the recapture you liked (Bxf5). Same leak. Three more ply.</p>"
      }
    ]
  }
};
