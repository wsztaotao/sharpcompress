/* 页面级动效增强 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-parallax]");
  if (stage && window.matchMedia("(pointer:fine)").matches) {
    stage.addEventListener("mousemove", function (e) {
      var rect = stage.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
      var y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
      stage.style.setProperty("--px", x.toFixed(2) + "px");
      stage.style.setProperty("--py", y.toFixed(2) + "px");
    });
  }

  document.querySelectorAll("[data-marquee]").forEach(function (track) {
    var content = track.innerHTML;
    track.innerHTML = content + content;
  });

  document.querySelectorAll("[data-filter-group]").forEach(function (group) {
    var chips = group.querySelectorAll("[data-filter]");
    var items = document.querySelectorAll(group.getAttribute("data-filter-group"));
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("is-active");
        });
        chip.classList.add("is-active");
        var key = chip.getAttribute("data-filter");
        items.forEach(function (item) {
          var show = key === "all" || item.getAttribute("data-tag") === key;
          item.style.display = show ? "" : "none";
        });
      });
    });
  });

  document.querySelectorAll("[data-live-clock]").forEach(function (live) {
    function tick() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, "0");
      var m = String(now.getMinutes()).padStart(2, "0");
      var s = String(now.getSeconds()).padStart(2, "0");
      live.textContent = h + ":" + m + ":" + s;
    }
    tick();
    setInterval(tick, 1000);
  });

  /* 8-step flow: sequential highlight */
  document.querySelectorAll("[data-flow-steps]").forEach(function (flow) {
    var steps = flow.querySelectorAll("[data-step]");
    if (!steps.length) return;
    var i = 0;
    function activate() {
      steps.forEach(function (s, idx) {
        s.classList.toggle("is-on", idx === i);
        s.classList.toggle("is-done", idx < i);
      });
      i = (i + 1) % steps.length;
    }
    activate();
    setInterval(activate, 1600);
  });

  /* Progress bars in outcome panels */
  document.querySelectorAll("[data-progress]").forEach(function (bar) {
    var target = Number(bar.getAttribute("data-progress") || 0);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          bar.style.width = target + "%";
          io.unobserve(bar);
        });
      }, { threshold: 0.3 });
      io.observe(bar);
    } else {
      bar.style.width = target + "%";
    }
  });

  /* Stagger children when parent becomes visible */
  document.querySelectorAll("[data-stagger]").forEach(function (parent) {
    var kids = parent.children;
    Array.prototype.forEach.call(kids, function (kid, idx) {
      kid.style.transitionDelay = idx * 0.08 + "s";
    });
  });
})();
