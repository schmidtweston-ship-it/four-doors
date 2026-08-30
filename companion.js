/* Four Doors — named partner. Attune, then lead. Count is the spine. */
(function (global) {
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function wantsHuman(text) {
    const t = text.toLowerCase();
    return /\b(help me|i need help|suicide|kill myself|end it|emergency|crisis|i want to die|hurt myself)\b/.test(t);
  }

  function wantsStop(text) {
    const t = text.toLowerCase();
    return /^(stop|enough|done|i'm done|im done|pause|quiet)$/.test(t.trim()) ||
      /\b(stop the count|turn it off|that's enough|thats enough)\b/.test(t);
  }

  function wantsDoor(text) {
    const t = text.toLowerCase();
    if (/\b(door 1|meet me|match)\b/.test(t)) return 1;
    if (/\b(door 2|take me there|out now|get me out)\b/.test(t)) return 2;
    if (/\b(door 3|body|tap|breath|pulse)\b/.test(t)) return 3;
    if (/\b(another door|different door|switch)\b/.test(t)) return "any";
    return null;
  }

  function attuneLines(name, here, there) {
    return [
      name + " is here.",
      "You're " + here + ". I'm with that.",
      "I'll keep the count. You don't have to talk.",
      "One, two, three, four. That's the whole thing.",
      there ? ("You named " + there + " as a direction. No rush.") : "We can stay on the count."
    ];
  }

  function leadLines(name, there) {
    return [
      "Still here.",
      "The count can hold the body while the rest catches up.",
      there ? (there + " can wait. Or we can lean that way. Your call.") : "Nothing to solve.",
      "You can stop. You can pick another door. I'm not going anywhere.",
      "In through the count. Out through the count.",
      "If words fail, stay with one. Two. Three. Four."
    ];
  }

  function replyTo(text, ctx) {
    const name = ctx.name || "Partner";
    const here = ctx.here || "here";
    const there = ctx.there || "";

    if (wantsHuman(text)) {
      return {
        kind: "human",
        line: "If you need a person, go find one. I'm a count on a screen."
      };
    }
    if (wantsStop(text)) {
      return { kind: "stop", line: "Okay. Stopping. The doors are still here." };
    }
    const door = wantsDoor(text);
    if (door === 1) return { kind: "door", door: 1, line: "Door 1 meets you at " + here + " first. I'll come with you if you want." };
    if (door === 2) return { kind: "door", door: 2, line: "Door 2 goes toward " + (there || "there") + " now. You can bail back." };
    if (door === 3) return { kind: "door", door: 3, line: "Door 3 is just your body. Tap, then we move the tempo." };
    if (door === "any") {
      return {
        kind: "suggest",
        line: "Door 1 meets you first. Door 2 goes there now. Door 3 is the body. This door is the count. You pick. I don't."
      };
    }

    const t = text.toLowerCase().trim();
    if (!t || /^(ok|okay|yeah|yes|k|mm|mhm|hmm)$/.test(t)) {
      return { kind: "hold", line: pick(["Mm.", "Still counting.", "I'm here.", "Keep the four."]) };
    }
    if (/\b(thank|thanks)\b/.test(t)) {
      return { kind: "hold", line: "You're doing the work. I'm just the count." };
    }
    if (/\b(faster|too slow|speed up)\b/.test(t)) {
      return { kind: "tempo", dir: 1, line: "We can walk it a little faster. Tap a new beat if you want." };
    }
    if (/\b(slower|too fast|slow down)\b/.test(t)) {
      return { kind: "tempo", dir: -1, line: "We can slow it. Tap a quieter beat. Or I can drop it a little." };
    }
    if (/\b(can't|cant|hard|hurt|heavy|wrecked|numb|angry|scared|afraid|lost)\b/.test(t)) {
      return {
        kind: "attune",
        line: pick([
          "I hear that. Stay on the next number. That's enough for this second.",
          "That's real. The count doesn't argue with it.",
          "You don't have to move that feeling. Just four beats."
        ])
      };
    }
    if (/\b(better|softer|easier|good|clearer)\b/.test(t)) {
      return { kind: "lead", line: there ? ("Good. " + there + " can be a little closer. We keep the count either way.") : "Good. We keep the count." };
    }
    if (/\b(who are you|what are you|are you real)\b/.test(t)) {
      return { kind: "hold", line: "I'm " + name + ". A presence you named. Not a doctor. Not a voice in the sky. A count you can walk with." };
    }
    if (/\b(what do i do|what now|help)\b/.test(t)) {
      return { kind: "lead", line: "Stay with the four. If you want out faster, door 2. If you want a match first, door 1. Nothing is pushed." };
    }

    return {
      kind: "attune",
      line: pick([
        "I hear you. I'll keep the numbers.",
        "Okay. One, two, three, four.",
        "We can talk. We can not talk. The count holds either way.",
        "That's enough to say. Back to the four."
      ])
    };
  }

  global.FourPartner = {
    attuneLines,
    leadLines,
    replyTo,
    wantsHuman,
    pick
  };
})(window);
