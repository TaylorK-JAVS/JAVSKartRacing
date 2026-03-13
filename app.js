const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");
const racerForm = document.getElementById("racerForm");
const racerNameInput = document.getElementById("racerName");
const racerImageInput = document.getElementById("racerImage");
const saveRacerButton = document.getElementById("saveRacerButton");
const clearFormButton = document.getElementById("clearFormButton");
const savedRacers = document.getElementById("savedRacers");
const rosterCount = document.getElementById("rosterCount");
const raceButton = document.getElementById("raceButton");
const resetButton = document.getElementById("resetButton");
const resetAllDataButton = document.getElementById("resetAllDataButton");
const shuffleNamesButton = document.getElementById("shuffleNames");
const statusText = document.getElementById("statusText");
const winnerText = document.getElementById("winnerText");
const raceFeed = document.getElementById("raceFeed");

const palette = ["#009bdf", "#104d97", "#00aeee", "#afafaf", "#ed0000", "#d10000", "#2e82c4", "#f5a623"];
const maxRaceRacers = 10;
const trackPaddingTop = 110;
const trackPaddingBottom = 90;
const trackLabelWidth = 165;
const laneGap = 12;
const announcerLines = {
  raceStart: [
    (name) => `${name} is off like a shopping cart with a rocket strapped to it!`,
    (name) => `The green flag waves and ${name} is already chewing up pavement!`,
    (name) => `${name} launches off the line like rent is due tonight!`,
    (name) => `Listen to that engine howl, ${name} just blasted into the race!`,
    (name) => `${name} got a jump so hot the coffee machines are filing complaints!`,
  ],
  coffee: [
    (name) => `${name} just chugged a pit-lane espresso and found warp speed!`,
    (name) => `${name} got a coffee kick and the kart is absolutely caffeinated chaos!`,
    (name) => `${name} hit the cold brew nitro and those wheels are singing now!`,
    (name) => `${name} grabbed the office roast and turned the lane into a blur!`,
    (name) => `${name} is running on pure beans, bad ideas, and top-end speed!`,
  ],
  issue: [
    (name) => `Oh no, the CEO just whipped a fresh code issue right into ${name}'s windshield!`,
    (name) => `${name} caught an executive-grade blocker and that kart is wobbling now!`,
    (name) => `The CEO has entered the chat and ${name} just got beaned by a bug report!`,
    (name) => `${name} took a flying issue ticket to the front bumper and lost momentum!`,
    (name) => `That was a nasty office grenade, the CEO just slowed ${name} with a surprise issue!`,
  ],
  commentaryLead: [
    (name) => `${name} has the crowd on its feet and the rest of the pack is eating fumes!`,
    (name) => `${name} is driving like the trophy already has a parking spot reserved!`,
    (name) => `${name} owns the lane right now and the field is scrambling to answer!`,
    (name) => `${name} is out front with swagger, speed, and absolutely no regard for mercy!`,
    (name) => `${name} is dictating the race tempo like a conductor with a lead foot!`,
  ],
  commentaryIssueLead: [
    (name) => `${name} still leads, but that CEO issue is hanging off the kart like a deadline!`,
    (name) => `${name} is somehow still in front while dragging a full-blown code fire behind!`,
    (name) => `${name} got tagged by an issue, yet the lead is still barely intact!`,
    (name) => `${name} is limping in front with an executive blocker strapped to the axle!`,
    (name) => `${name} took the hit and still holds the top spot by sheer stubbornness!`,
  ],
  winner: [
    (name) => `${name} storms the stripe and wins this office Grand Prix in spectacular fashion!`,
    (name) => `${name} takes the checkered flag and leaves the rest of the field writing excuses!`,
    (name) => `${name} closes the deal, grabs the glory, and owns the winner's circle!`,
    (name) => `${name} hits the line first and that kart just became company legend!`,
    (name) => `${name} seals it at the flag with a finish worthy of slow-motion replay!`,
  ],
};
const seedRacers = [
  { id: "jesse", name: "Jesse", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "marcus", name: "Marcus", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "stan", name: "Stan", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "taylor", name: "Taylor", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "ryan", name: "Ryan", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "logan", name: "Logan", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "kellee", name: "Kellee", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "tyler", name: "Tyler", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "jason", name: "Jason", image: "", selected: true, wins: 0, leadMs: 0 },
  { id: "jared", name: "Jared", image: "", selected: true, wins: 0, leadMs: 0 },
];

const state = {
  savedRacers: [],
  racers: [],
  winner: null,
  animationId: null,
  raceInProgress: false,
  raceStartTime: 0,
  editingRacerId: null,
  feedEntries: [],
  lastLeadCallout: 0,
  lastEventCallout: 0,
  raceLeadDurations: {},
  statsCommitted: false,
};

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function normalizeRacers(racers) {
  let selectedCount = 0;
  return racers
    .map((racer, index) => ({
      id: typeof racer.id === "string" && racer.id ? racer.id : `racer-${index + 1}`,
      name: typeof racer.name === "string" ? racer.name.trim() : "",
      image: typeof racer.image === "string" ? racer.image : "",
      wins: Number.isFinite(racer.wins) ? Math.max(0, racer.wins) : 0,
      leadMs: Number.isFinite(racer.leadMs) ? Math.max(0, racer.leadMs) : 0,
      selected: (() => {
        if (racer.selected === false || selectedCount >= maxRaceRacers) {
          return false;
        }
        selectedCount += 1;
        return true;
      })(),
    }))
    .filter((racer) => racer.name)
    .slice(0, 24);
}

async function fetchSavedRacers() {
  const response = await fetch("/api/racers");
  if (!response.ok) {
    throw new Error("Unable to load racers.");
  }

  const payload = await response.json();
  if (!Array.isArray(payload.racers) || payload.racers.length === 0) {
    return normalizeRacers(seedRacers);
  }

  return normalizeRacers(payload.racers);
}

async function persistSavedRacers() {
  const response = await fetch("/api/racers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ racers: state.savedRacers }),
  });
  if (!response.ok) {
    throw new Error("Unable to save racers.");
  }
}

async function uploadRacerImage(racerId, imageData, previousImage = "") {
  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      racerId,
      imageData,
      previousImage,
    }),
  });
  if (!response.ok) {
    throw new Error("Unable to save image.");
  }

  const payload = await response.json();
  return payload.image;
}

async function resetSavedRacersOnServer() {
  const response = await fetch("/api/reset", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Unable to reset racer data.");
  }

  const payload = await response.json();
  return normalizeRacers(payload.racers || seedRacers);
}

function getSelectedProfiles() {
  return state.savedRacers.filter((racer) => racer.selected).slice(0, maxRaceRacers);
}

function getWinsSpread() {
  const values = state.savedRacers.map((racer) => racer.wins || 0);
  return {
    minWins: Math.min(...values, 0),
    maxWins: Math.max(...values, 1),
  };
}

function getPerformanceBias(profile) {
  const { minWins, maxWins } = getWinsSpread();
  const range = Math.max(1, maxWins - minWins);
  const winRatio = ((profile.wins || 0) - minWins) / range;
  return {
    coffeeCooldownFactor: 0.8 + winRatio * 0.55,
    issueCooldownFactor: 1.25 - winRatio * 0.55,
  };
}

function getStartX() {
  return 24 + trackLabelWidth + 56;
}

function createRacers(profiles) {
  return profiles.map((profile, index) => ({
    id: profile.id,
    name: profile.name,
    image: profile.image,
    wins: profile.wins || 0,
    leadMs: profile.leadMs || 0,
    color: palette[index % palette.length],
    lane: index,
    x: getStartX(),
    speed: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
    coffeeTimer: 0,
    coffeeCooldown: (260 + Math.random() * 360) * getPerformanceBias(profile).coffeeCooldownFactor,
    issueTimer: 0,
    issueCooldown: (520 + Math.random() * 640) * getPerformanceBias(profile).issueCooldownFactor,
    finishTime: null,
    cachedImage: createCachedImage(profile.image),
  }));
}

function createCachedImage(source) {
  if (!source) {
    return null;
  }

  const image = new Image();
  image.src = source;
  image.addEventListener("load", () => {
    if (!state.raceInProgress) {
      drawScene(performance.now());
    }
  });
  return image;
}

function getTrackMetrics() {
  const racerCount = Math.max(state.racers.length, 1);
  const trackTop = trackPaddingTop;
  const trackBottom = canvas.height - trackPaddingBottom;
  const availableHeight = trackBottom - trackTop;
  const laneHeight = Math.max((availableHeight - laneGap * (racerCount - 1)) / racerCount, 42);
  const gutterX = 24;
  const startX = getStartX();
  const finishLine = canvas.width - 170;

  return {
    laneHeight,
    gutterX,
    startX,
    finishLine,
    trackTop,
  };
}

function appendFeed(label, message) {
  state.feedEntries.unshift({
    id: crypto.randomUUID(),
    label,
    message,
  });
  state.feedEntries = state.feedEntries.slice(0, 24);
  renderFeed();
}

function pickAnnouncerLine(type, racerName) {
  const options = announcerLines[type];
  return options[Math.floor(Math.random() * options.length)](racerName);
}

function renderFeed() {
  raceFeed.innerHTML = "";
  state.feedEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "feed-item";

    const title = document.createElement("strong");
    title.textContent = entry.label;

    const text = document.createElement("p");
    text.textContent = entry.message;

    item.append(title, text);
    raceFeed.appendChild(item);
  });
}

function updateStatus(message, label = "Status") {
  statusText.textContent = message;
  appendFeed(label, message);
}

function maybeCallRaceEvent(message, label, timestamp) {
  if (timestamp - state.lastEventCallout < 10000) {
    return;
  }

  updateStatus(message, label);
  state.lastEventCallout = timestamp;
}

function getRaceLeader() {
  return state.racers.reduce((leader, racer) => {
    if (!leader || racer.x > leader.x) {
      return racer;
    }
    return leader;
  }, null);
}

function commitRaceStats() {
  if (state.statsCommitted) {
    return;
  }

  state.savedRacers = state.savedRacers.map((racer) => ({
    ...racer,
    wins: racer.wins + (state.winner?.id === racer.id ? 1 : 0),
    leadMs: racer.leadMs + (state.raceLeadDurations[racer.id] || 0),
  }));

  state.statsCommitted = true;
  persistSavedRacers().catch(() => {
    updateStatus("Race stats could not be written to racers.json.", "Server");
  });
  renderSavedRacers();
}

function resetRaceBoard(profiles = getSelectedProfiles()) {
  const finalProfiles = profiles.length >= 2 ? profiles : state.savedRacers.slice(0, Math.min(maxRaceRacers, state.savedRacers.length));
  state.racers = createRacers(finalProfiles);
  state.winner = null;
  state.raceInProgress = false;
  state.raceStartTime = 0;
  state.lastLeadCallout = 0;
  state.lastEventCallout = 0;
  state.raceLeadDurations = {};
  state.statsCommitted = false;
  winnerText.textContent = "Nobody yet";
  raceButton.disabled = false;
  updateStatus("Waiting at the starting line.", "Race Control");
  drawScene(performance.now());
}

function renderSavedRacers() {
  savedRacers.innerHTML = "";

  if (state.savedRacers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No saved racers yet.";
    savedRacers.appendChild(empty);
  }

  state.savedRacers.forEach((racer) => {
    const card = document.createElement("article");
    card.className = "saved-racer";

    const avatar = document.createElement("img");
    avatar.className = "saved-racer-avatar";
    avatar.src = racer.image || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="#24324a"/><text x="50%" y="57%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="38" fill="#f7f3e9">${racer.name.slice(0, 1).toUpperCase()}</text></svg>`)}`;
    avatar.alt = "";

    const body = document.createElement("div");
    const name = document.createElement("div");
    name.className = "saved-racer-name";
    name.textContent = racer.name;

    const meta = document.createElement("label");
    meta.className = "toggle-chip";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = racer.selected;
    toggle.addEventListener("change", () => {
      toggleRacerSelection(racer.id, toggle.checked).catch(() => {
        updateStatus("That racer could not be updated in racers.json.", "Server");
        renderSavedRacers();
      });
    });
    const metaText = document.createElement("span");
    metaText.className = "saved-racer-meta";
    const statsText = `${racer.wins} wins`;
    metaText.textContent = racer.selected ? `${statsText} | In the next race` : `${statsText} | Parked in the garage`;
    meta.append(toggle, metaText);

    body.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "saved-racer-actions";

    const editButton = document.createElement("button");
    editButton.className = "icon-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => populateFormForEdit(racer.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteRacer(racer.id).catch(() => {
        updateStatus("That racer could not be deleted from racers.json.", "Server");
      });
    });

    actions.append(editButton, deleteButton);
    card.append(avatar, body, actions);
    savedRacers.appendChild(card);
  });

  const activeCount = getSelectedProfiles().length;
  rosterCount.textContent = `${activeCount} ready`;
}

function clearForm() {
  racerForm.reset();
  state.editingRacerId = null;
  saveRacerButton.textContent = "Save Racer";
}

async function resetAllData() {
  const confirmed = window.confirm("Clear all saved racers and photos and restore the default roster?");
  if (!confirmed) {
    return;
  }

  state.savedRacers = await resetSavedRacersOnServer();
  state.raceLeadDurations = {};
  state.statsCommitted = false;
  clearForm();
  renderSavedRacers();
  resetRaceBoard();
  updateStatus("All saved racer data was cleared and the default roster was restored.", "Garage");
}

function populateFormForEdit(racerId) {
  const racer = state.savedRacers.find((entry) => entry.id === racerId);
  if (!racer) {
    return;
  }

  state.editingRacerId = racer.id;
  racerNameInput.value = racer.name;
  saveRacerButton.textContent = "Update Racer";
  racerNameInput.focus();
}

async function toggleRacerSelection(racerId, selected) {
  const nextSelectedCount = state.savedRacers.filter((racer) => (
    racer.id === racerId ? selected : racer.selected
  )).length;
  if (selected && nextSelectedCount > maxRaceRacers) {
    updateStatus(`Only ${maxRaceRacers} racers can line up at once.`, "Garage");
    renderSavedRacers();
    return;
  }

  state.savedRacers = state.savedRacers.map((racer) => (
    racer.id === racerId ? { ...racer, selected } : racer
  ));
  await persistSavedRacers();
  renderSavedRacers();
  if (!state.raceInProgress) {
    resetRaceBoard();
  }
}

async function deleteRacer(racerId) {
  state.savedRacers = state.savedRacers.filter((racer) => racer.id !== racerId);

  await persistSavedRacers();
  if (state.editingRacerId === racerId) {
    clearForm();
  }
  renderSavedRacers();
  resetRaceBoard();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function updateRace(deltaSeconds, now) {
  const { finishLine } = getTrackMetrics();

  for (const racer of state.racers) {
    if (racer.finishTime !== null) {
      continue;
    }

    racer.coffeeCooldown -= deltaSeconds * 60;
    if (racer.coffeeCooldown <= 0) {
      racer.coffeeTimer = 20 + Math.random() * 24;
      racer.coffeeCooldown = (340 + Math.random() * 460) * getPerformanceBias(racer).coffeeCooldownFactor;
      maybeCallRaceEvent(pickAnnouncerLine("coffee", racer.name), "Coffee Boost", now);
    }

    racer.issueCooldown -= deltaSeconds * 60;
    if (racer.issueCooldown <= 0) {
      racer.issueTimer = 40 + Math.random() * 24;
      racer.issueCooldown = (680 + Math.random() * 760) * getPerformanceBias(racer).issueCooldownFactor;
      maybeCallRaceEvent(pickAnnouncerLine("issue", racer.name), "CEO Issue", now);
    }

    if (racer.coffeeTimer > 0) {
      racer.coffeeTimer -= deltaSeconds * 60;
    }

    if (racer.issueTimer > 0) {
      racer.issueTimer -= deltaSeconds * 60;
    }

    const baseSpeed = 0.36 + Math.random() * 0.24;
    const coffeeBoost = racer.coffeeTimer > 0 ? 0.43 + Math.random() * 0.29 : 0;
    const issueSlowdown = racer.issueTimer > 0 ? 0.38 + Math.random() * 0.18 : 0;
    racer.speed = Math.max(0.12, baseSpeed + coffeeBoost - issueSlowdown);
    racer.x += racer.speed * deltaSeconds * 60;

    if (racer.x >= finishLine) {
      racer.x = finishLine;
      racer.finishTime = now;
      if (!state.winner) {
        state.winner = racer;
        state.raceInProgress = false;
        winnerText.textContent = racer.name;
        updateStatus(pickAnnouncerLine("winner", racer.name), "Winner");
        raceButton.disabled = false;
      }
    }
  }
}

function drawBackground() {
  const { gutterX, laneHeight, finishLine, trackTop, startX } = getTrackMetrics();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#edf7fd";
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.34);

  ctx.fillStyle = "#dbe7ee";
  ctx.fillRect(0, canvas.height * 0.34, canvas.width, canvas.height * 0.66);

  for (let hill = 0; hill < 4; hill += 1) {
    const x = 150 + hill * 260;
    ctx.fillStyle = hill % 2 === 0 ? "#a7cbe0" : "#bfd9e8";
    ctx.beginPath();
    ctx.arc(x, 280, 180, Math.PI, 0);
    ctx.fill();
  }

  ctx.fillStyle = "#4d4d4d";
  ctx.fillRect(gutterX + trackLabelWidth, 90, canvas.width - (gutterX + trackLabelWidth) - 90, canvas.height - 160);

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fillRect(gutterX, 90, trackLabelWidth - 10, canvas.height - 160);

  for (let lane = 0; lane < state.racers.length; lane += 1) {
    const laneY = trackTop + lane * (laneHeight + laneGap);
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 18]);
    ctx.beginPath();
    ctx.moveTo(startX - 20, laneY + laneHeight);
    ctx.lineTo(canvas.width - 110, laneY + laneHeight);
    ctx.stroke();

    const racer = state.racers[lane];
    if (racer) {
      const chipY = laneY + laneHeight * 0.5;

      ctx.fillStyle = racer.color;
      ctx.beginPath();
      ctx.arc(gutterX + 18, chipY, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#104d97";
      ctx.font = '700 17px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(racer.name, gutterX + 36, chipY);
    }
  }
  ctx.setLineDash([]);

  const finishTop = 90;
  const finishHeight = canvas.height - 160;
  const finishRows = Math.max(12, state.racers.length * 2);
  const finishRowHeight = finishHeight / finishRows;
  for (let row = 0; row < finishRows; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ffffff" : "#104d97";
      ctx.fillRect(finishLine + 20 + col * 20, finishTop + row * finishRowHeight, 20, finishRowHeight + 1);
    }
  }

  ctx.fillStyle = "#104d97";
  ctx.font = '700 32px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("START", startX - 36, 70);
  ctx.fillText("FINISH", finishLine - 52, 70);
}

function drawKart(racer, timestamp) {
  const { laneHeight, trackTop } = getTrackMetrics();
  const top = trackTop + racer.lane * (laneHeight + laneGap);
  const wobble = Math.sin(timestamp / 140 + racer.wobbleOffset) * 2.5;
  const y = top + laneHeight * 0.38 + wobble;

  ctx.save();
  ctx.translate(racer.x, y);

  if (racer.coffeeTimer > 0 && state.raceInProgress) {
    ctx.fillStyle = "rgba(120, 68, 24, 0.8)";
    ctx.beginPath();
    ctx.moveTo(-46, 20);
    ctx.lineTo(-70, 8);
    ctx.lineTo(-70, 32);
    ctx.fill();

    ctx.fillStyle = "#fff2d6";
    ctx.font = '700 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("COFFEE", -44, -22);
  }

  if (racer.issueTimer > 0 && state.raceInProgress) {
    ctx.fillStyle = "rgba(209, 0, 0, 0.9)";
    ctx.beginPath();
    ctx.roundRect(24, -26, 54, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("ISSUE", 51, -9);
  }

  ctx.fillStyle = racer.color;
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.lineTo(-28, 10);
  ctx.lineTo(2, 6);
  ctx.lineTo(36, 17);
  ctx.lineTo(48, 30);
  ctx.lineTo(18, 36);
  ctx.lineTo(-18, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.moveTo(-20, 14);
  ctx.lineTo(0, 11);
  ctx.lineTo(24, 19);
  ctx.lineTo(10, 23);
  ctx.lineTo(-14, 23);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1f3653";
  ctx.beginPath();
  ctx.moveTo(36, 18);
  ctx.lineTo(58, 24);
  ctx.lineTo(58, 34);
  ctx.lineTo(40, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1f3653";
  ctx.beginPath();
  ctx.moveTo(-42, 18);
  ctx.lineTo(-28, 20);
  ctx.lineTo(-28, 30);
  ctx.lineTo(-42, 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(-20, -20, 40, 40, 14);
  ctx.fill();

  if (racer.cachedImage?.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-17, -17, 34, 34, 12);
    ctx.clip();
    const sourceSize = Math.min(racer.cachedImage.naturalWidth || 24, racer.cachedImage.naturalHeight || 24);
    const sourceX = ((racer.cachedImage.naturalWidth || sourceSize) - sourceSize) / 2;
    const sourceY = ((racer.cachedImage.naturalHeight || sourceSize) - sourceSize) / 2;
    ctx.drawImage(racer.cachedImage, sourceX, sourceY, sourceSize, sourceSize, -17, -17, 34, 34);
    ctx.restore();
  } else {
    ctx.fillStyle = "#104d97";
    ctx.font = '700 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(racer.name.charAt(0).toUpperCase(), 0, 6);
  }

  ctx.strokeStyle = "rgba(16, 77, 151, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-20, -20, 40, 40, 14);
  ctx.stroke();

  ctx.fillStyle = "#104d97";
  ctx.beginPath();
  ctx.arc(-18, 40, 11, 0, Math.PI * 2);
  ctx.arc(24, 40, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(timestamp) {
  drawBackground();
  state.racers.forEach((racer) => drawKart(racer, timestamp));

  if (state.winner) {
    ctx.fillStyle = "rgba(16, 77, 151, 0.88)";
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 220, 18, 440, 60, 18);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = '700 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(`${state.winner.name} leads next standup`, canvas.width / 2, 58);
  }
}

function animateRace(timestamp) {
  if (!state.raceStartTime) {
    state.raceStartTime = timestamp;
  }

  const previousTime = animateRace.previousTime ?? timestamp;
  const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
  animateRace.previousTime = timestamp;

  if (state.raceInProgress) {
    updateRace(deltaSeconds, timestamp);
    const liveLeader = getRaceLeader();
    if (liveLeader) {
      state.raceLeadDurations[liveLeader.id] = (state.raceLeadDurations[liveLeader.id] || 0) + deltaSeconds * 1000;
    }
    if (state.winner && !state.statsCommitted) {
      commitRaceStats();
    }
    if (timestamp - state.lastLeadCallout > 14000) {
      const leader = liveLeader;
      if (leader) {
        const leaderCall = leader.issueTimer > 0
          ? pickAnnouncerLine("commentaryIssueLead", leader.name)
          : pickAnnouncerLine("commentaryLead", leader.name);
        updateStatus(leaderCall, "Commentary");
        state.lastLeadCallout = timestamp;
      }
    }
  }

  drawScene(timestamp);

  if (state.raceInProgress) {
    state.animationId = requestAnimationFrame(animateRace);
  } else {
    animateRace.previousTime = null;
    state.animationId = null;
    drawScene(timestamp);
  }
}

function startRace() {
  const profiles = getSelectedProfiles();
  if (profiles.length < 2) {
    updateStatus("Save and select at least two racers to start a race.", "Race Control");
    winnerText.textContent = "Need more racers";
    return;
  }

  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }

  state.racers = createRacers(profiles);
  const { startX } = getTrackMetrics();
  state.racers.forEach((racer) => {
    racer.x = startX;
  });
  state.winner = null;
  state.raceInProgress = true;
  state.raceStartTime = 0;
  state.lastLeadCallout = 0;
  state.lastEventCallout = 0;
  state.raceLeadDurations = {};
  state.statsCommitted = false;
  animateRace.previousTime = null;
  raceButton.disabled = true;
  winnerText.textContent = "Photo finish pending";
  updateStatus(pickAnnouncerLine("raceStart", state.racers[0].name), "Race Start");
  state.animationId = requestAnimationFrame(animateRace);
}

function resetRace() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
  if (state.raceInProgress && !state.statsCommitted) {
    commitRaceStats();
  }
  animateRace.previousTime = null;
  resetRaceBoard();
}

async function saveRacer(event) {
  event.preventDefault();

  const name = racerNameInput.value.trim();
  if (!name) {
    return;
  }

  const file = racerImageInput.files[0];
  let image = "";
  const racerId = state.editingRacerId || crypto.randomUUID();

  if (state.editingRacerId) {
    image = state.savedRacers.find((racer) => racer.id === state.editingRacerId)?.image || "";
  }

  if (file) {
    const imageData = await readFileAsDataUrl(file);
    image = await uploadRacerImage(racerId, imageData, image);
  }

  if (state.editingRacerId) {
    state.savedRacers = state.savedRacers.map((racer) => (
      racer.id === state.editingRacerId ? { ...racer, name, image } : racer
    ));
    updateStatus(`${name} is tuned up and saved.`, "Garage");
  } else {
    const selectedCount = getSelectedProfiles().length;
    state.savedRacers.unshift({
      id: racerId,
      name,
      image,
      selected: selectedCount < maxRaceRacers,
      wins: 0,
      leadMs: 0,
    });
    updateStatus(`${name} joined the garage.`, "Garage");
  }

  state.savedRacers = state.savedRacers.slice(0, 24);
  await persistSavedRacers();
  clearForm();
  renderSavedRacers();
  if (!state.raceInProgress) {
    resetRaceBoard();
  }
}

async function shuffleGrid() {
  const selectedProfiles = getSelectedProfiles();
  if (selectedProfiles.length < 2) {
    updateStatus("Pick at least two saved racers before shuffling.", "Garage");
    return;
  }

  const selectedIds = new Set(selectedProfiles.map((racer) => racer.id));
  const shuffledSelected = shuffle(selectedProfiles);
  const parked = state.savedRacers.filter((racer) => !selectedIds.has(racer.id));
  state.savedRacers = [...shuffledSelected, ...parked];
  await persistSavedRacers();
  renderSavedRacers();
  resetRaceBoard(shuffledSelected);
}

racerForm.addEventListener("submit", (event) => {
  saveRacer(event).catch(() => {
    updateStatus("That image could not be saved.", "Garage");
  });
});
clearFormButton.addEventListener("click", clearForm);
raceButton.addEventListener("click", startRace);
resetButton.addEventListener("click", resetRace);
shuffleNamesButton.addEventListener("click", () => {
  shuffleGrid().catch(() => {
    updateStatus("The shuffled grid could not be saved to racers.json.", "Server");
  });
});
resetAllDataButton.addEventListener("click", () => {
  resetAllData().catch(() => {
    updateStatus("The racer reset could not be completed.", "Server");
  });
});

async function initializeApp() {
  try {
    state.savedRacers = await fetchSavedRacers();
  } catch (error) {
    state.savedRacers = normalizeRacers(seedRacers);
    updateStatus("Server data was unavailable, so the app loaded the default roster only.", "Server");
  }

  renderSavedRacers();
  renderFeed();
  resetRaceBoard();
}

initializeApp();
