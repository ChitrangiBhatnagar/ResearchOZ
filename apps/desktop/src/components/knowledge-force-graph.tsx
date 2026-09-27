'use client';

import * as React from 'react';

type GNode = {
  id: string;
  label: string;
  nodeType: string;
  importance: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type GEdge = { id: string; source: string; target: string; edgeType: string };

type Camera = { scale: number; tx: number; ty: number };

export type KnowledgeForceGraphHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
};

function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type GraphPalette = {
  background: string;
  edge: string;
  label: string;
  halo: string;
  cross: string;
  glowAlpha: number;
  cores: { paper: string; hardware: string; concept: string; other: string };
  glows: { paper: string; other: string };
};

const PALETTES: Record<'light' | 'dark', GraphPalette> = {
  dark: {
    background: '#050506',
    edge: 'rgba(249,115,22,0.12)',
    label: 'rgba(255,237,213,0.9)',
    halo: '249,115,22',
    cross: '253,186,116',
    glowAlpha: 0.55,
    cores: { paper: '#fdba74', hardware: '#fb923c', concept: '#fed7aa', other: '#ffedd5' },
    glows: { paper: '#fb923c', other: '#f97316' },
  },
  light: {
    background: '#fffdfa',
    edge: 'rgba(194,65,12,0.16)',
    label: 'rgba(67,20,7,0.85)',
    halo: '234,88,12',
    cross: '194,65,12',
    glowAlpha: 0.3,
    cores: { paper: '#c2410c', hardware: '#ea580c', concept: '#f97316', other: '#9a3412' },
    glows: { paper: '#fb923c', other: '#fdba74' },
  },
};

function orangeFor(type: string, pal: GraphPalette): { core: string; glow: string } {
  if (type === 'paper') return { core: pal.cores.paper, glow: pal.glows.paper };
  if (type === 'hardware' || type === 'framework') return { core: pal.cores.hardware, glow: pal.glows.other };
  if (type === 'concept') return { core: pal.cores.concept, glow: pal.glows.other };
  return { core: pal.cores.other, glow: pal.glows.other };
}

function radiusFor(importance: number) {
  return 1.15 + importance * 1.6;
}

function screenToWorld(sx: number, sy: number, cam: Camera) {
  return { x: (sx - cam.tx) / cam.scale, y: (sy - cam.ty) / cam.scale };
}

function zoomAt(sx: number, sy: number, cam: Camera, factor: number) {
  const newScale = clamp(cam.scale * factor, 0.25, 4);
  const { x: wx, y: wy } = screenToWorld(sx, sy, cam);
  cam.scale = newScale;
  cam.tx = sx - wx * newScale;
  cam.ty = sy - wy * newScale;
}

function computeFitCamera(ns: GNode[], w: number, h: number): Camera {
  if (ns.length === 0) return { scale: 1, tx: 0, ty: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of ns) {
    const pad = radiusFor(n.importance) * 8;
    minX = Math.min(minX, n.x - pad);
    minY = Math.min(minY, n.y - pad);
    maxX = Math.max(maxX, n.x + pad);
    maxY = Math.max(maxY, n.y + pad);
  }
  const padding = 48;
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const scale = clamp(Math.min((w - padding * 2) / bw, (h - padding * 2) / bh), 0.25, 4);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { scale, tx: w / 2 - cx * scale, ty: h / 2 - cy * scale };
}

export const KnowledgeForceGraph = React.forwardRef<
  KnowledgeForceGraphHandle,
  {
    nodes: Array<{ id: string; label: string; nodeType: string; importance: number }>;
    edges: GEdge[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    theme?: 'light' | 'dark';
  }
>(function KnowledgeForceGraph({ nodes, edges, selectedId, onSelect, theme = 'dark' }, ref) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const paletteRef = React.useRef<GraphPalette>(PALETTES[theme]);
  paletteRef.current = PALETTES[theme];
  const posCache = React.useRef(new Map<string, { x: number; y: number }>());
  const sim = React.useRef<{
    nodes: GNode[];
    edges: GEdge[];
    w: number;
    h: number;
    alpha: number;
  }>({
    nodes: [],
    edges: [],
    w: 800,
    h: 560,
    alpha: 1,
  });
  const camera = React.useRef<Camera>({ scale: 1, tx: 0, ty: 0 });
  const dprRef = React.useRef(1);
  const hoverId = React.useRef<string | null>(null);
  const selectedRef = React.useRef(selectedId);
  selectedRef.current = selectedId;
  const timeRef = React.useRef(0);
  const isPanning = React.useRef(false);
  const panStart = React.useRef({ sx: 0, sy: 0, tx: 0, ty: 0 });
  const dragMoved = React.useRef(false);
  const pendingFit = React.useRef(false);

  const signature = React.useMemo(
    () => `${nodes.map((n) => n.id).join(',')}|${edges.length}`,
    [nodes, edges]
  );

  React.useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const { w, h } = sim.current;
      zoomAt(w / 2, h / 2, camera.current, 1.2);
    },
    zoomOut: () => {
      const { w, h } = sim.current;
      zoomAt(w / 2, h / 2, camera.current, 1 / 1.2);
    },
    fitToView: () => {
      camera.current = computeFitCamera(sim.current.nodes, sim.current.w, sim.current.h);
    },
  }));

  React.useEffect(() => {
    const w = sim.current.w || 800;
    const h = sim.current.h || 560;
    sim.current.nodes = nodes.map((n) => {
      const cached = posCache.current.get(n.id);
      const a = hash01(n.id) * Math.PI * 2;
      const ring = 70 + hash01(n.id + 'r') * Math.min(w, h) * 0.32;
      return {
        ...n,
        x: cached?.x ?? w / 2 + Math.cos(a) * ring,
        y: cached?.y ?? h / 2 + Math.sin(a) * ring,
        vx: 0,
        vy: 0,
      };
    });
    sim.current.edges = edges;
    sim.current.alpha = 1;
    pendingFit.current = true;
    // Only re-layout when the node/edge set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let running = true;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sim.current.w = w;
      sim.current.h = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const hitTest = (sx: number, sy: number): GNode | null => {
      const { x: wx, y: wy } = screenToWorld(sx, sy, camera.current);
      let best: GNode | null = null;
      let bestD = 14;
      for (const n of sim.current.nodes) {
        const dx = n.x - wx;
        const dy = n.y - wy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    };

    const drawStar = (x: number, y: number, r: number, color: string, glow: string, pulse: number) => {
      const pal = paletteRef.current;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
      halo.addColorStop(0, `rgba(${pal.halo},${0.22 * pulse})`);
      halo.addColorStop(0.35, `rgba(${pal.halo},${0.08 * pulse})`);
      halo.addColorStop(1, `rgba(${pal.halo},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = `rgba(${pal.cross},${0.35 * pulse})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 3.2);
      ctx.lineTo(x, y + r * 3.2);
      ctx.moveTo(x - r * 3.2, y);
      ctx.lineTo(x + r * 3.2, y);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.globalAlpha = pal.glowAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    const tick = () => {
      if (!running) return;
      timeRef.current += 1;
      const { nodes: ns, edges: es, w, h } = sim.current;
      const cx = w / 2;
      const cy = h / 2;

      if (sim.current.alpha > 0.008) {
        const alpha = sim.current.alpha;
        for (let i = 0; i < ns.length; i++) {
          const a = ns[i]!;
          a.vx += (cx - a.x) * 0.00045 * alpha;
          a.vy += (cy - a.y) * 0.00045 * alpha;
          for (let j = i + 1; j < ns.length; j++) {
            const b = ns[j]!;
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            const dist2 = dx * dx + dy * dy || 0.01;
            const dist = Math.sqrt(dist2);
            const force = (420 * alpha) / dist2;
            dx /= dist;
            dy /= dist;
            a.vx += dx * force;
            a.vy += dy * force;
            b.vx -= dx * force;
            b.vy -= dy * force;
          }
        }

        const byId = new Map(ns.map((n) => [n.id, n]));
        const rest = 86;
        for (const e of es) {
          const a = byId.get(e.source);
          const b = byId.get(e.target);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const k = ((dist - rest) / dist) * 0.006 * alpha;
          a.vx += dx * k;
          a.vy += dy * k;
          b.vx -= dx * k;
          b.vy -= dy * k;
        }

        for (const n of ns) {
          n.vx *= 0.78;
          n.vy *= 0.78;
          n.x += n.vx;
          n.y += n.vy;
          n.x = Math.max(16, Math.min(w - 16, n.x));
          n.y = Math.max(16, Math.min(h - 16, n.y));
          posCache.current.set(n.id, { x: n.x, y: n.y });
        }
        sim.current.alpha *= 0.94;
      } else if (pendingFit.current && ns.length > 0) {
        camera.current = computeFitCamera(ns, w, h);
        pendingFit.current = false;
      }

      const dpr = dprRef.current;
      const cam = camera.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pal = paletteRef.current;
      ctx.fillStyle = pal.background;
      ctx.fillRect(0, 0, w, h);

      ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.tx, dpr * cam.ty);

      const byId = new Map(ns.map((n) => [n.id, n]));
      ctx.lineWidth = 0.45 / cam.scale;
      for (const e of es) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        ctx.strokeStyle = pal.edge;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      const sel = selectedRef.current;
      const hover = hoverId.current;
      for (const n of ns) {
        const r = radiusFor(n.importance);
        const colors = orangeFor(n.nodeType, pal);
        const isSel = n.id === sel;
        const isHov = n.id === hover;
        const twinkle = 0.85 + Math.sin(timeRef.current * 0.03 + hash01(n.id) * 12) * 0.15;
        const pulse = isSel ? 1.35 : isHov ? 1.15 : twinkle;
        drawStar(n.x, n.y, isSel ? r + 0.6 : r, colors.core, colors.glow, pulse);
      }

      const labeled = ns.filter((n) => n.id === sel || n.id === hover || n.importance > 0.92).slice(0, 18);
      for (const n of labeled) {
        const r = radiusFor(n.importance);
        ctx.font = `${10 / cam.scale}px "Noto Sans", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = pal.label;
        ctx.fillText(n.label.length > 26 ? n.label.slice(0, 26) + '…' : n.label, n.x, n.y + r + 11);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pointerPos = (ev: MouseEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { sx: ev.clientX - rect.left, sy: ev.clientY - rect.top };
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const { sx, sy } = pointerPos(ev);
      const factor = ev.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(sx, sy, camera.current, factor);
    };

    const onDown = (ev: MouseEvent) => {
      const { sx, sy } = pointerPos(ev);
      const hit = hitTest(sx, sy);
      const middle = ev.button === 1;
      const leftOnEmpty = ev.button === 0 && !hit;
      if (middle || leftOnEmpty) {
        isPanning.current = true;
        dragMoved.current = false;
        panStart.current = { sx, sy, tx: camera.current.tx, ty: camera.current.ty };
        ev.preventDefault();
      }
    };

    const onMove = (ev: MouseEvent) => {
      const { sx, sy } = pointerPos(ev);
      if (isPanning.current) {
        const dx = sx - panStart.current.sx;
        const dy = sy - panStart.current.sy;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
        camera.current.tx = panStart.current.tx + dx;
        camera.current.ty = panStart.current.ty + dy;
        return;
      }
      hoverId.current = hitTest(sx, sy)?.id ?? null;
    };

    const onUp = () => {
      isPanning.current = false;
    };

    const onClick = (ev: MouseEvent) => {
      if (dragMoved.current) return;
      const { sx, sy } = pointerPos(ev);
      const hit = hitTest(sx, sy);
      onSelect(hit ? hit.id : null);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('click', onClick);
    };
  }, [onSelect]);

  return <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />;
});
