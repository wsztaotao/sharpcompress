/* 页面级动效：速度线、脉冲、跑马灯 */
(function () {
  "use strict";

  /* Parallax light streaks on mouse move (desktop) */
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

  /* Marquee duplication for seamless loop */
  document.querySelectorAll("[data-marquee]").forEach(function (track) {
    var content = track.innerHTML;
    track.innerHTML = content + content;
  });

  /* Task filter chips (demo) */
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

  /* Live pulse clock */
  var live = document.querySelector("[data-live-clock]");
  if (live) {
    function tick() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, "0");
      var m = String(now.getMinutes()).padStart(2, "0");
      var s = String(now.getSeconds()).padStart(2, "0");
      live.textContent = h + ":" + m + ":" + s;
    }
    tick();
    setInterval(tick, 1000);
  }
})();
