import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  MousePointer2,
  GitBranch,
  RotateCw,
  FlipHorizontal,
  Trash2,
  Maximize,
  ZoomIn,
  ZoomOut,
  CircleDot,
} from 'lucide-react';
import type { CircuitDoc, Component, NetlistResult, Point, Wire } from '../../model/types';
import { getPart } from '../../parts/registry';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useSimStore } from '../../store/useSimStore';
import { useUiStore } from '../../store/useUiStore';
import { PartView } from './PartView';
import {
  pinWorld,
  orthoRoute,
  pointsToPath,
  boundsOf,
  rectsIntersect,
  fitView,
  snap,
  nearestPointOnPolyline,
} from '../../lib/geometry';
import {
  doglegWirePoints,
  isSegmentMovable,
  normalizeWirePoints,
  translateWireSegment,
} from '../../lib/wires';

interface CanvasProps {
  netlist: NetlistResult;
}

interface DragState {
  mode: 'pan' | 'move' | 'marquee';
  startClient: Point;
  startDoc: Point;
  lastDoc: Point;
  componentIds: string[];
  viewportStart: CircuitDoc['viewport'];
  moved: boolean;
  historyStarted: boolean;
}

const LEVEL_CLASS: Record<string, string> = { '0': 'low', '1': 'high', z: 'float', x: 'conflict' };

export function Canvas({ netlist }: CanvasProps) {
  const doc = useCircuitStore((s) => s.doc);
  const selection = useCircuitStore((s) => s.selection);
  const tool = useCircuitStore((s) => s.tool);
  const setTool = useCircuitStore((s) => s.setTool);
  const setViewport = useCircuitStore((s) => s.setViewport);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const selectWire = useCircuitStore((s) => s.selectWire);
  const clearSelection = useCircuitStore((s) => s.clearSelection);
  const selectComponents = useCircuitStore((s) => s.selectComponents);
  const moveComponents = useCircuitStore((s) => s.moveComponents);
  const beginHistory = useCircuitStore((s) => s.beginHistory);
  const addWire = useCircuitStore((s) => s.addWire);
  const addWireToWire = useCircuitStore((s) => s.addWireToWire);
  const updateWirePoints = useCircuitStore((s) => s.updateWirePoints);
  const deleteSelection = useCircuitStore((s) => s.deleteSelection);
  const rotateSelection = useCircuitStore((s) => s.rotateSelection);
  const mirrorSelection = useCircuitStore((s) => s.mirrorSelection);
  const touch = useCircuitStore((s) => s.touch);
  const toggleState = useCircuitStore((s) => s.toggleState);
  const pinLevels = useSimStore((s) => s.pinLevels);
  const netLevels = useSimStore((s) => s.netLevels);
  const showToast = useUiStore((s) => s.showToast);
  const setCanvasSize = useUiStore((s) => s.setCanvasSize);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [wireStart, setWireStart] = useState<{ componentId: string; pinId: string; point: Point } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);
  const [hoverWireId, setHoverWireId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const wireDragRef = useRef<{
    mode: 'segment' | 'straight';
    wireId: string;
    segmentIndex: number;
    startDoc: Point;
    originalPoints: Point[];
    moved: boolean;
    historyStarted: boolean;
  } | null>(null);
  const lastFitRef = useRef('');

  const vp = doc.viewport;
  const partMap = useMemo(() => new Map(doc.components.map((c) => [c.id, getPart(c.type)])), [doc.components]);

  useEffect(() => {
    if (tool !== 'wire') {
      setWireStart(null);
      setHoverWireId(null);
    }
  }, [tool]);

  const wireNet = useMemo(() => {
    const map = new Map<string, string>();
    for (const [wireId, netId] of netlist.wireNet) {
      const net = netlist.nets.find((n) => n.id === netId);
      if (net) map.set(wireId, net.name);
    }
    return map;
  }, [netlist]);

  const toDoc = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - vp.x) / vp.zoom,
        y: (clientY - rect.top - vp.y) / vp.zoom,
      };
    },
    [vp],
  );

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const boxes = doc.components
      .map((c) => {
        const part = partMap.get(c.id);
        return part ? boundsOf(c, part) : null;
      })
      .filter((b): b is { x: number; y: number; width: number; height: number } => Boolean(b));
    setViewport(fitView(boxes, { width: rect.width, height: rect.height }));
  }, [doc.components, partMap, setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
      setCanvasSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [setCanvasSize]);

  useEffect(() => {
    if (size.width === 0) return;
    if (lastFitRef.current === doc.id) return;
    lastFitRef.current = doc.id;
    fit();
  }, [doc.id, size.width, size.height, fit]);

  useEffect(() => {
    const onFit = () => fit();
    window.addEventListener('ecs:fit', onFit);
    return () => window.removeEventListener('ecs:fit', onFit);
  }, [fit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const view = useCircuitStore.getState().doc.viewport;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const zoom = Math.min(2.5, Math.max(0.2, view.zoom * factor));
      setViewport({
        x: mx - (mx - view.x) * (zoom / view.zoom),
        y: my - (my - view.y) * (zoom / view.zoom),
        zoom,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setViewport]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (e.code === 'Space') {
        e.preventDefault();
        spaceRef.current = true;
      }
      if (e.key === 'Escape') {
        if (wireStart) {
          e.preventDefault();
          setWireStart(null);
          setHoverWireId(null);
        } else {
          setWireStart(null);
          setHoverWireId(null);
          setMarquee(null);
          dragRef.current = null;
          wireDragRef.current = null;
          if (tool === 'wire') setTool('select');
        }
      }
      if (e.key.toLowerCase() === 'f') window.dispatchEvent(new Event('ecs:fit'));
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [tool, wireStart, setTool]);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const zoom = Math.min(2.5, Math.max(0.2, vp.zoom * factor));
    setViewport({
      x: mx - (mx - vp.x) * (zoom / vp.zoom),
      y: my - (my - vp.y) * (zoom / vp.zoom),
      zoom,
    });
  };

  const startPan = (e: ReactPointerEvent) => {
    dragRef.current = {
      mode: 'pan',
      startClient: { x: e.clientX, y: e.clientY },
      startDoc: toDoc(e.clientX, e.clientY),
      lastDoc: toDoc(e.clientX, e.clientY),
      componentIds: [],
      viewportStart: { ...vp },
      moved: false,
      historyStarted: true,
    };
  };

  const handlePartPointerDown = (e: ReactPointerEvent, comp: Component) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if ((comp.type === 'SWITCH' || comp.type === 'LOGIC_SWITCH') && e.detail >= 2) {
      toggleState(comp.id, 'closed');
      return;
    }
    if (comp.type === 'BUTTON' && e.detail >= 2) {
      toggleState(comp.id, 'pressed');
      return;
    }
    if (tool === 'wire') {
      selectComponent(comp.id, e.shiftKey);
      return;
    }
    let ids: string[];
    if (e.shiftKey) {
      selectComponent(comp.id, true);
      ids = [...selection.components, comp.id];
    } else if (selection.components.includes(comp.id)) {
      ids = selection.components;
      if (ids.length > 1) selectComponents(ids);
      else selectComponent(comp.id);
    } else {
      selectComponent(comp.id);
      ids = [comp.id];
    }
    const point = toDoc(e.clientX, e.clientY);
    dragRef.current = {
      mode: 'move',
      startClient: { x: e.clientX, y: e.clientY },
      startDoc: point,
      lastDoc: point,
      componentIds: ids,
      viewportStart: { ...vp },
      moved: false,
      historyStarted: false,
    };
  };

  const handlePinPointerDown = (e: ReactPointerEvent, comp: Component, pinId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const part = partMap.get(comp.id);
    if (!part) return;
    const world = pinWorld(comp, part, pinId);
    if (!world) return;
    if (!wireStart) {
      setWireStart({ componentId: comp.id, pinId, point: { x: world.x, y: world.y } });
      selectComponent(comp.id);
      return;
    }
    if (wireStart.componentId === comp.id && wireStart.pinId === pinId) {
      setWireStart(null);
      return;
    }
    const points = orthoRoute(wireStart.point, { x: world.x, y: world.y });
    addWire(
      { componentId: wireStart.componentId, pinId: wireStart.pinId },
      { componentId: comp.id, pinId },
      points,
    );
    setWireStart(null);
    showToast(`已连接 ${wireStart.componentId} → ${comp.label}.${pinId}`, 'ok');
  };

  const handleWirePointerDown = (e: ReactPointerEvent, wire: Wire) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const point = toDoc(e.clientX, e.clientY);

    if (tool === 'wire') {
      if (!wireStart) {
        selectWire(wire.id, e.shiftKey);
        return;
      }
      const hit = nearestPointOnPolyline(wire.points, point);
      if (!hit) return;
      const startComp = doc.components.find((c) => c.id === wireStart.componentId);
      const startPart = startComp ? partMap.get(startComp.id) : undefined;
      const startWorld = startComp && startPart ? pinWorld(startComp, startPart, wireStart.pinId) : wireStart.point;
      if (!startWorld) return;
      addWireToWire(
        { componentId: wireStart.componentId, pinId: wireStart.pinId },
        wire.id,
        orthoRoute(startWorld, hit.point),
      );
      setWireStart(null);
      setHoverWireId(null);
      showToast('已连接到导线上', 'ok');
      return;
    }

    selectWire(wire.id, e.shiftKey);
    if (e.shiftKey) return;
    const hit = nearestPointOnPolyline(wire.points, point);
    if (!hit) return;
    if (wire.points.length === 2) {
      wireDragRef.current = {
        mode: 'straight',
        wireId: wire.id,
        segmentIndex: 0,
        startDoc: point,
        originalPoints: wire.points.map((p) => ({ ...p })),
        moved: false,
        historyStarted: false,
      };
      return;
    }
    if (!isSegmentMovable(wire, hit.segmentIndex)) return;
    wireDragRef.current = {
      mode: 'segment',
      wireId: wire.id,
      segmentIndex: hit.segmentIndex,
      startDoc: point,
      originalPoints: wire.points.map((p) => ({ ...p })),
      moved: false,
      historyStarted: false,
    };
  };

  const handleBackgroundDown = (e: ReactPointerEvent) => {
    if (e.button === 1 || spaceRef.current) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
    if (wireStart) {
      setWireStart(null);
      return;
    }
    const point = toDoc(e.clientX, e.clientY);
    clearSelection();
    setMarquee({ start: point, current: point });
    dragRef.current = {
      mode: 'marquee',
      startClient: { x: e.clientX, y: e.clientY },
      startDoc: point,
      lastDoc: point,
      componentIds: [],
      viewportStart: { ...vp },
      moved: false,
      historyStarted: true,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    const point = toDoc(e.clientX, e.clientY);
    setCursor(point);
    const wireDrag = wireDragRef.current;
    if (wireDrag) {
      const dx = point.x - wireDrag.startDoc.x;
      const dy = point.y - wireDrag.startDoc.y;
      if (!wireDrag.moved && Math.abs(dx) + Math.abs(dy) > 1.5) wireDrag.moved = true;
      if (wireDrag.moved) {
        if (!wireDrag.historyStarted) {
          beginHistory();
          wireDrag.historyStarted = true;
        }
        const next =
          wireDrag.mode === 'straight'
            ? doglegWirePoints(
                wireDrag.originalPoints[0],
                wireDrag.originalPoints[1],
                Math.round(dx),
                Math.round(dy),
              )
            : translateWireSegment(
                wireDrag.originalPoints,
                wireDrag.segmentIndex,
                Math.round(dx),
                Math.round(dy),
              );
        updateWirePoints(wireDrag.wireId, next);
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.startClient.x;
      const dy = e.clientY - drag.startClient.y;
      setViewport({ ...drag.viewportStart, x: drag.viewportStart.x + dx, y: drag.viewportStart.y + dy });
      drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
      return;
    }
    if (drag.mode === 'move') {
      const dx = snap(point.x - drag.lastDoc.x, 1);
      const dy = snap(point.y - drag.lastDoc.y, 1);
      if (!drag.moved && Math.abs(point.x - drag.startDoc.x) + Math.abs(point.y - drag.startDoc.y) > 2) {
        drag.moved = true;
      }
      if (drag.moved) {
        if (!drag.historyStarted) {
          beginHistory();
          drag.historyStarted = true;
        }
        moveComponents(drag.componentIds, dx, dy);
        drag.lastDoc = point;
      }
      return;
    }
    if (drag.mode === 'marquee') {
      setMarquee({ start: drag.startDoc, current: point });
    }
  };

  const handlePointerUp = () => {
    const wireDrag = wireDragRef.current;
    wireDragRef.current = null;
    if (wireDrag?.moved) {
      const live = useCircuitStore.getState().doc.wires.find((w) => w.id === wireDrag.wireId);
      if (live) updateWirePoints(live.id, normalizeWirePoints(live.points));
      touch();
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.mode === 'move' && drag.moved) touch();
    if (drag.mode === 'marquee' && marquee) {
      const x = Math.min(marquee.start.x, marquee.current.x);
      const y = Math.min(marquee.start.y, marquee.current.y);
      const width = Math.abs(marquee.current.x - marquee.start.x);
      const height = Math.abs(marquee.current.y - marquee.start.y);
      if (width > 4 || height > 4) {
        const ids = doc.components
          .filter((c) => {
            const part = partMap.get(c.id);
            return part ? rectsIntersect({ x, y, width, height }, boundsOf(c, part)) : false;
          })
          .map((c) => c.id);
        selectComponents(ids);
      }
      setMarquee(null);
    }
  };

  const cursorStyle = dragRef.current?.mode === 'pan' ? 'grabbing' : spaceRef.current ? 'grab' : tool === 'wire' ? 'crosshair' : 'default';

  const selectedOne = selection.components.length === 1 ? doc.components.find((c) => c.id === selection.components[0]) : null;
  const selectedPart = selectedOne ? partMap.get(selectedOne.id) : null;

  return (
    <div
      className="canvas-surface"
      ref={containerRef}
      style={{
        backgroundSize: `${18 * vp.zoom}px ${18 * vp.zoom}px`,
        backgroundPosition: `${vp.x - 9}px ${vp.y - 9}px`,
      }}
    >
      <div className="canvas-vignette" />
      <svg
        ref={svgRef}
        className="schematic"
        style={{ cursor: cursorStyle }}
        onPointerDown={handleBackgroundDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.zoom})`}>
          <g className="wire-layer">
            {doc.wires.map((wire) => {
              const netName = wireNet.get(wire.id);
              const level = netName ? netLevels[netName] : undefined;
              const levelClass = level === undefined ? 'none' : LEVEL_CLASS[String(level)] ?? 'float';
              const isSelected = selection.wires.includes(wire.id);
              const path = pointsToPath(wire.points);
              const mid = wire.points[Math.max(0, Math.floor((wire.points.length - 1) / 2))];
              const nxt = wire.points[Math.min(wire.points.length - 1, Math.floor((wire.points.length - 1) / 2) + 1)] ?? mid;
              const endpoint = wire.points[wire.points.length - 1];
              const connectable = tool === 'wire' && Boolean(wireStart);
              return (
                <g
                  key={wire.id}
                  className={`wire-group ${isSelected ? 'is-selected' : ''} ${
                    hoverWireId === wire.id ? 'is-wire-target' : ''
                  }`}
                >
                  <path
                    d={path}
                    className={`wire-hit ${connectable ? 'is-connectable' : ''}`}
                    onPointerDown={(e) => handleWirePointerDown(e, wire)}
                    onPointerEnter={() => {
                      if (connectable) setHoverWireId(wire.id);
                    }}
                    onPointerLeave={() => {
                      if (hoverWireId === wire.id) setHoverWireId(null);
                    }}
                  />
                  <path d={path} className={`wire wire--${levelClass}`} />
                  {wire.join && endpoint && (
                    <circle className="wire-junction" cx={endpoint.x} cy={endpoint.y} r={2.8} />
                  )}
                  {wire.netLabel && (
                    <text className="wire-label" x={(mid.x + nxt.x) / 2} y={(mid.y + nxt.y) / 2 - 4} textAnchor="middle">
                      {wire.netLabel}
                    </text>
                  )}
                </g>
              );
            })}
            {wireStart && cursor && (
              <path
                d={pointsToPath(orthoRoute(wireStart.point, cursor))}
                className="wire-preview"
              />
            )}
          </g>
          <g className="part-layer">
            {doc.components.map((comp) => {
              const part = partMap.get(comp.id);
              if (!part) return null;
              return (
                <PartView
                  key={comp.id}
                  comp={comp}
                  part={part}
                  selected={selection.components.includes(comp.id)}
                  pinLevels={pinLevels}
                  onPartPointerDown={handlePartPointerDown}
                  onPinPointerDown={handlePinPointerDown}
                />
              );
            })}
          </g>
          {marquee && (
            <rect
              x={Math.min(marquee.start.x, marquee.current.x)}
              y={Math.min(marquee.start.y, marquee.current.y)}
              width={Math.abs(marquee.current.x - marquee.start.x)}
              height={Math.abs(marquee.current.y - marquee.start.y)}
              className="marquee"
            />
          )}
        </g>
      </svg>

      <div className="canvas-toolbar">
        <button className={`tool-btn ${tool === 'select' ? 'is-active' : ''}`} onClick={() => setTool('select')} title="选择 (Esc)">
          <MousePointer2 className="icon" />
        </button>
        <button className={`tool-btn ${tool === 'wire' ? 'is-active' : ''}`} onClick={() => setTool('wire')} title="连线 (点击引脚)">
          <GitBranch className="icon" />
        </button>
        <span className="tool-sep" />
        <button className="tool-btn" onClick={rotateSelection} title="旋转选中 (R)">
          <RotateCw className="icon" />
        </button>
        <button className="tool-btn" onClick={mirrorSelection} title="镜像选中 (X)">
          <FlipHorizontal className="icon" />
        </button>
        <button className="tool-btn" onClick={deleteSelection} title="删除选中 (Delete)">
          <Trash2 className="icon" />
        </button>
        <span className="tool-sep" />
        <button className="tool-btn" onClick={fit} title="适配视图 (F)">
          <Maximize className="icon" />
        </button>
        <button className="tool-btn" onClick={() => zoomBy(1.15)} title="放大">
          <ZoomIn className="icon" />
        </button>
        <button className="tool-btn" onClick={() => zoomBy(1 / 1.15)} title="缩小">
          <ZoomOut className="icon" />
        </button>
      </div>

      <div className="canvas-status">
        <CircleDot className="icon" style={{ width: 12, height: 12 }} />
        {selectedOne && selectedPart
          ? `${selectedOne.label} · ${selectedPart.name}`
          : selection.wires.length > 0
            ? `已选导线 ${selection.wires.length} 段`
            : `${doc.components.length} 器件 · ${doc.wires.length} 导线`}
      </div>

      <div className="canvas-hint">
        {wireStart
          ? '点击引脚或导线完成连线，Esc 取消'
          : '点击引脚连线 · 拖动导线中段调整走线 · 空格拖拽平移 · 滚轮缩放'}
      </div>

      <div className="zoom-box">
        <button className="tool-btn" onClick={() => zoomBy(1 / 1.15)}>
          <ZoomOut className="icon" />
        </button>
        <span>{Math.round(vp.zoom * 100)}%</span>
        <button className="tool-btn" onClick={() => zoomBy(1.15)}>
          <ZoomIn className="icon" />
        </button>
      </div>
    </div>
  );
}
