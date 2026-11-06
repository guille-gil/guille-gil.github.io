/*
 * Knowledge graph background.
 * Drifting nodes link to near neighbours, labelled nodes carry terms from
 * procedural knowledge, small pulses traverse the edges, and the cursor
 * repels nearby nodes while connecting to them. Clicking sends a traversal
 * outward from the nearest node. Honours prefers-reduced-motion by drawing
 * a single static frame.
 */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.id = "graph-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var LABELS = [
    "Procedure", "Condition", "Action", "Decision", "Agent", "Retrieval",
    "Graph", "Compliance", "Operator", "Fault", "Step", "Evidence", "Constraint"
  ];
  var LINK = 150;
  var LINK2 = LINK * LINK;
  var MOUSE_R = 170;
  var PUSH_R = 110;

  var w = 0;
  var h = 0;
  var dpr = 1;
  var nodes = [];
  var adj = [];
  var pulses = [];
  var maxPulses = 6;
  var spawnAcc = 0;
  var last = 0;
  var resizePending = false;

  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  var ink = { r: 40, g: 40, b: 40 };
  var accent = { r: 13, g: 148, b: 136 };

  function readColours() {
    var m = getComputedStyle(document.body).color.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) {
      ink = { r: +m[0], g: +m[1], b: +m[2] };
    }
    var lum = 0.299 * ink.r + 0.587 * ink.g + 0.114 * ink.b;
    accent = lum > 140 ? { r: 94, g: 234, b: 212 } : { r: 13, g: 148, b: 136 };
  }

  function rgba(c, a) {
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a.toFixed(3) + ")";
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeNode() {
    var angle = Math.random() * Math.PI * 2;
    var speed = rand(0.05, 0.16);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      px: 0,
      py: 0,
      r: rand(1.5, 2.6),
      glow: 0,
      label: Math.random() < 0.22 ? LABELS[Math.floor(Math.random() * LABELS.length)] : null
    };
  }

  function resize() {
    resizePending = false;
    var nw = window.innerWidth;
    var nh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = nw;
    h = nh;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.max(24, Math.min(80, Math.round((w * h) / 17000)));
    while (nodes.length < target) nodes.push(makeNode());
    if (nodes.length > target) nodes.length = target;
    maxPulses = w < 700 ? 3 : 6;
    readColours();
    if (reduceMotion) {
      buildAdjacency();
      draw(0);
    }
  }

  function buildAdjacency() {
    var n = nodes.length;
    var i;
    var j;
    for (i = 0; i < n; i++) {
      if (!adj[i]) adj[i] = [];
      adj[i].length = 0;
    }
    adj.length = n;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < LINK2) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }
  }

  function spawnFrom(i) {
    var nb = adj[i];
    if (!nb || !nb.length) return false;
    pulses.push({
      a: i,
      b: nb[Math.floor(Math.random() * nb.length)],
      t: 0,
      v: rand(1.6, 2.8),
      hops: 0,
      max: Math.floor(rand(4, 9))
    });
    nodes[i].glow = 1;
    return true;
  }

  function spawnRandom() {
    for (var tries = 0; tries < 10; tries++) {
      if (spawnFrom(Math.floor(Math.random() * nodes.length))) return;
    }
  }

  function step(k, dt) {
    var i;
    var n = nodes.length;

    mouse.x += (mouse.tx - mouse.x) * Math.min(1, 0.18 * k);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, 0.18 * k);

    for (i = 0; i < n; i++) {
      var nd = nodes[i];
      if (mouse.active) {
        var dx = nd.x - mouse.x;
        var dy = nd.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < PUSH_R * PUSH_R && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = (1 - d / PUSH_R) * 0.35;
          nd.px += (dx / d) * f;
          nd.py += (dy / d) * f;
        }
      }
      nd.x += (nd.vx + nd.px) * k;
      nd.y += (nd.vy + nd.py) * k;
      nd.px *= Math.pow(0.92, k);
      nd.py *= Math.pow(0.92, k);
      nd.glow *= Math.pow(0.94, k);

      if (nd.x < -20) nd.x = w + 20;
      else if (nd.x > w + 20) nd.x = -20;
      if (nd.y < -20) nd.y = h + 20;
      else if (nd.y > h + 20) nd.y = -20;
    }

    buildAdjacency();

    spawnAcc += dt;
    if (spawnAcc > 650 && pulses.length < maxPulses) {
      spawnAcc = 0;
      spawnRandom();
    }

    for (i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      var A = nodes[p.a];
      var B = nodes[p.b];
      if (!A || !B) {
        pulses.splice(i, 1);
        continue;
      }
      var ex = B.x - A.x;
      var ey = B.y - A.y;
      var ed = Math.sqrt(ex * ex + ey * ey);
      if (ed > LINK * 1.2 || ed < 1) {
        pulses.splice(i, 1);
        continue;
      }
      p.t += (p.v * k) / ed;
      if (p.t >= 1) {
        B.glow = 1;
        p.hops++;
        var options = [];
        var nb = adj[p.b] || [];
        for (var q = 0; q < nb.length; q++) {
          if (nb[q] !== p.a) options.push(nb[q]);
        }
        if (!options.length || p.hops >= p.max) {
          pulses.splice(i, 1);
          continue;
        }
        p.a = p.b;
        p.b = options[Math.floor(Math.random() * options.length)];
        p.t = 0;
      }
    }
  }

  function draw() {
    var i;
    var j;
    var n = nodes.length;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;

    for (i = 0; i < n; i++) {
      var nb = adj[i] || [];
      for (var q = 0; q < nb.length; q++) {
        j = nb[q];
        if (j < i) continue;
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        ctx.strokeStyle = rgba(ink, (1 - d / LINK) * 0.16);
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }

    var near = new Array(n);
    for (i = 0; i < n; i++) {
      near[i] = 0;
      if (!mouse.active) continue;
      var mx = nodes[i].x - mouse.x;
      var my = nodes[i].y - mouse.y;
      var md = Math.sqrt(mx * mx + my * my);
      if (md < MOUSE_R) {
        near[i] = 1 - md / MOUSE_R;
        ctx.strokeStyle = rgba(accent, near[i] * 0.55);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(nodes[i].x, nodes[i].y);
        ctx.stroke();
      }
    }

    var showLabels = w >= 700;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    for (i = 0; i < n; i++) {
      var nd = nodes[i];
      if (nd.glow > 0.02) {
        ctx.fillStyle = rgba(accent, nd.glow * 0.35);
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r + nd.glow * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(ink, 0.4);
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
      ctx.fill();
      if (near[i] > 0) {
        ctx.fillStyle = rgba(accent, near[i] * 0.9);
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r + near[i] * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (showLabels && nd.label) {
        ctx.fillStyle = near[i] > 0.2 ? rgba(accent, 0.3 + near[i] * 0.55) : rgba(ink, 0.3);
        ctx.fillText(nd.label, nd.x + nd.r + 5, nd.y + 3);
      }
    }

    for (i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var A = nodes[p.a];
      var B = nodes[p.b];
      if (!A || !B) continue;
      var hx = A.x + (B.x - A.x) * p.t;
      var hy = A.y + (B.y - A.y) * p.t;
      var t0 = Math.max(0, p.t - 0.35);
      var tx = A.x + (B.x - A.x) * t0;
      var ty = A.y + (B.y - A.y) * t0;
      var grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, rgba(accent, 0));
      grad.addColorStop(1, rgba(accent, 0.85));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = rgba(accent, 0.95);
      ctx.beginPath();
      ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min(ts - last, 50);
    last = ts;
    step(dt / 16.667, dt);
    draw();
    requestAnimationFrame(frame);
  }

  function queueResize() {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(resize);
  }

  window.addEventListener("resize", queueResize);
  resize();

  if (reduceMotion) return;

  window.addEventListener(
    "pointermove",
    function (e) {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      if (!mouse.active) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
      mouse.active = true;
    },
    { passive: true }
  );

  document.documentElement.addEventListener("mouseleave", function () {
    mouse.active = false;
  });
  window.addEventListener("blur", function () {
    mouse.active = false;
  });
  window.addEventListener("pointerup", function (e) {
    if (e.pointerType === "touch") mouse.active = false;
  });

  window.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    var best = -1;
    var bestD = 200 * 200;
    for (var i = 0; i < nodes.length; i++) {
      var dx = nodes[i].x - e.clientX;
      var dy = nodes[i].y - e.clientY;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = i;
      }
    }
    if (best < 0) return;
    for (var s = 0; s < 3; s++) spawnFrom(best);
  });

  requestAnimationFrame(frame);
})();
