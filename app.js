/* Four Doors — setup, home, four walks. Door 4 is the count. */
(function () {
  const KEY = "four-doors-v1";
  const IDB_NAME = "four-doors";
  const IDB_STORE = "count-samples";

  const HERE = [
    { id: "wrecked", label: "wrecked", c1: "#3a1612", c2: "#1a0c0a" },
    { id: "flat", label: "flat", c1: "#2a2c30", c2: "#141618" },
    { id: "spinning", label: "spinning", c1: "#4a2e10", c2: "#1c1208" },
    { id: "heavy", label: "heavy", c1: "#2a2018", c2: "#100c0a" },
    { id: "numb", label: "numb", c1: "#2c3034", c2: "#16181a" },
    { id: "angry", label: "angry", c1: "#5a1c14", c2: "#1e0a08" },
    { id: "wired", label: "wired", c1: "#3a3410", c2: "#161408" },
    { id: "okay-but", label: "okay-but", c1: "#2a2a18", c2: "#14140c" }
  ];
  const THERE = [
    { id: "steady", label: "steady", c1: "#1c2c28", c2: "#0c1614" },
    { id: "able", label: "able to get up", c1: "#3a2a14", c2: "#181208" },
    { id: "sleep", label: "sleep", c1: "#14182a", c2: "#080a14" },
    { id: "clear", label: "clear", c1: "#1c2830", c2: "#0c1418" },
    { id: "held", label: "held", c1: "#2c1c1c", c2: "#140c0c" },
    { id: "moving", label: "moving", c1: "#1c2a1c", c2: "#0c140c" }
  ];

  const DEFAULT_SAFETY = "This is a walk, not a treatment. You can stop. You can pick another door.";

  const BED = {
    wrecked: { freq: 110, cutoff: 360, noise: 0.12, lfo: 0.05, pulse: 0.2, bpm: 48, dissonance: 0.8, fifth: false, wave: "triangle" },
    flat: { freq: 98, cutoff: 280, noise: 0.04, lfo: 0.03, pulse: 0, bpm: 44, dissonance: 0, fifth: true, wave: "sine" },
    spinning: { freq: 146, cutoff: 720, noise: 0.14, lfo: 0.28, pulse: 0.6, bpm: 104, dissonance: 0.5, fifth: true, wave: "sine" },
    heavy: { freq: 73, cutoff: 300, noise: 0.1, lfo: 0.04, pulse: 0.25, bpm: 50, dissonance: 0.3, fifth: false, wave: "triangle" },
    numb: { freq: 130, cutoff: 420, noise: 0.03, lfo: 0.02, pulse: 0, bpm: 52, dissonance: 0, fifth: true, wave: "sine" },
    angry: { freq: 155, cutoff: 900, noise: 0.16, lfo: 0.12, pulse: 0.7, bpm: 92, dissonance: 1, fifth: false, wave: "sawtooth" },
    wired: { freq: 196, cutoff: 1100, noise: 0.1, lfo: 0.2, pulse: 0.8, bpm: 120, dissonance: 0.4, fifth: true, wave: "sine" },
    "okay-but": { freq: 174, cutoff: 640, noise: 0.06, lfo: 0.07, pulse: 0.3, bpm: 72, dissonance: 0.15, fifth: true, wave: "sine" },
    steady: { freq: 130, cutoff: 620, noise: 0.05, lfo: 0.06, pulse: 0.25, bpm: 70, dissonance: 0, fifth: true, wave: "sine" },
    able: { freq: 196, cutoff: 860, noise: 0.06, lfo: 0.08, pulse: 0.4, bpm: 88, dissonance: 0, fifth: true, wave: "sine" },
    sleep: { freq: 65, cutoff: 240, noise: 0.04, lfo: 0.03, pulse: 0, bpm: 48, dissonance: 0, fifth: false, wave: "sine" },
    clear: { freq: 261, cutoff: 1400, noise: 0.03, lfo: 0.05, pulse: 0.15, bpm: 80, dissonance: 0, fifth: true, wave: "sine" },
    held: { freq: 110, cutoff: 500, noise: 0.05, lfo: 0.04, pulse: 0.2, bpm: 60, dissonance: 0, fifth: true, wave: "sine" },
    moving: { freq: 174, cutoff: 780, noise: 0.07, lfo: 0.1, pulse: 0.45, bpm: 96, dissonance: 0, fifth: true, wave: "sine" }
  };

  function defaults() {
    return {
      version: 1,
      setupDone: false,
      userName: "",
      companionName: "Partner",
      safety: DEFAULT_SAFETY,
      count: {
        tempo: "steady",
        tone: "warm",
        numberSize: "present",
        speak: false
      },
      hereStates: HERE.map((s) => Object.assign({}, s, { trackTitle: "", trackUrl: "" })),
      thereStates: THERE.map((s) => Object.assign({}, s, { trackTitle: "", trackUrl: "" }))
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const d = defaults();
      const got = JSON.parse(raw);
      return Object.assign(d, got, {
        count: Object.assign(d.count, got.count || {}),
        hereStates: Array.isArray(got.hereStates) && got.hereStates.length ? got.hereStates : d.hereStates,
        thereStates: Array.isArray(got.thereStates) && got.thereStates.length ? got.thereStates : d.thereStates
      });
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();
  let hereId = state.hereStates[0].id;
  let thereId = state.thereStates[0].id;
  let door = 0;
  let walkTimer = null;
  let countHold = false;
  let taps = [];
  let attuneIdx = 0;
  let leadTimer = null;
  let trackEl = null;
  let recStream = null;
  let recMedia = null;
  const decodedSamples = [null, null, null, null];

  const $ = (id) => document.getElementById(id);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hexMix(a, b, t) {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const A = p(a), B = p(b);
    const r = (i) => Math.round(A[i] + (B[i] - A[i]) * t);
    return "#" + [r(0), r(1), r(2)].map((n) => n.toString(16).padStart(2, "0")).join("");
  }

  function findState(list, id) {
    return list.find((s) => s.id === id) || list[0];
  }
  function here() { return findState(state.hereStates, hereId); }
  function there() { return findState(state.thereStates, thereId); }

  function setColors(c1, c2) {
    document.documentElement.style.setProperty("--c1", c1);
    document.documentElement.style.setProperty("--c2", c2);
  }

  function applyCountSize() {
    const map = { quiet: "18vw", present: "28vw", huge: "42vw" };
    const w = { quiet: "400", present: "300", huge: "250" };
    document.documentElement.style.setProperty("--count-size", map[state.count.numberSize] || map.present);
    document.documentElement.style.setProperty("--count-weight", w[state.count.numberSize] || w.present);
  }

  function show(id) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.id === id));
  }

  function bedFor(s) {
    return Object.assign({ freq: 120, cutoff: 500, noise: 0.06, lfo: 0.06, pulse: 0.2, bpm: 64, dissonance: 0, fifth: true, wave: "sine" }, BED[s.id] || {});
  }

  async function playTrackOrBed(s, bedParams) {
    stopTrack();
    if (s.trackUrl) {
      try {
        trackEl = new Audio(s.trackUrl);
        trackEl.loop = true;
        trackEl.volume = 0.7;
        await trackEl.play();
        return;
      } catch (e) {
        stopTrack();
      }
    }
    FourAudio.startBed(bedParams || bedFor(s));
  }

  function stopTrack() {
    if (trackEl) {
      try { trackEl.pause(); } catch (e) {}
      trackEl = null;
    }
  }

  /* ---------- IndexedDB samples ---------- */
  function idb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function saveSample(i, blob) {
    const db = await idb();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(blob, "n" + i);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  }
  async function loadSamples() {
    try {
      const db = await idb();
      for (let i = 1; i <= 4; i++) {
        const blob = await new Promise((res) => {
          const tx = db.transaction(IDB_STORE, "readonly");
          const q = tx.objectStore(IDB_STORE).get("n" + i);
          q.onsuccess = () => res(q.result || null);
          q.onerror = () => res(null);
        });
        if (blob) {
          const buf = await blob.arrayBuffer();
          decodedSamples[i - 1] = await FourAudio.decodeSample(buf);
        }
      }
      FourAudio.setSamples(decodedSamples);
      paintRecButtons();
    } catch (e) {}
  }
  async function clearSamples() {
    decodedSamples[0] = decodedSamples[1] = decodedSamples[2] = decodedSamples[3] = null;
    FourAudio.setSamples(decodedSamples);
    try {
      const db = await idb();
      await new Promise((res) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch (e) {}
    paintRecButtons();
  }

  /* ---------- views ---------- */
  function goWelcome() { show("view-welcome"); }
  function goHome() {
    stopWalk();
    show("view-home");
    paintHome();
  }
  function goSetup() {
    stopWalk();
    show("view-setup");
    paintSetup();
  }
  function goAbout() {
    stopWalk();
    show("view-about");
  }

  function paintHome() {
    $("home-brand").textContent = "Four Doors";
    $("q-here").innerHTML = "";
    $("q-there").innerHTML = "";
    state.hereStates.forEach((s) => {
      const b = document.createElement("button");
      b.className = "chip" + (s.id === hereId ? " on" : "");
      b.type = "button";
      b.textContent = s.label;
      b.addEventListener("click", () => { hereId = s.id; setColors(s.c1, s.c2); paintHome(); });
      $("q-here").appendChild(b);
    });
    const hc = document.createElement("button");
    hc.className = "chip custom";
    hc.type = "button";
    hc.textContent = "type…";
    hc.addEventListener("click", () => addFree("here"));
    $("q-here").appendChild(hc);

    state.thereStates.forEach((s) => {
      const b = document.createElement("button");
      b.className = "chip" + (s.id === thereId ? " on" : "");
      b.type = "button";
      b.textContent = s.label;
      b.addEventListener("click", () => { thereId = s.id; paintHome(); });
      $("q-there").appendChild(b);
    });
    const tc = document.createElement("button");
    tc.className = "chip custom";
    tc.type = "button";
    tc.textContent = "type…";
    tc.addEventListener("click", () => addFree("there"));
    $("q-there").appendChild(tc);

    const name = state.companionName || "Partner";
    $("door4-title").textContent = "Walk with " + name;
    $("safety-line").textContent = state.safety || DEFAULT_SAFETY;
    setColors(here().c1, here().c2);
  }

  function addFree(kind) {
    const label = prompt(kind === "here" ? "Where are you, in your words?" : "Where do you want to go, in your words?");
    if (!label || !label.trim()) return;
    const id = "free-" + Date.now();
    const src = kind === "here" ? here() : there();
    const s = { id, label: label.trim(), c1: src.c1, c2: src.c2, trackTitle: "", trackUrl: "" };
    if (kind === "here") {
      state.hereStates.push(s);
      hereId = id;
    } else {
      state.thereStates.push(s);
      thereId = id;
    }
    save();
    paintHome();
  }

  function paintSetup() {
    $("set-user").value = state.userName;
    $("set-partner").value = state.companionName;
    $("set-safety").value = state.safety;
    $("set-speak").checked = !!state.count.speak;
    document.querySelectorAll("[data-tempo]").forEach((b) => b.classList.toggle("on", b.dataset.tempo === state.count.tempo));
    document.querySelectorAll("[data-tone]").forEach((b) => b.classList.toggle("on", b.dataset.tone === state.count.tone));
    document.querySelectorAll("[data-numsize]").forEach((b) => b.classList.toggle("on", b.dataset.numsize === state.count.numberSize));
    paintStates("here-list", state.hereStates, "here");
    paintStates("there-list", state.thereStates, "there");
    paintRecButtons();
    applyCountSize();
  }

  function paintStates(elId, list, kind) {
    const box = $(elId);
    box.innerHTML = "";
    list.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "state-row";
      const name = document.createElement("input");
      name.type = "text";
      name.className = "name";
      name.value = s.label;
      name.setAttribute("aria-label", "State name");
      name.addEventListener("change", () => { s.label = name.value.trim() || s.label; save(); });
      const c1 = document.createElement("input");
      c1.type = "color";
      c1.value = /^#/.test(s.c1) && s.c1.length === 7 ? s.c1 : "#2a1814";
      c1.addEventListener("input", () => { s.c1 = c1.value; save(); });
      const c2 = document.createElement("input");
      c2.type = "color";
      c2.value = /^#/.test(s.c2) && s.c2.length === 7 ? s.c2 : "#3d2a18";
      c2.addEventListener("input", () => { s.c2 = c2.value; save(); });
      const url = document.createElement("input");
      url.type = "url";
      url.placeholder = "track url (optional)";
      url.value = s.trackUrl || "";
      url.addEventListener("change", () => { s.trackUrl = url.value.trim(); save(); });
      const del = document.createElement("button");
      del.className = "iconbtn";
      del.type = "button";
      del.textContent = "×";
      del.setAttribute("aria-label", "Remove " + s.label);
      del.addEventListener("click", () => {
        if (list.length < 2) return;
        list.splice(i, 1);
        save();
        paintSetup();
      });
      row.append(name, c1, c2, del);
      const row2 = document.createElement("div");
      row2.className = "state-row";
      row2.appendChild(url);
      box.append(row, row2);
    });
  }

  function paintRecButtons() {
    for (let i = 1; i <= 4; i++) {
      const b = $("rec-" + i);
      if (!b) continue;
      b.classList.toggle("has", !!decodedSamples[i - 1]);
      b.querySelector(".st").textContent = decodedSamples[i - 1] ? "kept" : "tap to record";
    }
  }

  /* ---------- walks ---------- */
  function stopWalk() {
    if (walkTimer) { clearTimeout(walkTimer); walkTimer = null; }
    if (leadTimer) { clearInterval(leadTimer); leadTimer = null; }
    FourAudio.stopAll();
    stopTrack();
    countHold = false;
    taps = [];
    door = 0;
    document.body.classList.remove("in-walk");
  }

  function haltWalk() {
    if (walkTimer) { clearTimeout(walkTimer); walkTimer = null; }
    if (leadTimer) { clearInterval(leadTimer); leadTimer = null; }
    FourAudio.stopAll();
    stopTrack();
    countHold = false;
    taps = [];
  }

  async function enterDoor(n) {
    haltWalk();
    door = n;
    await FourAudio.unlock();
    setColors(here().c1, here().c2);
    $("bail").hidden = n !== 2;
    if (n === 4) return startDoor4();
    show("view-walk");
    $("walk-name").textContent = ["", "Meet me first", "Take me there", "Lock to my body"][n];
    $("walk-phase").textContent = "";
    $("tap-wrap").hidden = n !== 3;
    $("walk-title").textContent = here().label + " → " + there().label;
    if (n === 1) startDoor1();
    if (n === 2) startDoor2();
    if (n === 3) startDoor3();
  }

  function startDoor1() {
    const h = here(), t = there();
    setColors(h.c1, h.c2);
    $("walk-title").textContent = "Meeting you at " + h.label + ".";
    $("walk-phase").textContent = "Short match. Then we walk.";
    playTrackOrBed(h, bedFor(h));
    const matchMs = 22000;
    walkTimer = setTimeout(() => {
      $("walk-title").textContent = "Walking toward " + t.label + ".";
      $("walk-phase").textContent = "Don't linger. You can stop.";
      if (t.trackUrl && t.trackUrl !== h.trackUrl) {
        playTrackOrBed(t, bedFor(t));
      } else {
        FourAudio.vectorBed(bedFor(t), 100);
      }
      let step = 0;
      const steps = 16;
      const tick = () => {
        step += 1;
        const p = step / steps;
        setColors(hexMix(h.c1, t.c1, p), hexMix(h.c2, t.c2, p));
        if (step < steps) walkTimer = setTimeout(tick, 6000);
      };
      tick();
    }, matchMs);
  }

  function startDoor2() {
    const t = there();
    setColors(t.c1, t.c2);
    $("walk-title").textContent = "Here is " + t.label + ".";
    $("walk-phase").textContent = "When you need out now.";
    $("bail").hidden = false;
    playTrackOrBed(t, bedFor(t));
  }

  function startDoor3() {
    const h = here(), t = there();
    setColors(h.c1, h.c2);
    $("walk-title").textContent = "Tap with your breath. Or a pulse.";
    $("walk-phase").textContent = reduced()
      ? "Motion is quiet on this phone. Color will still shift."
      : "We'll lock your tempo, then walk it toward " + t.label + ".";
    taps = [];
    FourAudio.startBed(Object.assign(bedFor(h), { pulse: 0.15 }));
    $("tap-pad").textContent = "Tap";
  }

  function onBodyTap() {
    const nowt = Date.now();
    taps.push(nowt);
    taps = taps.filter((x) => nowt - x < 8000);
    $("tap-pad").classList.add("hit");
    setTimeout(() => $("tap-pad").classList.remove("hit"), 120);
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    if (taps.length < 3) {
      $("walk-phase").textContent = "Again. A few more.";
      return;
    }
    const iv = [];
    for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
    iv.sort((a, b) => a - b);
    const med = iv[Math.floor(iv.length / 2)];
    let bpm = 60000 / med;
    const asBreath = bpm < 40;
    const dest = there().id;
    let target;
    if (asBreath) {
      target = dest === "sleep" ? 7 : dest === "held" ? 8 : dest === "moving" || dest === "able" ? 14 : 11;
      bpm = Math.max(5, Math.min(30, bpm));
    } else {
      target = dest === "sleep" ? 56 : dest === "held" ? 64 : dest === "moving" || dest === "able" ? 88 : 72;
      bpm = Math.max(40, Math.min(140, bpm));
    }
    $("walk-title").textContent = "Locked at " + Math.round(bpm) + (asBreath ? " breaths" : "") + ".";
    $("walk-phase").textContent = "Walking toward " + Math.round(target) + ".";
    FourAudio.vectorBed(Object.assign(bedFor(there()), { bpm: target, pulse: reduced() ? 0 : 0.55 }), 90);
    const start = Date.now();
    const fromB = bpm, toB = target;
    const hc = here(), tc = there();
    if (walkTimer) clearTimeout(walkTimer);
    const pulse = () => {
      const p = Math.min(1, (Date.now() - start) / 90000);
      const cur = fromB + (toB - fromB) * p;
      setColors(hexMix(hc.c1, tc.c1, p), hexMix(hc.c2, tc.c2, p));
      if (!reduced()) {
        $("tap-pad").classList.add("hit");
        setTimeout(() => $("tap-pad").classList.remove("hit"), Math.min(200, 30000 / cur));
      }
      $("tap-pad").textContent = String(Math.round(cur));
      if (p < 1 && door === 3) walkTimer = setTimeout(pulse, 60000 / cur);
    };
    pulse();
  }

  /* ---------- door 4 ---------- */
  function startDoor4() {
    show("view-partner");
    applyCountSize();
    const name = state.companionName || "Partner";
    $("partner-name").textContent = name;
    $("count-num").textContent = "·";
    $("count-words").textContent = "";
    $("partner-line").textContent = name + " is here.";
    $("ready-tap").hidden = false;
    $("partner-talk").hidden = true;
    countHold = false;
    taps = [];
    attuneIdx = 0;
    const h = here();
    setColors(h.c1, h.c2);
    $("ready-tap").textContent = "Tap with me. We'll find a count.";
    FourAudio.setSamples(decodedSamples);
  }

  function partnerTap() {
    const nowt = Date.now();
    taps.push(nowt);
    taps = taps.filter((x) => nowt - x < 10000);
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
    if (taps.length < 4) {
      $("ready-tap").textContent = ["", "Again.", "Again.", "One more."][taps.length] || "Again.";
      return;
    }
    const iv = [];
    for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
    iv.sort((a, b) => a - b);
    const med = iv[Math.floor(iv.length / 2)];
    const range = FourAudioMeta.TEMPO_RANGE[state.count.tempo] || [48, 80];
    let bpm = 60000 / med;
    bpm = Math.max(range[0], Math.min(range[1], bpm));
    holdCount(bpm);
  }

  function holdCount(bpm) {
    countHold = true;
    $("ready-tap").hidden = true;
    $("partner-talk").hidden = false;
    const words = ["one", "two", "three", "four"];
    const h = here(), t = there();
    const start = Date.now();
    FourAudio.startCount({
      bpm,
      tone: state.count.tone,
      speak: state.count.speak,
      onBeat: (n) => {
        $("count-num").textContent = String(n);
        $("count-words").textContent = words[n - 1];
        const wash = $("partner-wash");
        if (!reduced()) {
          wash.classList.add("beat");
          $("count-num").classList.add("hit");
          setTimeout(() => {
            wash.classList.remove("beat");
            $("count-num").classList.remove("hit");
          }, 140);
        }
        try { if (navigator.vibrate) navigator.vibrate(n === 1 ? 16 : 8); } catch (e) {}
        const p = Math.min(1, (Date.now() - start) / 180000);
        setColors(hexMix(h.c1, t.c1, p * 0.65), hexMix(h.c2, t.c2, p * 0.65));
        if (n === 1) maybePartnerLine();
      }
    });
    sayPartner(FourPartner.attuneLines(state.companionName || "Partner", h.label, t.label)[0]);
  }

  function maybePartnerLine() {
    const lines = FourPartner.attuneLines(state.companionName || "Partner", here().label, there().label)
      .concat(FourPartner.leadLines(state.companionName || "Partner", there().label));
    attuneIdx += 1;
    if (attuneIdx === 1 || attuneIdx === 3 || attuneIdx === 8 || attuneIdx === 16) {
      const line = lines[Math.min(attuneIdx === 1 ? 1 : attuneIdx === 3 ? 2 : attuneIdx === 8 ? 4 : 5, lines.length - 1)];
      sayPartner(line);
    }
  }

  function sayPartner(line) {
    $("partner-line").textContent = line;
  }

  function onPartnerSay(text) {
    const r = FourPartner.replyTo(text, {
      name: state.companionName || "Partner",
      here: here().label,
      there: there().label
    });
    sayPartner(r.line);
    if (r.kind === "stop") { goHome(); return; }
    if (r.kind === "door") { enterDoor(r.door); return; }
    if (r.kind === "tempo") {
      const next = FourAudio.countBpm + (r.dir > 0 ? 6 : -6);
      FourAudio.setCountBpm(next);
    }
    if (r.kind === "human") {
      $("back-doors-note").hidden = false;
    }
  }

  /* ---------- record count ---------- */
  async function recordBeat(i) {
    const btn = $("rec-" + i);
    if (recMedia) {
      recMedia.stop();
      recMedia = null;
      return;
    }
    try {
      await FourAudio.unlock();
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const chunks = [];
      recMedia = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined);
      recMedia.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recMedia.onstop = async () => {
        recStream.getTracks().forEach((t) => t.stop());
        recStream = null;
        recMedia = null;
        btn.classList.remove("on");
        const blob = new Blob(chunks, { type: chunks[0] && chunks[0].type || "audio/webm" });
        await saveSample(i, blob);
        const buf = await blob.arrayBuffer();
        decodedSamples[i - 1] = await FourAudio.decodeSample(buf);
        FourAudio.setSamples(decodedSamples);
        paintRecButtons();
      };
      recMedia.start();
      btn.classList.add("on");
      btn.querySelector(".st").textContent = "recording… tap to stop";
    } catch (e) {
      btn.querySelector(".st").textContent = "mic blocked";
    }
  }

  /* ---------- wire ---------- */
  function readSetupFields() {
    state.userName = $("set-user").value.trim();
    state.companionName = $("set-partner").value.trim() || "Partner";
    state.safety = $("set-safety").value.trim() || DEFAULT_SAFETY;
    state.count.speak = $("set-speak").checked;
    state.setupDone = true;
    save();
  }

  function bind() {
    $("go-setup").addEventListener("click", goSetup);
    $("go-defaults").addEventListener("click", () => { state.setupDone = true; save(); goHome(); });
    $("home-setup").addEventListener("click", goSetup);
    $("home-about").addEventListener("click", goAbout);
    $("setup-done").addEventListener("click", () => { readSetupFields(); goHome(); });
    $("setup-home").addEventListener("click", () => { readSetupFields(); goHome(); });
    $("about-home").addEventListener("click", goHome);
    $("set-speak").addEventListener("change", () => { state.count.speak = $("set-speak").checked; save(); });
    document.querySelectorAll("[data-tempo]").forEach((b) => b.addEventListener("click", () => { state.count.tempo = b.dataset.tempo; save(); paintSetup(); }));
    document.querySelectorAll("[data-tone]").forEach((b) => b.addEventListener("click", () => { state.count.tone = b.dataset.tone; save(); paintSetup(); }));
    document.querySelectorAll("[data-numsize]").forEach((b) => b.addEventListener("click", () => { state.count.numberSize = b.dataset.numsize; applyCountSize(); save(); paintSetup(); }));
    $("add-here").addEventListener("click", () => {
      state.hereStates.push({ id: "h-" + Date.now(), label: "new here", c1: "#2a1814", c2: "#1a0c0a", trackTitle: "", trackUrl: "" });
      save(); paintSetup();
    });
    $("add-there").addEventListener("click", () => {
      state.thereStates.push({ id: "t-" + Date.now(), label: "new there", c1: "#1c2c28", c2: "#0c1614", trackTitle: "", trackUrl: "" });
      save(); paintSetup();
    });
    $("clear-rec").addEventListener("click", clearSamples);
    for (let i = 1; i <= 4; i++) {
      $("rec-" + i).addEventListener("click", () => recordBeat(i));
    }

    $("door-1").addEventListener("click", () => enterDoor(1));
    $("door-2").addEventListener("click", () => enterDoor(2));
    $("door-3").addEventListener("click", () => enterDoor(3));
    $("door-4").addEventListener("click", () => enterDoor(4));

    $("walk-stop").addEventListener("click", goHome);
    $("walk-mute").addEventListener("click", () => {
      FourAudio.setMuted(!FourAudio.muted);
      $("walk-mute").textContent = FourAudio.muted ? "Sound off" : "Sound";
    });
    $("bail").addEventListener("click", () => enterDoor(1));
    $("switch-1").addEventListener("click", () => enterDoor(1));
    $("switch-2").addEventListener("click", () => enterDoor(2));
    $("switch-3").addEventListener("click", () => enterDoor(3));
    $("switch-4").addEventListener("click", () => enterDoor(4));
    $("tap-pad").addEventListener("click", onBodyTap);

    $("partner-stop").addEventListener("click", goHome);
    $("partner-mute").addEventListener("click", () => {
      FourAudio.setMuted(!FourAudio.muted);
      $("partner-mute").textContent = FourAudio.muted ? "Sound off" : "Sound";
    });
    $("ready-tap").addEventListener("click", async () => {
      await FourAudio.unlock();
      partnerTap();
    });
    $("partner-send").addEventListener("click", sendTalk);
    $("partner-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); sendTalk(); }
    });
    $("p-switch-1").addEventListener("click", () => enterDoor(1));
    $("p-switch-2").addEventListener("click", () => enterDoor(2));
    $("p-switch-3").addEventListener("click", () => enterDoor(3));
  }

  function sendTalk() {
    const v = $("partner-input").value.trim();
    if (!v) return;
    $("partner-input").value = "";
    onPartnerSay(v);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  applyCountSize();
  bind();
  loadSamples();
  if (state.setupDone) goHome();
  else goWelcome();
})();
