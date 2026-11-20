(() => {
  const segments = {
    "01": [331, 349],
    "02": [349, 367],
    "03": [394, 414],
    "04": [1310, 1329],
    "05": [564, 584],
    "06": [612, 632],
    "07": [684, 704],
    "08": [730, 743],
    "09": [819, 838],
    "10": [873, 892],
    "11": [990, 1009],
    "12": [504, 518],
    "13": [1040, 1054],
    "14": [1075, 1088],
    "15": [1100, 1120],
    "16": [1133, 1137],
    "17": [1148, 1156],
    "18": [1170, 1191],
    "19": [1194, 1210],
    "20": [1218, 1238],
    "21": [650, 657],
    "22": [657, 667]
  };
  const instrumentsPath = "/classroom-hub/gugak-quiz/instruments/";

  const style = document.createElement("style");
  style.textContent = `
    .quiz-listen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 6px 10px;
      margin-top: 12px;
    }
    .quiz-listen button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px 16px;
      border: 1px solid var(--primary, #174c4d);
      border-radius: 10px;
      background: var(--primary, #174c4d);
      color: var(--primary-foreground, #fff);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .quiz-listen button:focus-visible {
      outline: 3px solid var(--ring, #237c7d);
      outline-offset: 3px;
    }
    .quiz-listen-note {
      color: var(--muted-foreground, #536f76);
      font-size: 14px;
    }
    .quiz-listen-frame {
      position: fixed;
      top: 0;
      left: -100px;
      width: 1px;
      height: 1px;
      border: 0;
      opacity: 0;
      pointer-events: none;
    }
  `;
  document.head.append(style);

  const controls = document.createElement("div");
  controls.className = "quiz-listen";
  const button = document.createElement("button");
  button.type = "button";
  const pairNote = document.createElement("span");
  pairNote.className = "quiz-listen-note";
  pairNote.textContent = "두 악기가 함께 소개되는 구간이에요";
  pairNote.hidden = true;
  controls.append(button, pairNote);

  let currentNote;
  let currentId;
  let currentQuestionLabel;
  let player;
  let stopTimer;

  function setPlaying(playing) {
    button.textContent = playing ? "멈추기" : "소리 듣기";
    button.setAttribute("aria-pressed", String(playing));
  }

  function stop() {
    if (!player) return;

    window.clearTimeout(stopTimer);
    player.remove();
    player = null;
    setPlaying(false);
  }

  button.addEventListener("click", () => {
    if (player) {
      stop();
      return;
    }

    const segment = segments[currentId];
    if (!segment) return;

    const [start, end] = segment;
    player = document.createElement("iframe");
    player.className = "quiz-listen-frame";
    player.title = "악기 소리 재생";
    player.tabIndex = -1;
    player.setAttribute("aria-hidden", "true");
    player.allow = "autoplay; encrypted-media";
    player.src = `https://www.youtube-nocookie.com/embed/m28Nmxddr4I?start=${start}&end=${end}&autoplay=1&controls=0&playsinline=1`;
    document.body.append(player);
    setPlaying(true);
    stopTimer = window.setTimeout(stop, Math.max(4, end - start + 20) * 1000);
  });

  function syncQuestion() {
    const note = document.querySelector(".observation-note");
    const image = note?.parentElement?.querySelector(`img[src^="${instrumentsPath}"]`);
    const id = image?.getAttribute("src").slice(instrumentsPath.length).match(/^\d{2}/)?.[0];
    const questionLabel = note?.closest(".play-grid")?.querySelector(".question-label")?.textContent;

    if (note !== currentNote || id !== currentId || questionLabel !== currentQuestionLabel) {
      stop();
      currentNote = note;
      currentId = id;
      currentQuestionLabel = questionLabel;
      pairNote.hidden = id !== "21" && id !== "22";
    }

    if (!segments[id]) {
      controls.remove();
    } else if (note.nextElementSibling !== controls) {
      // The observation note itself is hidden on small screens.
      note.after(controls);
    }
  }

  setPlaying(false);
  const observer = new MutationObserver(syncQuestion);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src"],
    characterData: true
  });
  syncQuestion();
})();
