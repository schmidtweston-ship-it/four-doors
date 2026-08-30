/* Four Doors — hold. One tap, then none. */
(function () {
  const HOLD_BED = {
    freq: 73,
    cutoff: 260,
    noise: 0.045,
    lfo: 0.035,
    pulse: 0,
    bpm: 48,
    dissonance: 0,
    fifth: true,
    wave: "sine"
  };

  let started = false;
  let wakeSentinel = null;

  const go = document.getElementById("hold-go");
  const after = document.getElementById("hold-after");
  const live = document.getElementById("hold-live");

  async function keepAwake() {
    try {
      if (!navigator.wakeLock || !navigator.wakeLock.request) return;
      wakeSentinel = await navigator.wakeLock.request("screen");
      if (wakeSentinel && wakeSentinel.addEventListener) {
        wakeSentinel.addEventListener("release", () => {
          wakeSentinel = null;
        });
      }
    } catch (e) { /* not allowed, fail silent */ }
  }

  async function resumeAudio() {
    try {
      if (window.FourAudio && FourAudio.unlock) await FourAudio.unlock();
    } catch (e) {}
  }

  async function startHold() {
    if (started) return;
    started = true;
    document.body.classList.add("running");
    go.setAttribute("aria-label", "Holding");
    go.setAttribute("tabindex", "-1");
    if (after) after.hidden = false;
    if (live) live.textContent = "Holding.";

    try {
      if (window.FourAudio) {
        await FourAudio.unlock();
        FourAudio.startBed(HOLD_BED);
      }
    } catch (e) {}

    keepAwake();
  }

  if (go) {
    go.addEventListener("click", startHold, { once: true });
    go.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startHold();
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (!started) return;
    resumeAudio();
    if (!wakeSentinel) keepAwake();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
