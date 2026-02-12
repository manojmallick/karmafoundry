// KarmaFoundry Bridge for GameMaker <-> React communication
(function () {
  window.KF = {
    _queue: [],
    _ready: false,

    markReady: function () {
      console.log("[KF] GameMaker marked ready");
      this._ready = true;
      window.parent.postMessage({ type: "READY" }, "*");
    },

    pop: function () {
      if (this._queue.length === 0) return null;
      const event = this._queue.shift();
      console.log("[KF] Popped event:", event);
      return JSON.stringify(event);
    },

    _push: function (event) {
      console.log("[KF] Received event:", event);
      this._queue.push(event);
    },
  };

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type) {
      window.KF._push(e.data);
    }
  });

  setTimeout(function () {
    window.KF.markReady();
  }, 1000);

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "BOOST_APPLIED") {
      var placeholder = document.getElementById("placeholder");
      if (placeholder) {
        placeholder.style.transform = "scale(1.2)";
        setTimeout(function () {
          placeholder.style.transform = "scale(1)";
        }, 300);
      }
      console.log("[KF] BOOST_APPLIED received:", e.data.payload);
    }

    if (e.data && e.data.type === "REWARD_CLAIMED") {
      var placeholder = document.getElementById("placeholder");
      if (placeholder) {
        placeholder.style.background = "radial-gradient(circle, #f5af19, #f12711, #1a1a2e)";
        placeholder.style.transform = "scale(1.3)";
        setTimeout(function () {
          placeholder.style.transform = "scale(1)";
          placeholder.style.background = "";
        }, 800);
      }
      console.log("[KF] REWARD_CLAIMED received:", e.data.payload);
    }

    if (e.data && e.data.type === "CINEMATIC_START") {
      console.log("[KF] CINEMATIC_START received");
      if (window.gmTrigger) window.gmTrigger("cinematic_start");
    }

    if (e.data && e.data.type === "CINEMATIC_VICTORY") {
      console.log("[KF] CINEMATIC_VICTORY received");
      if (window.gmTrigger) window.gmTrigger("cinematic_victory");
    }

    if (e.data && e.data.type === "CINEMATIC_END") {
      console.log("[KF] CINEMATIC_END received");
      if (window.gmTrigger) window.gmTrigger("cinematic_end");
    }
  });
})();
