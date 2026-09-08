/**
 * 软件快响 · Three.js 三维动效
 * 设计原则：Three.js 只负责空间视觉；数值/文案留在 DOM，方便接口刷新。
 *
 * 对外 API（window.KuaiXiang3D）：
 *   updateMetric(key, value, opts?)  // 更新单个指标数字
 *   updateMetrics(map)               // 批量更新 { tasks: 621, ... }
 *   setFlowStep(index)               // 高亮第 N 步（0-7）
 *   refresh()                        // 窗口尺寸变化后重排
 */
(function (global) {
  "use strict";

  if (!global.THREE) {
    console.warn("[KuaiXiang3D] THREE 未加载");
    return;
  }

  var THREE = global.THREE;
  var scenes = [];
  var metricMap = {};
  var flowControllers = [];
  var reducedMotion = false;

  try {
    reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function parseColor(css, fallback) {
    var c = new THREE.Color(fallback || 0x0088ff);
    try {
      if (css) c.set(css);
    } catch (e) {}
    return c;
  }

  function makeRenderer(canvas, alpha) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: !!alpha,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, alpha ? 0 : 1);
    return renderer;
  }

  function resizeRenderer(renderer, camera, host) {
    var w = host.clientWidth || 1;
    var h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    } else {
      var aspect = w / h;
      var frustum = camera.userData.frustum || 6;
      camera.left = -frustum * aspect;
      camera.right = frustum * aspect;
      camera.top = frustum;
      camera.bottom = -frustum;
      camera.updateProjectionMatrix();
    }
    return { w: w, h: h };
  }

  function projectToOverlay(obj, camera, host) {
    var v = new THREE.Vector3();
    obj.getWorldPosition(v);
    v.project(camera);
    var x = (v.x * 0.5 + 0.5) * host.clientWidth;
    var y = (-v.y * 0.5 + 0.5) * host.clientHeight;
    var visible = v.z < 1;
    return { x: x, y: y, visible: visible };
  }

  function glowMat(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.35 : opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  function lineMat(color) {
    return new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.65,
    });
  }

  /* ---------- Metrics: orbit platforms ---------- */
  function createMetricsOrbit(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var overlays = host.querySelectorAll("[data-metric]");
    if (!canvas || !overlays.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9.2);
    camera.lookAt(0, 0, 0);

    var blue = parseColor(getComputedStyle(document.documentElement).getPropertyValue("--blue").trim(), 0x0088ff);
    var cyan = parseColor(getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim(), 0x00d4ff);

    var root = new THREE.Group();
    scene.add(root);

    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.03, 12, 96),
      new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.45 })
    );
    ring.rotation.x = Math.PI / 2.35;
    root.add(ring);

    var ring2 = ring.clone();
    ring2.scale.set(1.25, 1.25, 1.25);
    ring2.material = glowMat(blue, 0.2);
    root.add(ring2);

    var anchors = [];
    var n = overlays.length;
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      var g = new THREE.Group();
      g.position.set(Math.cos(angle) * 3.4, Math.sin(angle) * 0.35, Math.sin(angle) * 3.4);

      var base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 0.12, 6),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: blue,
          emissiveIntensity: 0.35,
          metalness: 0.6,
          roughness: 0.35,
        })
      );
      g.add(base);

      var halo = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), glowMat(cyan, 0.4));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.1;
      g.add(halo);

      var beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
        new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.35 })
      );
      beam.position.y = 0.8;
      g.add(beam);

      root.add(g);
      anchors.push({ group: g, el: overlays[i], key: overlays[i].getAttribute("data-metric") });
      if (anchors[i].key) metricMap[anchors[i].key] = overlays[i];
    }

    var light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(4, 8, 6);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x88bbff, 0.55));

    var particles = new THREE.Points(
      (function () {
        var geo = new THREE.BufferGeometry();
        var count = 80;
        var pos = new Float32Array(count * 3);
        for (var p = 0; p < count; p++) {
          pos[p * 3] = (Math.random() - 0.5) * 10;
          pos[p * 3 + 1] = (Math.random() - 0.5) * 4;
          pos[p * 3 + 2] = (Math.random() - 0.5) * 10;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return geo;
      })(),
      new THREE.PointsMaterial({ color: cyan, size: 0.05, transparent: true, opacity: 0.7 })
    );
    scene.add(particles);

    var state = {
      type: "metrics-orbit",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      anchors: anchors,
      particles: particles,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      anchors.forEach(function (a) {
        var p = projectToOverlay(a.group, camera, host);
        a.el.style.transform = "translate(-50%, -50%) translate(" + p.x + "px," + p.y + "px)";
        a.el.style.opacity = p.visible ? "1" : "0";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.25;
        ring.rotation.z += dt * 0.15;
        particles.rotation.y -= dt * 0.05;
        anchors.forEach(function (a, idx) {
          a.group.position.y = Math.sin(state.t * 1.4 + idx) * 0.18;
        });
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Metrics: rising columns (template B) ---------- */
  function createMetricsColumns(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var overlays = host.querySelectorAll("[data-metric]");
    if (!canvas || !overlays.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 3.2, 11);
    camera.lookAt(0, 1.2, 0);

    var blue = parseColor(null, 0x0088ff);
    var cyan = parseColor(null, 0x00d4ff);
    var root = new THREE.Group();
    scene.add(root);

    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshBasicMaterial({ color: 0x0a2548, transparent: true, opacity: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var anchors = [];
    var n = overlays.length;
    var span = 7.5;
    for (var i = 0; i < n; i++) {
      var x = -span / 2 + (span / (n - 1 || 1)) * i;
      var g = new THREE.Group();
      g.position.set(x, 0, 0);
      var h = 1.4 + (i % 3) * 0.45;
      var col = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, h, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0x0d3a6e,
          emissive: blue,
          emissiveIntensity: 0.4,
          metalness: 0.55,
          roughness: 0.3,
        })
      );
      col.position.y = h / 2;
      g.add(col);
      var cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.08, 0.85),
        new THREE.MeshBasicMaterial({ color: cyan })
      );
      cap.position.y = h + 0.05;
      g.add(cap);
      root.add(g);
      anchors.push({ group: g, el: overlays[i], key: overlays[i].getAttribute("data-metric"), col: col, baseH: h });
      if (anchors[i].key) metricMap[anchors[i].key] = overlays[i];
    }

    scene.add(new THREE.AmbientLight(0x99ccff, 0.6));
    var dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(3, 6, 4);
    scene.add(dl);

    var state = {
      type: "metrics-columns",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      anchors: anchors,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      anchors.forEach(function (a) {
        var v = new THREE.Vector3(0, a.baseH + 0.55, 0);
        a.group.localToWorld(v);
        v.project(camera);
        var x = (v.x * 0.5 + 0.5) * host.clientWidth;
        var y = (-v.y * 0.5 + 0.5) * host.clientHeight;
        a.el.style.transform = "translate(-50%, -100%) translate(" + x + "px," + y + "px)";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.35) * 0.12;
        anchors.forEach(function (a, idx) {
          var s = 1 + Math.sin(state.t * 1.6 + idx) * 0.04;
          a.col.scale.y = s;
          a.col.position.y = (a.baseH * s) / 2;
        });
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Metrics: hex hive (template C) ---------- */
  function createMetricsHive(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var overlays = host.querySelectorAll("[data-metric]");
    if (!canvas || !overlays.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 5.5, 8.5);
    camera.lookAt(0, 0, 0);

    var blue = parseColor(null, 0x0088ff);
    var cyan = parseColor(null, 0x00d4ff);
    var root = new THREE.Group();
    scene.add(root);

    var anchors = [];
    var layoutXY = [
      [0, 0],
      [-1.7, 1],
      [1.7, 1],
      [-1.7, -1],
      [1.7, -1],
    ];
    for (var i = 0; i < overlays.length; i++) {
      var xy = layoutXY[i] || [i - 2, 0];
      var g = new THREE.Group();
      g.position.set(xy[0] * 1.15, 0, xy[1] * 1.15);
      var hex = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.35, 6),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: blue,
          emissiveIntensity: 0.45,
          metalness: 0.5,
          roughness: 0.28,
        })
      );
      g.add(hex);
      var rim = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 6), glowMat(cyan, 0.5));
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.2;
      g.add(rim);
      root.add(g);
      anchors.push({ group: g, el: overlays[i], key: overlays[i].getAttribute("data-metric") });
      if (anchors[i].key) metricMap[anchors[i].key] = overlays[i];
    }

    scene.add(new THREE.AmbientLight(0xaaccff, 0.55));
    var dl = new THREE.DirectionalLight(0xffffff, 1.05);
    dl.position.set(2, 6, 3);
    scene.add(dl);

    var state = {
      type: "metrics-hive",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      anchors: anchors,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      anchors.forEach(function (a) {
        var p = projectToOverlay(a.group, camera, host);
        a.el.style.transform = "translate(-50%, -50%) translate(" + p.x + "px," + p.y + "px)";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.2;
        anchors.forEach(function (a, idx) {
          a.group.position.y = Math.sin(state.t * 1.5 + idx * 0.8) * 0.15;
        });
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Flow: orbital 8 nodes (A) ---------- */
  function createFlowRing(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 6.5, 10);
    camera.lookAt(0, 0, 0);

    var blue = parseColor(null, 0x0088ff);
    var cyan = parseColor(null, 0x00d4ff);
    var root = new THREE.Group();
    scene.add(root);

    var curvePts = [];
    var nodes = [];
    var count = steps.length;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 - Math.PI / 2;
      var x = Math.cos(a) * 3.6;
      var z = Math.sin(a) * 3.6;
      curvePts.push(new THREE.Vector3(x, 0, z));
    }
    curvePts.push(curvePts[0].clone());
    var curve = new THREE.CatmullRomCurve3(curvePts, true);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.035, 8, true),
      new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.55 })
    );
    root.add(tube);

    for (var j = 0; j < count; j++) {
      var g = new THREE.Group();
      var pos = curvePts[j];
      g.position.copy(pos);
      var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: blue,
          emissiveIntensity: 0.3,
          metalness: 0.4,
          roughness: 0.35,
        })
      );
      g.add(core);
      var shell = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), glowMat(cyan, 0.2));
      g.add(shell);
      root.add(g);
      nodes.push({ group: g, core: core, shell: shell, el: steps[j] });
    }

    var energy = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    root.add(energy);

    scene.add(new THREE.AmbientLight(0x99bbff, 0.6));
    var dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(4, 8, 2);
    scene.add(dl);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          var done = i < ctrl.index;
          n.core.material.emissiveIntensity = on ? 0.95 : done ? 0.55 : 0.25;
          n.shell.material.opacity = on ? 0.55 : 0.15;
          n.el.classList.toggle("is-on", on);
          n.el.classList.toggle("is-done", done);
        });
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var state = {
      type: "flow-ring",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      nodes: nodes,
      energy: energy,
      curve: curve,
      ctrl: ctrl,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      nodes.forEach(function (n) {
        var p = projectToOverlay(n.group, camera, host);
        n.el.style.transform = "translate(-50%, -50%) translate(" + p.x + "px," + p.y + "px)";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.12;
        var u = (state.t * 0.08) % 1;
        var ep = curve.getPointAt(u);
        energy.position.copy(ep);
        energy.position.y += 0.15;
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Flow: serpentine (B) ---------- */
  function createFlowSerpentine(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 7.5, 9);
    camera.lookAt(0, 0, 0);

    var blue = parseColor(null, 0x0088ff);
    var cyan = parseColor(null, 0x00d4ff);
    var root = new THREE.Group();
    scene.add(root);

    var pts = [];
    var nodes = [];
    var count = steps.length;
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / 4);
      var col = i % 4;
      if (row % 2 === 1) col = 3 - col;
      var x = -3.6 + col * 2.4;
      var z = -1.6 + row * 3.2;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    var curve = new THREE.CatmullRomCurve3(pts, false);
    root.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 100, 0.04, 8, false),
        new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.5 })
      )
    );

    for (var j = 0; j < count; j++) {
      var g = new THREE.Group();
      g.position.copy(pts[j]);
      var box = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: blue,
          emissiveIntensity: 0.3,
          metalness: 0.5,
          roughness: 0.3,
        })
      );
      g.add(box);
      root.add(g);
      nodes.push({ group: g, core: box, el: steps[j] });
    }

    scene.add(new THREE.AmbientLight(0x99bbff, 0.55));
    var dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(3, 7, 4);
    scene.add(dl);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          n.core.material.emissiveIntensity = on ? 1 : i < ctrl.index ? 0.55 : 0.25;
          n.el.classList.toggle("is-on", on);
          n.el.classList.toggle("is-done", i < ctrl.index);
        });
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var energy = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    root.add(energy);

    var state = {
      type: "flow-serpentine",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      nodes: nodes,
      energy: energy,
      curve: curve,
      ctrl: ctrl,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      nodes.forEach(function (n) {
        var p = projectToOverlay(n.group, camera, host);
        n.el.style.transform = "translate(-50%, -50%) translate(" + p.x + "px," + p.y + "px)";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.25) * 0.08;
        var u = (state.t * 0.07) % 1;
        energy.position.copy(curve.getPointAt(u));
        energy.position.y = 0.35;
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Flow: vertical rail (C) ---------- */
  function createFlowRail(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(5.5, 0, 11);
    camera.lookAt(-0.5, 0, 0);

    var blue = parseColor(null, 0x0088ff);
    var cyan = parseColor(null, 0x00d4ff);
    var root = new THREE.Group();
    scene.add(root);

    var count = steps.length;
    var nodes = [];
    var rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, count * 1.15, 12),
      new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.55 })
    );
    rail.position.set(-1.2, 0, 0);
    root.add(rail);

    for (var i = 0; i < count; i++) {
      var y = ((count - 1) / 2 - i) * 1.15;
      var g = new THREE.Group();
      g.position.set(-1.2, y, 0);
      var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 14, 14),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: blue,
          emissiveIntensity: 0.3,
          metalness: 0.45,
          roughness: 0.32,
        })
      );
      g.add(core);
      var arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.45 })
      );
      arm.position.x = 0.8;
      g.add(arm);
      var plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.55, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x0d3a6e, emissive: blue, emissiveIntensity: 0.2, metalness: 0.4, roughness: 0.4 })
      );
      plate.position.x = 1.55;
      g.add(plate);
      root.add(g);
      nodes.push({ group: g, core: core, plate: plate, el: steps[i] });
    }

    scene.add(new THREE.AmbientLight(0x99bbff, 0.55));
    var dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(4, 3, 6);
    scene.add(dl);

    var energy = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    energy.position.set(-1.2, ((count - 1) / 2) * 1.15, 0);
    root.add(energy);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          n.core.material.emissiveIntensity = on ? 1 : i < ctrl.index ? 0.55 : 0.22;
          n.plate.material.emissiveIntensity = on ? 0.7 : 0.15;
          n.el.classList.toggle("is-on", on);
          n.el.classList.toggle("is-done", i < ctrl.index);
        });
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var state = {
      type: "flow-rail",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      nodes: nodes,
      energy: energy,
      ctrl: ctrl,
      active: false,
      t: 0,
      count: count,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
      nodes.forEach(function (n) {
        var p = projectToOverlay(n.plate || n.group, camera, host);
        n.el.style.transform = "translate(0, -50%) translate(" + p.x + "px," + p.y + "px)";
      });
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.3) * 0.1;
        var span = (count - 1) * 1.15;
        var y = ((count - 1) / 2) * 1.15 - ((state.t * 0.7) % (span + 0.01));
        energy.position.y = y;
      }
      layout();
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Hero ambient field ---------- */
  function createHeroField(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    if (!canvas) return null;
    var renderer = makeRenderer(canvas, true);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 6;

    var cyan = parseColor(null, 0x00d4ff);
    var geo = new THREE.BufferGeometry();
    var count = 120;
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var points = new THREE.Points(geo, new THREE.PointsMaterial({ color: cyan, size: 0.04, transparent: true, opacity: 0.75 }));
    scene.add(points);

    var torus = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.1, 0.28, 120, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0a3a6e,
        emissive: 0x0088ff,
        emissiveIntensity: 0.4,
        metalness: 0.7,
        roughness: 0.25,
        wireframe: false,
      })
    );
    scene.add(torus);
    scene.add(new THREE.AmbientLight(0x88aaff, 0.7));
    var dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(3, 4, 5);
    scene.add(dl);

    var state = {
      type: "hero-field",
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      torus: torus,
      points: points,
      active: false,
      t: 0,
    };

    function layout() {
      resizeRenderer(renderer, camera, host);
    }

    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        torus.rotation.x += dt * 0.35;
        torus.rotation.y += dt * 0.45;
        points.rotation.y -= dt * 0.08;
      }
      renderer.render(scene, camera);
    }

    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ---------- Boot ---------- */
  function observe(state) {
    function activate(on) {
      state.active = on;
      if (on && state.layout) state.layout();
      if (on && state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
      }
    }
    if (!("IntersectionObserver" in global)) {
      activate(true);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          activate(entry.isIntersecting);
        });
      },
      { threshold: 0.05, rootMargin: "80px 0px" }
    );
    io.observe(state.host);
    // 首屏立即尝试激活，避免首帧尺寸为 0
    requestAnimationFrame(function () {
      var rect = state.host.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < (global.innerHeight || 800)) {
        activate(true);
      }
      if (state.layout) state.layout();
    });
  }

  function boot() {
    document.querySelectorAll("[data-fx3d]").forEach(function (host) {
      var kind = host.getAttribute("data-fx3d");
      var state = null;
      if (kind === "metrics-orbit") state = createMetricsOrbit(host);
      else if (kind === "metrics-columns") state = createMetricsColumns(host);
      else if (kind === "metrics-hive") state = createMetricsHive(host);
      else if (kind === "flow-ring") state = createFlowRing(host);
      else if (kind === "flow-serpentine") state = createFlowSerpentine(host);
      else if (kind === "flow-rail") state = createFlowRail(host);
      else if (kind === "hero-field") state = createHeroField(host);
      if (state) {
        scenes.push(state);
        observe(state);
      }
    });

    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      scenes.forEach(function (s) {
        if (s.tick) s.tick(dt);
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    global.addEventListener(
      "resize",
      function () {
        scenes.forEach(function (s) {
          if (s.layout) s.layout();
        });
      },
      { passive: true }
    );

    // auto step advance for flows
    if (!reducedMotion && flowControllers.length) {
      var fi = 0;
      setInterval(function () {
        fi = (fi + 1) % 8;
        flowControllers.forEach(function (c) {
          c.setStep(fi);
        });
      }, 1600);
    }
  }

  function setTextValue(el, value, opts) {
    if (!el) return;
    opts = opts || {};
    var numEl = el.querySelector("[data-count]") || el.querySelector("strong") || el;
    var decimals = opts.decimals != null ? opts.decimals : Number(numEl.getAttribute("data-decimals") || 0);
    var suffix = opts.suffix != null ? opts.suffix : numEl.getAttribute("data-suffix") || "";
    numEl.setAttribute("data-count", value);
    if (decimals) numEl.setAttribute("data-decimals", String(decimals));
    if (suffix) numEl.setAttribute("data-suffix", suffix);
    var n = Number(value);
    numEl.textContent = (decimals > 0 ? n.toFixed(decimals) : Math.floor(n).toLocaleString("zh-CN")) + suffix;
  }

  global.KuaiXiang3D = {
    updateMetric: function (key, value, opts) {
      setTextValue(metricMap[key], value, opts);
    },
    updateMetrics: function (map) {
      Object.keys(map || {}).forEach(function (k) {
        var v = map[k];
        if (v && typeof v === "object") setTextValue(metricMap[k], v.value, v);
        else setTextValue(metricMap[k], v);
      });
    },
    setFlowStep: function (index) {
      flowControllers.forEach(function (c) {
        c.setStep(index);
      });
    },
    refresh: function () {
      scenes.forEach(function (s) {
        if (s.layout) s.layout();
      });
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
