/**
 * 软件快响 · Three.js 三维动效（仅用于标题区以下：动能指标 / 八步闭环）
 * 画布展示立体动画；数字在下方 DOM 数据条，便于接口接入。
 *
 * KuaiXiang3D.updateMetric(key, value, opts?)
 * KuaiXiang3D.updateMetrics(map)
 * KuaiXiang3D.setFlowStep(index) // 0-7
 */
(function (global) {
  "use strict";

  if (!global.THREE) {
    console.error("[KuaiXiang3D] THREE 未加载，请检查 js/vendor/three.min.js");
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

  function makeRenderer(canvas) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x041428, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace || undefined;
    return renderer;
  }

  function resize(renderer, camera, host) {
    var stage = host.querySelector(".fx3d-stage") || host;
    var w = Math.max(stage.clientWidth || host.clientWidth || 1, 1);
    var h = Math.max(stage.clientHeight || 320, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return { w: w, h: h };
  }

  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0x6699ff, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(5, 8, 6);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x00d4ff, 0.55);
    fill.position.set(-6, 3, -4);
    scene.add(fill);
    var point = new THREE.PointLight(0x3dadff, 1.2, 30);
    point.position.set(0, 4, 2);
    scene.add(point);
  }

  function makeGrid() {
    var grid = new THREE.GridHelper(14, 28, 0x0088ff, 0x0a3a6e);
    grid.position.y = -1.6;
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    return grid;
  }

  function makeParticles(count, spread) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.06, transparent: true, opacity: 0.85 })
    );
  }

  function curvePoint(curve, t, speed) {
    var u = (t * (speed || 0.1)) % 1;
    if (u < 0) u += 1;
    if (u > 0.9999) u = 0.9999;
    try {
      return curve.getPointAt(u);
    } catch (e) {
      return curve.getPoint(u);
    }
  }

  function bindMetrics(host) {
    host.querySelectorAll("[data-metric]").forEach(function (el) {
      var key = el.getAttribute("data-metric");
      if (key) metricMap[key] = el;
    });
  }

  /* ===== A: 动能轨道 ===== */
  function createMetricsOrbit(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    if (!canvas) return null;
    bindMetrics(host);

    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 5.2, 10.5);

    addLights(scene);
    scene.add(makeGrid());
    var particles = makeParticles(140, 12);
    scene.add(particles);

    var root = new THREE.Group();
    scene.add(root);

    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.18, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0a3a6e,
        emissive: 0x0088ff,
        emissiveIntensity: 0.25,
        metalness: 0.7,
        roughness: 0.25,
      })
    );
    disc.position.y = -0.2;
    root.add(disc);

    var torus = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.08, 16, 100),
      new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.2,
      })
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.2;
    root.add(torus);

    var torus2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.05, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0x3dadff, transparent: true, opacity: 0.7 })
    );
    torus2.rotation.x = Math.PI / 2.4;
    root.add(torus2);

    var pillars = [];
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      var g = new THREE.Group();
      g.position.set(Math.cos(a) * 3.5, 0.3, Math.sin(a) * 3.5);
      var pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 1.6 + (i % 3) * 0.35, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x0d4a8a,
          emissive: 0x0088ff,
          emissiveIntensity: 0.55,
          metalness: 0.65,
          roughness: 0.22,
        })
      );
      pillar.position.y = pillar.geometry.parameters.height / 2;
      g.add(pillar);
      var cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x00d4ff,
          emissiveIntensity: 1.2,
          metalness: 0.8,
          roughness: 0.15,
        })
      );
      cap.position.y = pillar.geometry.parameters.height + 0.35;
      g.add(cap);
      root.add(g);
      pillars.push({ g: g, pillar: pillar, cap: cap, h: pillar.geometry.parameters.height });
    }

    var core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 1),
      new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.9,
        metalness: 0.4,
        roughness: 0.2,
        wireframe: true,
      })
    );
    core.position.y = 1.2;
    root.add(core);

    var state = {
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      particles: particles,
      torus2: torus2,
      pillars: pillars,
      core: core,
      active: true,
      t: 0,
    };

    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.45;
        torus2.rotation.z += dt * 0.8;
        core.rotation.x += dt * 0.7;
        core.rotation.y += dt * 0.9;
        particles.rotation.y -= dt * 0.12;
        camera.position.x = Math.sin(state.t * 0.35) * 2.2;
        camera.position.y = 4.6 + Math.sin(state.t * 0.5) * 0.4;
        camera.lookAt(0, 0.6, 0);
        pillars.forEach(function (p, idx) {
          var s = 1 + Math.sin(state.t * 2 + idx) * 0.12;
          p.pillar.scale.y = s;
          p.pillar.position.y = (p.h * s) / 2;
          p.cap.position.y = p.h * s + 0.35;
          p.cap.rotation.y += dt * 1.5;
        });
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ===== B: 动能柱阵 ===== */
  function createMetricsColumns(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    if (!canvas) return null;
    bindMetrics(host);

    var renderer = makeRenderer(canvas);
    renderer.setClearColor(0x071a33, 1);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4.5, 12);
    addLights(scene);
    scene.add(makeGrid());

    var root = new THREE.Group();
    scene.add(root);
    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a2548, metalness: 0.6, roughness: 0.35, emissive: 0x003366, emissiveIntensity: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    root.add(floor);

    var cols = [];
    for (var i = 0; i < 5; i++) {
      var x = -4 + i * 2;
      var h = 2.2 + (i % 3) * 0.7;
      var mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, h, 1.1),
        new THREE.MeshStandardMaterial({
          color: 0x0d4a8a,
          emissive: 0x0088ff,
          emissiveIntensity: 0.5,
          metalness: 0.7,
          roughness: 0.2,
        })
      );
      mesh.position.set(x, h / 2 - 1.5, 0);
      root.add(mesh);
      var tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.7, 5),
        new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1 })
      );
      tip.position.set(x, h - 1.1, 0);
      root.add(tip);
      cols.push({ mesh: mesh, tip: tip, h: h, x: x });
    }

    var particles = makeParticles(100, 14);
    scene.add(particles);

    var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, cols: cols, particles: particles, active: true, t: 0 };
    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.4) * 0.35;
        camera.position.x = Math.sin(state.t * 0.3) * 1.5;
        camera.lookAt(0, 0, 0);
        cols.forEach(function (c, idx) {
          var s = 1 + Math.sin(state.t * 2.2 + idx * 0.9) * 0.18;
          c.mesh.scale.y = s;
          c.mesh.position.y = (c.h * s) / 2 - 1.5;
          c.tip.position.y = c.h * s - 1.1;
          c.tip.rotation.y += dt * 2;
        });
        particles.rotation.y -= dt * 0.1;
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ===== C: 蜂巢 ===== */
  function createMetricsHive(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    if (!canvas) return null;
    bindMetrics(host);

    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 7, 10);
    addLights(scene);
    scene.add(makeGrid());

    var root = new THREE.Group();
    scene.add(root);
    var cells = [];
    var spots = [
      [0, 0],
      [-2, 1.2],
      [2, 1.2],
      [-2, -1.2],
      [2, -1.2],
    ];
    for (var i = 0; i < 5; i++) {
      var g = new THREE.Group();
      g.position.set(spots[i][0], 0, spots[i][1]);
      var hex = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, 0.7, 6),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: 0x0088ff,
          emissiveIntensity: 0.55,
          metalness: 0.65,
          roughness: 0.22,
        })
      );
      g.add(hex);
      var rim = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.08, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, side: THREE.DoubleSide })
      );
      rim.position.y = 0.4;
      g.add(rim);
      root.add(g);
      cells.push(g);
    }

    var wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshBasicMaterial({ color: 0x3dadff, wireframe: true, transparent: true, opacity: 0.55 })
    );
    wire.position.y = 2.2;
    root.add(wire);

    var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, cells: cells, wire: wire, active: true, t: 0 };
    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.4;
        wire.rotation.x += dt * 0.6;
        wire.rotation.y += dt * 0.5;
        camera.position.x = Math.sin(state.t * 0.35) * 2;
        camera.lookAt(0, 0.5, 0);
        cells.forEach(function (c, idx) {
          c.position.y = Math.sin(state.t * 1.8 + idx) * 0.25;
          c.rotation.y += dt * 0.4;
        });
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  function syncFlowDom(steps, index) {
    steps.forEach(function (el, i) {
      el.classList.toggle("is-on", i === index);
      el.classList.toggle("is-done", i < index);
    });
  }

  /* ===== A: 八步能量环 ===== */
  function createFlowRing(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 7.5, 11);
    addLights(scene);
    scene.add(makeGrid());

    var root = new THREE.Group();
    scene.add(root);
    var count = steps.length;
    var pts = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 - Math.PI / 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 4, 0.3, Math.sin(a) * 4));
    }
    var curve = new THREE.CatmullRomCurve3(pts, true);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, 0.07, 12, true),
      new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.7,
        metalness: 0.5,
        roughness: 0.25,
      })
    );
    root.add(tube);

    var nodes = [];
    for (var j = 0; j < count; j++) {
      var g = new THREE.Group();
      g.position.copy(pts[j]);
      var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: 0x0088ff,
          emissiveIntensity: 0.35,
          metalness: 0.55,
          roughness: 0.25,
        })
      );
      g.add(core);
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.04, 10, 40),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff })
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      var label = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      label.position.y = 0.7;
      g.add(label);
      root.add(g);
      nodes.push({ g: g, core: core, ring: ring });
    }

    var energy = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2 })
    );
    root.add(energy);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          n.core.material.emissiveIntensity = on ? 1.4 : i < ctrl.index ? 0.7 : 0.3;
          n.core.scale.setScalar(on ? 1.35 : 1);
          n.ring.scale.setScalar(on ? 1.4 : 1);
        });
        syncFlowDom(steps, this.index);
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var state = {
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      curve: curve,
      energy: energy,
      ctrl: ctrl,
      active: true,
      t: 0,
    };
    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y += dt * 0.28;
        energy.position.copy(curvePoint(curve, state.t, 0.12));
        energy.position.y += 0.25;
        camera.position.x = Math.sin(state.t * 0.25) * 2;
        camera.lookAt(0, 0.4, 0);
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ===== B: 蛇形管线 ===== */
  function createFlowSerpentine(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 9, 11);
    addLights(scene);
    scene.add(makeGrid());

    var root = new THREE.Group();
    scene.add(root);
    var count = steps.length;
    var pts = [];
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / 4);
      var col = i % 4;
      if (row % 2) col = 3 - col;
      pts.push(new THREE.Vector3(-4.2 + col * 2.8, 0.4, -2 + row * 3.6));
    }
    var curve = new THREE.CatmullRomCurve3(pts, false);
    root.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 120, 0.08, 12, false),
        new THREE.MeshStandardMaterial({
          color: 0x00d4ff,
          emissive: 0x0088ff,
          emissiveIntensity: 0.65,
          metalness: 0.55,
          roughness: 0.22,
        })
      )
    );

    var nodes = [];
    for (var j = 0; j < count; j++) {
      var box = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.75),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: 0x0088ff,
          emissiveIntensity: 0.35,
          metalness: 0.6,
          roughness: 0.25,
        })
      );
      box.position.copy(pts[j]);
      root.add(box);
      nodes.push(box);
    }

    var energy = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2 })
    );
    root.add(energy);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          n.material.emissiveIntensity = on ? 1.5 : i < ctrl.index ? 0.75 : 0.3;
          n.scale.setScalar(on ? 1.3 : 1);
        });
        syncFlowDom(steps, this.index);
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, curve: curve, energy: energy, ctrl: ctrl, active: true, t: 0 };
    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.3) * 0.25;
        energy.position.copy(curvePoint(curve, state.t, 0.1));
        energy.position.y += 0.35;
        camera.position.x = Math.sin(state.t * 0.25) * 1.8;
        camera.lookAt(0, 0.5, 0.5);
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  /* ===== C: 纵向轨道 ===== */
  function createFlowRail(host) {
    var canvas = host.querySelector(".fx3d-canvas");
    var steps = host.querySelectorAll("[data-step]");
    if (!canvas || !steps.length) return null;

    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(7, 0.5, 12);
    addLights(scene);
    scene.add(makeGrid());

    var root = new THREE.Group();
    scene.add(root);
    var count = steps.length;
    var rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, count * 1.35, 16),
      new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0088ff, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 })
    );
    rail.position.set(-1.5, 0, 0);
    root.add(rail);

    var nodes = [];
    for (var i = 0; i < count; i++) {
      var y = ((count - 1) / 2 - i) * 1.35;
      var g = new THREE.Group();
      g.position.set(-1.5, y, 0);
      var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 18, 18),
        new THREE.MeshStandardMaterial({ color: 0x0a3a6e, emissive: 0x0088ff, emissiveIntensity: 0.35, metalness: 0.55, roughness: 0.25 })
      );
      g.add(core);
      var arm = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x3dadff })
      );
      arm.position.x = 1.2;
      g.add(arm);
      var plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x0d4a8a, emissive: 0x0088ff, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.3 })
      );
      plate.position.x = 2.4;
      g.add(plate);
      root.add(g);
      nodes.push({ g: g, core: core, plate: plate });
    }

    var energy = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2 })
    );
    energy.position.set(-1.5, ((count - 1) / 2) * 1.35, 0);
    root.add(energy);

    var ctrl = {
      index: 0,
      setStep: function (idx) {
        this.index = ((idx % count) + count) % count;
        nodes.forEach(function (n, i) {
          var on = i === ctrl.index;
          n.core.material.emissiveIntensity = on ? 1.5 : i < ctrl.index ? 0.7 : 0.25;
          n.plate.material.emissiveIntensity = on ? 1 : 0.2;
          n.core.scale.setScalar(on ? 1.4 : 1);
        });
        syncFlowDom(steps, this.index);
      },
    };
    flowControllers.push(ctrl);
    ctrl.setStep(0);

    var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, energy: energy, ctrl: ctrl, active: true, t: 0, count: count };
    function layout() {
      resize(renderer, camera, host);
    }
    function tick(dt) {
      if (!state.active) return;
      state.t += dt;
      if (!reducedMotion) {
        root.rotation.y = Math.sin(state.t * 0.35) * 0.2;
        var span = (count - 1) * 1.35;
        energy.position.y = ((count - 1) / 2) * 1.35 - ((state.t * 0.9) % (span + 0.01));
        camera.position.x = 6.5 + Math.sin(state.t * 0.3) * 0.8;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
    }
    state.layout = layout;
    state.tick = tick;
    layout();
    return state;
  }

  function observe(state) {
    function setActive(on) {
      state.active = on;
      if (on && state.layout) state.layout();
      if (on) state.renderer.render(state.scene, state.camera);
    }
    setActive(true);
    if ("IntersectionObserver" in global) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            setActive(e.isIntersecting);
          });
        },
        { threshold: 0.02, rootMargin: "120px 0px" }
      );
      io.observe(state.host);
    }
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
      if (state) {
        scenes.push(state);
        observe(state);
        host.classList.add("is-3d-ready");
      }
    });

    if (!scenes.length) {
      console.warn("[KuaiXiang3D] 未找到可初始化的三维容器");
      return;
    }

    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (var i = 0; i < scenes.length; i++) {
        if (scenes[i].tick) scenes[i].tick(dt);
      }
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

    if (!reducedMotion && flowControllers.length) {
      var fi = 0;
      setInterval(function () {
        fi = (fi + 1) % 8;
        flowControllers.forEach(function (c) {
          c.setStep(fi);
        });
      }, 1500);
    }
  }

  function setTextValue(el, value, opts) {
    if (!el) return;
    opts = opts || {};
    var numEl = el.querySelector("[data-count]") || el.querySelector("strong") || el;
    var decimals = opts.decimals != null ? opts.decimals : Number(numEl.getAttribute("data-decimals") || 0);
    var suffix = opts.suffix != null ? opts.suffix : numEl.getAttribute("data-suffix") || "";
    numEl.setAttribute("data-count", value);
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
