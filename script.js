// Apps for Fun and Games — video-matched sorting activity
// Controls: select a card then a category, OR drag a card onto a category.

const waves = [
  [
    { name: "Snakes & Ladders", icon: "🎮", color: "#ec42a9", category: "Fun" },
    { name: "Times Tables", icon: "▤", color: "#4ba8f5", category: "Learn" },
    { name: "Sketchbook", icon: "✎", color: "#a855ed", category: "Create" },
    { name: "Video Call", icon: "▣", color: "#12d99a", category: "Talk" }
  ],
  [
    { name: "Beat Maker", icon: "♫", color: "#a855ed", category: "Create" },
    { name: "Kids Mail", icon: "✉", color: "#12d99a", category: "Talk" },
    { name: "Jigsaw Mania", icon: "🧩", color: "#ec42a9", category: "Fun" }
  ],
  [
    { name: "Photo Filter", icon: "▣", color: "#a855ed", category: "Create" },
    { name: "Voice Chat", icon: "♩", color: "#12d99a", category: "Talk" },
    { name: "Arcade Race", icon: "🚗", color: "#ec42a9", category: "Fun" }
  ]
];

let waveIndex = 0;
let score = 0;
let sortedCount = 0;
let elapsed = 0;
let timerId = null;
let selectedCard = null;
let soundOn = true;
let waveTransitionPending = false;
let audioContext = null;

const $ = (id) => document.getElementById(id);
const tray = $("tray");
const scoreEl = $("score");
const timerEl = $("timer");
const waveEl = $("wave");
const progressFill = $("progressFill");
const feedback = $("feedback");
const overlay = $("resultOverlay");
const toast = $("toast");

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function startTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    elapsed += 1;
    timerEl.textContent = formatTime(elapsed);
  }, 1000);
}

function playTone(correct = true) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = correct ? 660 : 185;
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.13);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.13);
  } catch (_) {
    // Audio is optional; the game remains fully playable without it.
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), 1400);
}

function updateProgress() {
  const total = waves.reduce((sum, wave) => sum + wave.length, 0);
  if (progressFill) progressFill.style.width = `${(sortedCount / total) * 100}%`;
  waveEl.textContent = String(waveIndex + 1);
}

function setSelection(card) {
  tray.querySelectorAll(".app-card").forEach((item) => item.classList.remove("selected"));
  selectedCard = card;
  if (card) {
    card.classList.add("selected");
    $("pickLabel").textContent = card.dataset.name;
    feedback.textContent = `Now choose a category for ${card.dataset.name}`;
  } else {
    $("pickLabel").textContent = "Pick an app";
  }
}

function createCard(app, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "app-card";
  card.draggable = true;
  card.dataset.category = app.category;
  card.dataset.name = app.name;
  card.dataset.id = `${waveIndex}-${index}`;
  card.innerHTML = `<span class="app-icon" style="background:${app.color}">${app.icon}</span><span class="app-name">${app.name}</span>`;

  card.addEventListener("click", () => {
    if (card.dataset.completed === "true" || waveTransitionPending) return;
    startTimer();
    setSelection(selectedCard === card ? null : card);
  });

  card.addEventListener("dragstart", (event) => {
    if (waveTransitionPending || card.dataset.completed === "true") {
      event.preventDefault();
      return;
    }
    startTimer();
    setSelection(card);
    event.dataTransfer.setData("text/plain", card.dataset.id);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  return card;
}

function renderWave() {
  tray.replaceChildren();
  setSelection(null);
  waveTransitionPending = false;
  $("pickLabel").textContent = "Pick an app";
  $("feedback").textContent = waveIndex === 0
    ? "Pick an app card to get started"
    : `Wave ${waveIndex + 1} — keep going!`;

  waves[waveIndex].forEach((app, index) => tray.appendChild(createCard(app, index)));

  waveEl.textContent = String(waveIndex + 1);
  document.querySelectorAll(".level-dots i").forEach((dot, index) => {
    dot.classList.toggle("active", index === waveIndex);
    dot.classList.toggle("completed", index < waveIndex);
  });
  updateProgress();
}

function finishWaveIfEmpty() {
  if (tray.querySelector(".app-card") || waveTransitionPending) return;
  waveTransitionPending = true;

  if (waveIndex < waves.length - 1) {
    feedback.textContent = `Wave ${waveIndex + 1} completed!`;
    showToast(`Wave ${waveIndex + 1} completed!`);
    window.setTimeout(() => {
      waveIndex += 1;
      renderWave();
      showToast(`Wave ${waveIndex + 1} started!`);
    }, 850);
  } else {
    feedback.textContent = "All waves completed! Great work!";
    window.setTimeout(finishGame, 650);
  }
}

function sortCard(card, category) {
  if (!card || !card.isConnected || card.dataset.completed === "true" || waveTransitionPending) return;

  startTimer();
  if (card.dataset.category !== category) {
    playTone(false);
    card.classList.remove("wrong-answer");
    // Restart the shake animation so repeated wrong answers are visible.
    void card.offsetWidth;
    card.classList.add("wrong-answer");
    feedback.textContent = `Try again! ${card.dataset.name} belongs in a different category.`;
    showToast("Not quite — try another category!");
    return;
  }

  playTone(true);
  card.dataset.completed = "true";
  card.draggable = false;
  card.classList.remove("selected");
  if (selectedCard === card) selectedCard = null;
  $("pickLabel").textContent = "Pick an app";
  card.style.pointerEvents = "none";
  feedback.textContent = `Correct! ${card.dataset.name} belongs in ${category}.`;
  score += 100;
  sortedCount += 1;
  scoreEl.textContent = String(score);
  updateProgress();

  // Animate the app card into its matching category, as in the reference video.
  const target = document.querySelector(`.category[data-category="${category}"]`);
  const from = card.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const flyingCard = card.cloneNode(true);
  flyingCard.classList.add("flying-card");
  flyingCard.classList.remove("selected", "wrong-answer");
  Object.assign(flyingCard.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    transition: "left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1), transform .42s, opacity .42s"
  });
  document.body.appendChild(flyingCard);
  card.style.visibility = "hidden";

  requestAnimationFrame(() => {
    flyingCard.style.left = `${to.left + to.width / 2 - from.width / 2}px`;
    flyingCard.style.top = `${to.top + to.height / 2 - from.height / 2}px`;
    flyingCard.style.transform = "scale(.35) rotate(8deg)";
    flyingCard.style.opacity = "0.15";
  });

  window.setTimeout(() => {
    flyingCard.remove();
    card.remove();
    finishWaveIfEmpty();
  }, 440);
}

document.querySelectorAll(".category").forEach((zone) => {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!waveTransitionPending) zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");
    const id = event.dataTransfer.getData("text/plain");
    const card = [...tray.querySelectorAll(".app-card")].find((item) => item.dataset.id === id);
    if (card) sortCard(card, zone.dataset.category);
  });
  zone.addEventListener("click", () => {
    if (selectedCard) sortCard(selectedCard, zone.dataset.category);
  });
  zone.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && selectedCard) {
      event.preventDefault();
      sortCard(selectedCard, zone.dataset.category);
    }
  });
});

function makeConfetti() {
  const container = $("confetti");
  container.replaceChildren();
  const colors = ["#ff4eae", "#42b7ff", "#ffd43b", "#36d99a", "#a66cff"];
  for (let i = 0; i < 90; i += 1) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2.3 + Math.random() * 2}s`;
    container.appendChild(piece);
  }
}

function finishGame() {
  window.clearInterval(timerId);
  timerId = null;
  $("finalTime").textContent = formatTime(elapsed);
  $("finalScore").textContent = `${score} pts`;
  overlay.classList.remove("hidden");
  makeConfetti();
  playTone(true);
}

function restart() {
  window.clearInterval(timerId);
  timerId = null;
  waveIndex = 0;
  score = 0;
  sortedCount = 0;
  elapsed = 0;
  selectedCard = null;
  waveTransitionPending = false;
  scoreEl.textContent = "0";
  timerEl.textContent = "00:00";
  overlay.classList.add("hidden");
  feedback.textContent = "Pick an app card to get started";
  renderWave();
}

$("restartBtn").addEventListener("click", restart);
$("playAgain").addEventListener("click", restart);
$("soundBtn").addEventListener("click", (event) => {
  soundOn = !soundOn;
  event.currentTarget.textContent = soundOn ? "🔊" : "🔇";
  showToast(soundOn ? "Sound on" : "Sound off");
});
$("fullscreenBtn").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {
    showToast("Fullscreen is not available in this browser.");
  }
});
$("helpBtn").addEventListener("click", () => {
  alert("Choose an app card, then tap its matching category — Fun, Learn, Create, or Talk. You can also drag the card onto a category. Each correct answer earns 100 points. Finish all 3 waves!");
});

renderWave();
