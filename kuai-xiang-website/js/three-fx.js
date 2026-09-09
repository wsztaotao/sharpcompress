/**
 * 软件快响 · Three.js 三维动效（标题区以下）
 * - 画布拉近、放大，保证立体可见
 * - WebGL 失败时仍有 CSS 立体动效兜底
 * API: KuaiXiang3D.updateMetrics / setFlowStep
 */
(function (global) {
  "use strict";

  var metricMap = {};
  var flowControllers = [];
  var scenes = [];
  var reducedMotion = false;
  try {
    reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      var gl =
        c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
        c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
        c.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  function markReady(host, ok) {
    host.classList.toggle("is-3d-ready", !!ok);
    host.classList.toggle("is-3d-fallback", !ok);
  }

  function bindMetrics(host) {
    host.querySelectorAll("[data-metric]").forEach(function (el) {
      var key = el.getAttribute("data-metric");
      if (key) metricMap[key] = el;
    });
  }

  function syncSteps(steps, index) {
    steps.forEach(function (el, i) {
      el.classList.toggle("is-on", i === index);
      el.classList.toggle("is-done", i < index);
    });
  }

  /* ---------------- CSS fallback always animates ---------------- */
  function ensureCssFallback(host, kind) {
    var stage = host.querySelector(".fx3d-stage");
    if (!stage || stage.querySelector(".fx3d-cssfx")) return;
    var box = document.createElement("div");
    box.className = "fx3d-cssfx fx3d-cssfx--" + (kind || "orbit");
    box.setAttribute("aria-hidden", "true");
    if (kind === "flow") {
      var html = '<div class="cssfx-grid"></div><div class="cssfx-path"></div>';
      for (var i = 1; i <= 8; i++) html += '<b data-n="0' + i + '"></b>';
      html += '<span class="cssfx-ball"></span>';
      box.innerHTML = html;
    } else {
      box.innerHTML =
        '<div class="cssfx-grid"></div>' +
        '<div class="cssfx-plat"></div>' +
        '<div class="cssfx-ring"></div>' +
        '<div class="cssfx-ring cssfx-ring--2"></div>' +
        '<div class="cssfx-core"></div>' +
        '<div class="cssfx-bars"><i></i><i></i><i></i><i></i><i></i></div>';
    }
    stage.insertBefore(box, stage.firstChild);
  }

  /* ---------------- Three.js helpers ---------------- */
  function bootThree() {
    if (!global.THREE) return false;
    if (!hasWebGL()) return false;
    var THREE = global.THREE;

    function makeRenderer(canvas) {
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
          alpha: true,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        });
      } catch (e) {
        console.warn("[KuaiXiang3D] WebGLRenderer 创建失败", e);
        return null;
      }
      renderer.setClearColor(0x041428, 0.92);
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
      return renderer;
    }

    function resize(renderer, camera, host) {
      var stage = host.querySelector(".fx3d-stage") || host;
      var w = Math.max(stage.clientWidth || 640, 2);
      var h = Math.max(stage.clientHeight || 360, 2);
      // 同步 canvas 显示尺寸，避免内容挤在角落
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function lights(scene) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      var d1 = new THREE.DirectionalLight(0xffffff, 1.2);
      d1.position.set(4, 6, 5);
      scene.add(d1);
      var d2 = new THREE.DirectionalLight(0x00d4ff, 0.8);
      d2.position.set(-5, 2, -3);
      scene.add(d2);
      var p = new THREE.PointLight(0x66ccff, 1.4, 40);
      p.position.set(0, 3, 2);
      scene.add(p);
    }

    function frameScene(camera, root) {
      // 近距离俯视，主体充满舞台
      camera.position.set(0, 3.2, 5.4);
      camera.near = 0.1;
      camera.far = 100;
      camera.fov = 42;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0.6, 0);
    }

    function createMetricsOrbit(host) {
      var canvas = host.querySelector(".fx3d-canvas");
      if (!canvas) return null;
      bindMetrics(host);
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      lights(scene);

      var root = new THREE.Group();
      scene.add(root);

      var floor = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 64),
        new THREE.MeshStandardMaterial({
          color: 0x0a3a6e,
          emissive: 0x003366,
          emissiveIntensity: 0.5,
          metalness: 0.6,
          roughness: 0.35,
        })
      );
      floor.rotation.x = -Math.PI / 2;
      root.add(floor);

      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.55, 0.16, 16, 80),
        new THREE.MeshStandardMaterial({
          color: 0x00d4ff,
          emissive: 0x00aaff,
          emissiveIntensity: 1.2,
          metalness: 0.4,
          roughness: 0.2,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.2;
      root.add(ring);

      var pillars = [];
      for (var i = 0; i < 5; i++) {
        var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        var h = 2.2 + (i % 3) * 0.65;
        var g = new THREE.Group();
        g.position.set(Math.cos(a) * 2.55, 0, Math.sin(a) * 2.55);
        var box = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, h, 0.85),
          new THREE.MeshStandardMaterial({
            color: 0x1a6fd0,
            emissive: 0x0088ff,
            emissiveIntensity: 0.85,
            metalness: 0.55,
            roughness: 0.25,
          })
        );
        box.position.y = h / 2;
        g.add(box);
        var tip = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.4, 0),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00d4ff,
            emissiveIntensity: 1.8,
          })
        );
        tip.position.y = h + 0.45;
        g.add(tip);
        root.add(g);
        pillars.push({ g: g, box: box, tip: tip, h: h });
      }

      var core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 1),
        new THREE.MeshStandardMaterial({
          color: 0x0088ff,
          emissive: 0x00d4ff,
          emissiveIntensity: 1.15,
          wireframe: true,
        })
      );
      core.position.y = 1.55;
      root.add(core);

      // 粒子
      var pgeo = new THREE.BufferGeometry();
      var arr = new Float32Array(220 * 3);
      for (var p = 0; p < 220; p++) {
        arr[p * 3] = (Math.random() - 0.5) * 8;
        arr[p * 3 + 1] = Math.random() * 3.6;
        arr[p * 3 + 2] = (Math.random() - 0.5) * 8;
      }
      pgeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      var points = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0x66e0ff, size: 0.1 }));
      scene.add(points);

      frameScene(camera, root);
      camera.position.set(0, 3.8, 6.2);
      camera.lookAt(0, 0.85, 0);

      var state = {
        host: host,
        renderer: renderer,
        scene: scene,
        camera: camera,
        root: root,
        ring: ring,
        core: core,
        pillars: pillars,
        points: points,
        active: true,
        t: 0,
      };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y += dt * 0.75;
          core.rotation.x += dt * 1.1;
          core.rotation.y += dt * 1.35;
          ring.rotation.z += dt * 0.55;
          points.rotation.y -= dt * 0.2;
          camera.position.x = Math.sin(state.t * 0.45) * 1.15;
          camera.position.z = 6.2 + Math.cos(state.t * 0.45) * 0.45;
          camera.lookAt(0, 0.85, 0);
          pillars.forEach(function (p, idx) {
            var s = 1 + Math.sin(state.t * 2.4 + idx) * 0.2;
            p.box.scale.y = s;
            p.box.position.y = (p.h * s) / 2;
            p.tip.position.y = p.h * s + 0.4;
            p.tip.rotation.y += dt * 2;
          });
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    function createMetricsColumns(host) {
      var canvas = host.querySelector(".fx3d-canvas");
      if (!canvas) return null;
      bindMetrics(host);
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      lights(scene);
      var root = new THREE.Group();
      scene.add(root);
      var floor = new THREE.Mesh(
        new THREE.CircleGeometry(6, 48),
        new THREE.MeshStandardMaterial({ color: 0x0a2548, emissive: 0x002244, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.4 })
      );
      floor.rotation.x = -Math.PI / 2;
      root.add(floor);
      var cols = [];
      for (var i = 0; i < 5; i++) {
        var h = 2.4 + (i % 3) * 0.8;
        var mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, h, 1.15),
          new THREE.MeshStandardMaterial({ color: 0x1a6fd0, emissive: 0x0088ff, emissiveIntensity: 0.75, metalness: 0.55, roughness: 0.22 })
        );
        mesh.position.set(-3.2 + i * 1.6, h / 2, 0);
        root.add(mesh);
        var tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.4, 0.8, 5),
          new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.4 })
        );
        tip.position.set(-3.2 + i * 1.6, h + 0.35, 0);
        root.add(tip);
        cols.push({ mesh: mesh, tip: tip, h: h, x: -3.2 + i * 1.6 });
      }
      frameScene(camera, root);
      camera.position.set(0, 3.8, 6.6);
      camera.lookAt(0, 1.1, 0);
      var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, cols: cols, active: true, t: 0 };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y = Math.sin(state.t * 0.45) * 0.35;
          camera.position.x = Math.sin(state.t * 0.35) * 1.1;
          camera.position.z = 6.6;
          camera.lookAt(0, 1.1, 0);
          cols.forEach(function (c, idx) {
            var s = 1 + Math.sin(state.t * 2.3 + idx) * 0.22;
            c.mesh.scale.y = s;
            c.mesh.position.y = (c.h * s) / 2;
            c.tip.position.y = c.h * s + 0.35;
            c.tip.rotation.y += dt * 2;
          });
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    function createMetricsHive(host) {
      var canvas = host.querySelector(".fx3d-canvas");
      if (!canvas) return null;
      bindMetrics(host);
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      lights(scene);
      var root = new THREE.Group();
      scene.add(root);
      var spots = [[0, 0], [-2.2, 1.3], [2.2, 1.3], [-2.2, -1.3], [2.2, -1.3]];
      var cells = [];
      for (var i = 0; i < 5; i++) {
        var g = new THREE.Group();
        g.position.set(spots[i][0], 0.5, spots[i][1]);
        var hex = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 0.9, 6),
          new THREE.MeshStandardMaterial({ color: 0x0d4a8a, emissive: 0x0088ff, emissiveIntensity: 0.7, metalness: 0.55, roughness: 0.25 })
        );
        g.add(hex);
        root.add(g);
        cells.push(g);
      }
      var wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6, 1),
        new THREE.MeshBasicMaterial({ color: 0x66e0ff, wireframe: true })
      );
      wire.position.y = 2.4;
      root.add(wire);
      frameScene(camera, root);
      camera.position.set(0, 4.8, 6.4);
      camera.lookAt(0, 0.7, 0);
      var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, cells: cells, wire: wire, active: true, t: 0 };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y += dt * 0.55;
          wire.rotation.x += dt * 0.7;
          wire.rotation.y += dt * 0.6;
          camera.position.x = Math.sin(state.t * 0.35) * 1.1;
          camera.position.z = 6.4;
          camera.lookAt(0, 0.7, 0);
          cells.forEach(function (c, idx) {
            c.position.y = 0.5 + Math.sin(state.t * 2 + idx) * 0.28;
          });
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    function createFlowRing(host) {
      var canvas = host.querySelector(".fx3d-canvas");
      var steps = host.querySelectorAll("[data-step]");
      if (!canvas || !steps.length) return null;
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      lights(scene);
      var root = new THREE.Group();
      scene.add(root);

      var count = steps.length;
      var nodes = [];
      var positions = [];
      for (var i = 0; i < count; i++) {
        var a = (i / count) * Math.PI * 2 - Math.PI / 2;
        var x = Math.cos(a) * 2.7;
        var z = Math.sin(a) * 2.7;
        positions.push(new THREE.Vector3(x, 0.55, z));
      }

      // 用粗线段代替 Tube，兼容性更好
      for (var j = 0; j < count; j++) {
        var a2 = positions[j];
        var b2 = positions[(j + 1) % count];
        var dir = new THREE.Vector3().subVectors(b2, a2);
        var len = dir.length();
        var mid = new THREE.Vector3().addVectors(a2, b2).multiplyScalar(0.5);
        var cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, len, 10),
          new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0088ff, emissiveIntensity: 1.05 })
        );
        cyl.position.copy(mid);
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        root.add(cyl);
      }

      for (var k = 0; k < count; k++) {
        var ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 20, 20),
          new THREE.MeshStandardMaterial({ color: 0x0a3a6e, emissive: 0x0088ff, emissiveIntensity: 0.45, metalness: 0.5, roughness: 0.25 })
        );
        ball.position.copy(positions[k]);
        var halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.06, 10, 32),
          new THREE.MeshBasicMaterial({ color: 0x66e0ff })
        );
        halo.position.copy(positions[k]);
        halo.rotation.x = Math.PI / 2;
        root.add(ball);
        root.add(halo);
        nodes.push({ ball: ball, halo: halo });
      }

      var energy = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2.2 })
      );
      root.add(energy);

      var floor = new THREE.Mesh(
        new THREE.CircleGeometry(3.8, 48),
        new THREE.MeshStandardMaterial({ color: 0x071a33, emissive: 0x002244, emissiveIntensity: 0.4 })
      );
      floor.rotation.x = -Math.PI / 2;
      root.add(floor);

      frameScene(camera, root);
      camera.fov = 40;
      camera.updateProjectionMatrix();
      camera.position.set(0, 4.6, 6.2);
      camera.lookAt(0, 0.5, 0);

      var ctrl = {
        index: 0,
        setStep: function (idx) {
          this.index = ((idx % count) + count) % count;
          nodes.forEach(function (n, i) {
            var on = i === ctrl.index;
            n.ball.material.emissiveIntensity = on ? 1.6 : i < ctrl.index ? 0.8 : 0.35;
            n.ball.scale.setScalar(on ? 1.35 : 1);
            n.halo.scale.setScalar(on ? 1.4 : 1);
          });
          syncSteps(steps, this.index);
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
        energy: energy,
        positions: positions,
        ctrl: ctrl,
        active: true,
        t: 0,
      };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y += dt * 0.48;
          var u = (state.t * 0.35) % count;
          var i0 = Math.floor(u) % count;
          var i1 = (i0 + 1) % count;
          var f = u - Math.floor(u);
          energy.position.lerpVectors(positions[i0], positions[i1], f);
          energy.position.y = 0.85 + Math.sin(state.t * 4) * 0.14;
          camera.position.x = Math.sin(state.t * 0.35) * 1.05;
          camera.position.z = 6.2 + Math.cos(state.t * 0.35) * 0.35;
          camera.lookAt(0, 0.5, 0);
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    function createFlowSerpentine(host) {
      // 复用 ring 逻辑但改成蛇形点位
      var canvas = host.querySelector(".fx3d-canvas");
      var steps = host.querySelectorAll("[data-step]");
      if (!canvas || !steps.length) return null;
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      lights(scene);
      var root = new THREE.Group();
      scene.add(root);
      var count = steps.length;
      var positions = [];
      for (var i = 0; i < count; i++) {
        var row = Math.floor(i / 4);
        var col = i % 4;
        if (row % 2) col = 3 - col;
        positions.push(new THREE.Vector3(-2.7 + col * 1.8, 0.5, -1.35 + row * 2.4));
      }
      for (var j = 0; j < count - 1; j++) {
        var a2 = positions[j];
        var b2 = positions[j + 1];
        var dir = new THREE.Vector3().subVectors(b2, a2);
        var len = dir.length();
        var mid = new THREE.Vector3().addVectors(a2, b2).multiplyScalar(0.5);
        var cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, len, 10),
          new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0088ff, emissiveIntensity: 0.95 })
        );
        cyl.position.copy(mid);
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        root.add(cyl);
      }
      var nodes = [];
      for (var k = 0; k < count; k++) {
        var box = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x0a3a6e, emissive: 0x0088ff, emissiveIntensity: 0.45, metalness: 0.5, roughness: 0.25 })
        );
        box.position.copy(positions[k]);
        root.add(box);
        nodes.push(box);
      }
      var energy = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2 })
      );
      root.add(energy);
      frameScene(camera, root);
      camera.position.set(0, 5.6, 6.8);
      camera.lookAt(0, 0.4, 0.2);
      var ctrl = {
        index: 0,
        setStep: function (idx) {
          this.index = ((idx % count) + count) % count;
          nodes.forEach(function (n, i) {
            var on = i === ctrl.index;
            n.material.emissiveIntensity = on ? 1.5 : i < ctrl.index ? 0.75 : 0.3;
            n.scale.setScalar(on ? 1.3 : 1);
          });
          syncSteps(steps, this.index);
        },
      };
      flowControllers.push(ctrl);
      ctrl.setStep(0);
      var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, energy: energy, positions: positions, ctrl: ctrl, active: true, t: 0 };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y = Math.sin(state.t * 0.35) * 0.22;
          var u = (state.t * 0.35) % Math.max(count - 1, 1);
          var i0 = Math.floor(u);
          var i1 = Math.min(i0 + 1, count - 1);
          var f = u - i0;
          energy.position.lerpVectors(positions[i0], positions[i1], f);
          energy.position.y = 0.85;
          camera.position.x = Math.sin(state.t * 0.3) * 1.0;
          camera.lookAt(0, 0.4, 0.2);
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    function createFlowRail(host) {
      var canvas = host.querySelector(".fx3d-canvas");
      var steps = host.querySelectorAll("[data-step]");
      if (!canvas || !steps.length) return null;
      var renderer = makeRenderer(canvas);
      if (!renderer) return null;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      lights(scene);
      var root = new THREE.Group();
      scene.add(root);
      var count = steps.length;
      var rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, count * 1.25, 16),
        new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0088ff, emissiveIntensity: 1 })
      );
      rail.position.set(-1.2, 0, 0);
      root.add(rail);
      var nodes = [];
      for (var i = 0; i < count; i++) {
        var y = ((count - 1) / 2 - i) * 1.25;
        var core = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x0a3a6e, emissive: 0x0088ff, emissiveIntensity: 0.4 })
        );
        core.position.set(-1.2, y, 0);
        var plate = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.65, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x1a6fd0, emissive: 0x0088ff, emissiveIntensity: 0.35 })
        );
        plate.position.set(1.3, y, 0);
        var arm = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.07, 0.07),
          new THREE.MeshBasicMaterial({ color: 0x66e0ff })
        );
        arm.position.set(0.1, y, 0);
        root.add(core);
        root.add(plate);
        root.add(arm);
        nodes.push({ core: core, plate: plate });
      }
      var energy = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00d4ff, emissiveIntensity: 2 })
      );
      energy.position.set(-1.2, ((count - 1) / 2) * 1.25, 0);
      root.add(energy);
      frameScene(camera, root);
      camera.position.set(4.8, 0.4, 7.2);
      camera.lookAt(0, 0, 0);
      var ctrl = {
        index: 0,
        setStep: function (idx) {
          this.index = ((idx % count) + count) % count;
          nodes.forEach(function (n, i) {
            var on = i === ctrl.index;
            n.core.material.emissiveIntensity = on ? 1.6 : i < ctrl.index ? 0.75 : 0.3;
            n.plate.material.emissiveIntensity = on ? 1.1 : 0.25;
            n.core.scale.setScalar(on ? 1.4 : 1);
          });
          syncSteps(steps, this.index);
        },
      };
      flowControllers.push(ctrl);
      ctrl.setStep(0);
      var state = { host: host, renderer: renderer, scene: scene, camera: camera, root: root, energy: energy, ctrl: ctrl, active: true, t: 0, count: count };
      state.layout = function () {
        resize(renderer, camera, host);
      };
      state.tick = function (dt) {
        if (!state.active) return;
        state.t += dt;
        if (!reducedMotion) {
          root.rotation.y = Math.sin(state.t * 0.35) * 0.22;
          var span = (count - 1) * 1.25;
          energy.position.y = ((count - 1) / 2) * 1.25 - ((state.t * 1.1) % (span + 0.01));
          camera.position.x = 4.8 + Math.sin(state.t * 0.3) * 0.45;
          camera.lookAt(0, 0, 0);
        }
        renderer.render(scene, camera);
      };
      return state;
    }

    var factories = {
      "metrics-orbit": createMetricsOrbit,
      "metrics-columns": createMetricsColumns,
      "metrics-hive": createMetricsHive,
      "flow-ring": createFlowRing,
      "flow-serpentine": createFlowSerpentine,
      "flow-rail": createFlowRail,
    };

    document.querySelectorAll("[data-fx3d]").forEach(function (host) {
      var kind = host.getAttribute("data-fx3d");
      ensureCssFallback(host, kind.indexOf("flow") === 0 ? "flow" : "orbit");
      var factory = factories[kind];
      if (!factory) {
        markReady(host, false);
        return;
      }
      var state = null;
      try {
        state = factory(host);
      } catch (err) {
        console.warn("[KuaiXiang3D] 场景初始化失败", kind, err);
      }
      if (!state) {
        markReady(host, false);
        return;
      }
      markReady(host, true);
      scenes.push(state);
      state.layout();
      state.renderer.render(state.scene, state.camera);

      if ("IntersectionObserver" in global) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              state.active = e.isIntersecting;
              if (state.active) {
                state.layout();
                state.renderer.render(state.scene, state.camera);
              }
            });
          },
          { threshold: 0.01, rootMargin: "100px 0px" }
        );
        io.observe(host);
      }
      if ("ResizeObserver" in global) {
        var ro = new ResizeObserver(function () {
          state.layout();
        });
        ro.observe(host.querySelector(".fx3d-stage") || host);
      }
    });

    if (!scenes.length) return false;

    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (var i = 0; i < scenes.length; i++) {
        try {
          scenes[i].tick(dt);
        } catch (e) {}
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    global.addEventListener(
      "resize",
      function () {
        scenes.forEach(function (s) {
          s.layout();
        });
      },
      { passive: true }
    );

    if (!reducedMotion) {
      var fi = 0;
      setInterval(function () {
        fi = (fi + 1) % 8;
        flowControllers.forEach(function (c) {
          c.setStep(fi);
        });
        // CSS fallback nodes
        document.querySelectorAll(".fx3d-cssfx--flow").forEach(function (box) {
          box.querySelectorAll("b").forEach(function (b, idx) {
            b.classList.toggle("is-on", idx === fi);
          });
        });
      }, 1400);
    }
    return true;
  }

  function bootFallbackOnly() {
    document.querySelectorAll("[data-fx3d]").forEach(function (host) {
      var kind = host.getAttribute("data-fx3d");
      ensureCssFallback(host, kind && kind.indexOf("flow") === 0 ? "flow" : "orbit");
      markReady(host, false);
      bindMetrics(host);
    });
    var stepsGroups = document.querySelectorAll(".fx3d-steps");
    var fi = 0;
    setInterval(function () {
      fi = (fi + 1) % 8;
      stepsGroups.forEach(function (g) {
        syncSteps(g.querySelectorAll("[data-step]"), fi);
      });
      document.querySelectorAll(".fx3d-cssfx--flow").forEach(function (box) {
        box.querySelectorAll("b").forEach(function (b, idx) {
          b.classList.toggle("is-on", idx === fi);
        });
      });
    }, 1400);
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
        s.layout && s.layout();
      });
    },
  };

  function start() {
    // 先注入 CSS 立体层，保证即便 WebGL 失败也立刻可见
    document.querySelectorAll("[data-fx3d]").forEach(function (host) {
      var kind = host.getAttribute("data-fx3d") || "";
      ensureCssFallback(host, kind.indexOf("flow") === 0 ? "flow" : "orbit");
    });
    var ok = false;
    try {
      ok = bootThree();
    } catch (e) {
      console.warn("[KuaiXiang3D] bootThree error", e);
      ok = false;
    }
    if (!ok) bootFallbackOnly();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);
