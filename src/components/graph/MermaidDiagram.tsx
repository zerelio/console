import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'ui-sans-serif, -apple-system, sans-serif',
    fontSize: '14px',
    primaryColor: '#2d2d5e',
    primaryTextColor: '#e1e1e3',
    primaryBorderColor: '#6c5ce7',
    lineColor: '#6c5ce7',
    secondaryColor: '#1a1a2e',
    tertiaryColor: '#16162a',
    mainBkg: '#16162a',
    textColor: '#e1e1e3',
    nodeBorder: '#4a4a6a',
    clusterBkg: '#0f0f1a',
    clusterBorder: '#3d3d5c',
    titleColor: '#e1e1e3',
    edgeLabelBackground: '#0f0f1a',
    nodeTextColor: '#e1e1e3',
    edgeLabelColor: '#8b8b8e',
  },
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
    padding: 20,
    nodeSpacing: 60,
    rankSpacing: 100,
  },
});

interface Props {
  definition: string;
  highlightNodeId?: string;
}

function DiagramViewer({ definition, highlightNodeId, fitToWidth, fitToContainer }: { definition: string; highlightNodeId?: string; fitToWidth?: number; fitToContainer?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const naturalSizeRef = useRef({ w: 800, h: 400 });
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ w: 800, h: 400 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`);
  const renderedDef = useRef('');

  const fitDiagram = useCallback(() => {
    const svg = svgRef.current;
    const vp = viewportRef.current;
    if (!svg || !vp) return;
    const { w, h } = naturalSizeRef.current;
    if (fitToWidth && fitToWidth > 0) {
      const s = Math.min(1, (fitToWidth - 40) / w);
      setScale(s);
      setPan({ x: 20, y: 10 });
    } else if (fitToContainer) {
      const pw = vp.clientWidth;
      const ph = vp.clientHeight;
      if (pw > 0 && ph > 0) {
        const s = Math.min(1, (pw - 40) / w, (ph - 40) / h);
        setScale(s);
        setPan({ x: Math.max(10, (pw - w * s) / 2), y: Math.max(10, (ph - h * s) / 2) });
      }
    } else {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [fitToWidth, fitToContainer]);

  useEffect(() => {
    if (!containerRef.current || !definition) return;
    if (renderedDef.current === definition) return; // already rendered this definition
    renderedDef.current = definition;
    const el = containerRef.current;
    el.textContent = '';
    const div = document.createElement('div');
    div.id = id.current;
    div.textContent = definition;
    el.appendChild(div);
    mermaid.run({ nodes: [div], suppressErrors: true }).then(() => {
      const svg = div.querySelector('svg');
      if (svg) {
        svg.style.maxWidth = 'none';
        svg.style.maxHeight = 'none';
        svg.style.width = 'auto';
        svg.style.height = 'auto';
        svgRef.current = svg;
        const w = svg.viewBox.baseVal.width || svg.width.baseVal.value || 800;
        const h = svg.viewBox.baseVal.height || svg.height.baseVal.value || 400;
        naturalSizeRef.current = { w, h };
        setNaturalSize({ w, h });
        fitDiagram();
      }
      if (highlightNodeId) {
        const safeId = 'n' + highlightNodeId.replace(/[-.\/: ]/g, '_');
        const nodeEl = el.querySelector(`[id*="${safeId}"]`);
        if (nodeEl) (nodeEl as HTMLElement).style.filter = 'brightness(1.5) drop-shadow(0 0 8px #6c5ce7)';
      }
    });
  }, [definition, highlightNodeId, fitDiagram]);

  // Re-fit when container resizes (modal open/close, window resize)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !fitToContainer) return;
    const ro = new ResizeObserver(() => { fitDiagram(); });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fitToContainer, fitDiagram]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.05, Math.min(5, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) {
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const zoomIn = () => setScale(s => Math.min(5, s * 1.3));
  const zoomOut = () => setScale(s => Math.max(0.05, s / 1.3));
  const zoomFit = () => {
    if (containerRef.current && svgRef.current) {
      const parent = containerRef.current.parentElement;
      const pw = parent?.clientWidth || 800;
      const ph = parent?.clientHeight || 600;
      const s = Math.min(1, (pw - 40) / naturalSize.w, (ph - 40) / naturalSize.h);
      setScale(s);
      setPan({ x: 20, y: 10 });
    }
  };

  const downloadSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const serializer = new XMLSerializer();
    const svgContent = serializer.serializeToString(clone);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture-diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const copyDefinition = useCallback(() => {
    navigator.clipboard.writeText(definition).catch(() => {});
  }, [definition]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: '#0f0f1a', borderBottom: '1px solid hsl(var(--border))' }}>
        <button onClick={downloadSvg} className="text-xs px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]" style={{ color: 'hsl(var(--muted-foreground))' }} title="Download SVG">⬇ SVG</button>
        <button onClick={copyDefinition} className="text-xs px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]" style={{ color: 'hsl(var(--muted-foreground))' }} title="Copy Mermaid definition">📋 Copy</button>
        <span className="w-px h-4 bg-[#3d3d5c] mx-1" />
        <button onClick={zoomIn} className="text-xs px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]" style={{ color: 'hsl(var(--muted-foreground))' }} title="Zoom in">+</button>
        <button onClick={zoomOut} className="text-xs px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]" style={{ color: 'hsl(var(--muted-foreground))' }} title="Zoom out">−</button>
        <button onClick={zoomFit} className="text-xs px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]" style={{ color: 'hsl(var(--muted-foreground))' }} title="Fit to screen">⊞</button>
        <span className="text-[10px] ml-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{Math.round(scale * 100)}%</span>
        <span className="text-[10px]" style={{ color: '#5c5c5e' }}>{naturalSize.w}×{naturalSize.h}</span>
      </div>
      <div ref={viewportRef} className="flex-1 overflow-hidden" style={{ cursor: dragging.current ? 'grabbing' : 'grab', background: '#080810', position: 'relative' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}>
        <div className="w-full h-full" style={{ overflow: 'visible' }}>
          <div style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            display: 'inline-block',
          }}>
            <div ref={containerRef} style={{ minHeight: naturalSize.h > 100 ? 0 : 200 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MermaidDiagram({ definition, highlightNodeId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const compactContainerRef = useRef<HTMLDivElement>(null);

  if (!definition) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#5c5c5e]">Architecture diagram</span>
        <button onClick={() => setExpanded(true)}
          className="text-[10px] px-2 py-0.5 rounded hover:bg-[hsl(var(--border))]"
          style={{ color: 'hsl(var(--muted-foreground))' }}>
          Full screen
        </button>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ maxHeight: 240, background: '#080810', border: '1px solid hsl(var(--border))' }}>
        <div ref={compactContainerRef} style={{ height: 220 }}>
          <DiagramViewer definition={definition} highlightNodeId={highlightNodeId} fitToWidth={320} />
        </div>
      </div>

      {expanded && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setExpanded(false)}>
          <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ background: '#0f0f1a', borderBottom: '1px solid hsl(var(--border))' }}
            onClick={e => e.stopPropagation()}>
            <span className="text-sm text-[#8b8b8e]">Architecture Diagram — drag to pan, scroll to zoom</span>
            <button onClick={() => setExpanded(false)}
              className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              ✕ Close
            </button>
          </div>
          <div className="flex-1 relative p-4" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-4 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden">
              <DiagramViewer definition={definition} highlightNodeId={highlightNodeId} fitToContainer />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
