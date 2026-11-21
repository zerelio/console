import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as d3 from 'd3';
import { buildGroupedElements, buildHierarchicalElements, providerColor, ProviderGroup } from '../components/graph/grouped-elements';
import { getIconDataUri, getStatusDot } from '../components/graph/resource-icons';
import { MermaidDiagram } from '../components/graph/MermaidDiagram';
import { GlassCard, GradientButton } from '../components/ui/GlassCard';

const DEFAULT_PAGE_SIZE = 200;
const LARGE_GRAPH_THRESHOLD = 1000;
// const GROUPED_COLLAPSE_THRESHOLD = 300;

function colorWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shortType(type: string): string { return (type || '').split('.').pop() || type || '?'; }

const TYPE_NAMES: Record<string, string> = { repository: 'Repository' };
function typeDisplayName(type: string): string {
  const s = shortType(type); return TYPE_NAMES[s] || s.charAt(0).toUpperCase() + s.slice(1);
}

function metaFor(type: string): { bg: string } {
  const M: Record<string, string> = { instance:'#6c5ce7', vpc:'#2ed573', subnet:'#ffa502', bucket:'#0097e6', cluster:'#e84393', function:'#00cec9', load_balancer:'#fd79a8', table:'#6c5ce7', repository:'#6e7681', file:'#a855f7', cg_function:'#c084fc', cg_class:'#7c3aed', cg_method:'#a78bfa', cg_symbol:'#a855f7' };
  const short = (type || '').split('.').pop() || type;
  for (const [k, c] of Object.entries(M)) { if (short.includes(k)) return { bg: c }; }
  return { bg: '#636e72' };
}

function isUrl(v: string): boolean { return typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://')); }

const EDGE_TYPE_COLORS: Record<string, string> = {
  CONTAINS: '#2ed573', CONNECTS_TO: '#0097e6', DEPENDS_ON: '#ffa502',
  HAS_ROLE: '#a29bfe', HAS_POLICY: '#fd79a8', EXPOSES: '#e84393',
  ROUTES_TO: '#fdcb6e', PEERED_WITH: '#74b9ff', RUNS_ON: '#00cec9',
  BACKED_BY: '#55efc4', MANAGED_BY: '#6c5ce7',
  CALLS: '#a855f7', IMPORTS: '#6c5ce7', EXTENDS: '#2ed573', IMPLEMENTS: '#c084fc',
};
function edgeColor(type: string): string { return EDGE_TYPE_COLORS[type] || '#8b8b8e'; }

const EDGE_ARROWS: Record<string, string> = {
  CONTAINS: 'triangle', CONNECTS_TO: 'triangle', DEPENDS_ON: 'diamond',
  EXPOSES: 'triangle', ROUTES_TO: 'triangle', MANAGED_BY: 'circle',
  CALLS: 'triangle', IMPORTS: 'triangle', EXTENDS: 'triangle', IMPLEMENTS: 'triangle',
};
function edgeArrow(type: string): string { return EDGE_ARROWS[type] || 'triangle'; }

interface NodeDetail { id: string; label: string; type: string; provider: string; region: string; properties: Record<string, string>; status?: string; iconUri?: string; tags?: string[]; }
type ViewMode = 'flat' | 'grouped' | 'tree';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  shortType: string;
  color: string;
  provider: string;
  region: string;
  properties: Record<string, string>;
  tags: string[];
  type: string;
  isStructural: boolean;
  nodeCount?: number;
  parentProvider?: string;
  treeLevel?: number;
  connections: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  label: string;
  edgeColor: string;
  edgeArrow: string;
  isBelongsTo: boolean;
  belongsToProvider?: string;
}

export function Graph() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'Graph - Zerelio'; }, []);
  const [stats, setStats] = useState<Record<string, number>>({ nodeCount: 0, edgeCount: 0, typeCount: 0 });
  const [selectedNodes, setSelectedNodes] = useState<NodeDetail[]>([]);
  const [filterText, setFilterText] = useState(searchParams.get('q') || '');
  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [themeTick, setThemeTick] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('mode') as ViewMode) || 'flat');
  const [groupedElements, setGroupedElements] = useState<any[]>([]);
  const [treeElements, setTreeElements] = useState<any[]>([]);
  const [providerStats, setProviderStats] = useState<Record<string, ProviderGroup>>({});
  const [focusNode, setFocusNode] = useState<string | null>(searchParams.get('focus') || null);
  const [detailTab, setDetailTab] = useState<'info' | 'rels' | 'docs' | 'arch' | 'drift' | 'code'>('info');
  const [impactNodes, setImpactNodes] = useState<Set<string>>(new Set()); void impactNodes;
  const [diagramMermaid, setDiagramMermaid] = useState<string | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [bulkTagStatus, setBulkTagStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalNodes, setTotalNodes] = useState(0);
  const [driftMode, setDriftMode] = useState(false);
  const [hideUnconnected, setHideUnconnected] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [driftData, setDriftData] = useState<any>(null);
  const [showDrift, setShowDrift] = useState(false);

  const rawNodesRef = useRef<any[]>([]);
  const rawEdgesRef = useRef<any[]>([]);
  const edgesForRels = useRef<any[]>([]);
  const filterInitialized = useRef(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const svgElRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const simRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const d3LinksRef = useRef<D3Link[]>([]);
  const selectedInCanvas = useRef<Set<string>>(new Set());

  // ─── Sync state to URL ──────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewMode !== 'flat') params.set('mode', viewMode);
    if (filterText) params.set('q', filterText);
    if (filterType) params.set('type', filterType);
    if (focusNode) params.set('focus', focusNode);
    setSearchParams(params, { replace: true });
  }, [viewMode, filterText, filterType, focusNode, setSearchParams]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '1') setViewMode('flat');
      else if (e.key === '2') setViewMode('grouped');
      else if (e.key === '3') setViewMode('tree');
      else if (e.key === 'f' || e.key === 'F') zoomFit();
      else if (e.key === '/') document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      else if (e.key === 'g' || e.key === 'G') zoomFit();
      else if (e.key === 'r' || e.key === 'R') resetSimulation();
      else if (e.key === 'Escape') handleBgTap();
      else if (e.key === 'd' || e.key === 'D') setDriftMode(m => !m);
      else if (e.key === '?') setShowShortcuts(s => !s);
      else if (e.key === 't' || e.key === 'T') setViewMode(m => m === 'tree' ? 'flat' : 'tree');
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const ids = new Set(d3NodesRef.current.filter(n => !n.isStructural).map(n => n.id));
        setSelectedNodes(d3NodesRef.current.filter(n => !n.isStructural).map(n => ({ id: n.id, label: n.label, type: n.type, provider: n.provider, region: n.region, properties: n.properties, tags: n.tags })));
        selectedInCanvas.current = ids;
        syncSelectedFromCanvas();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Theme observer ─────────────────────────────────────────────────────
  useEffect(() => {
    const o = new MutationObserver(() => setThemeTick(t => t + 1));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => o.disconnect();
  }, []);

  // ─── Data load ───────────────────────────────────────────────────────────
  const loadRef = useRef(0);
  useEffect(() => {
    const id = ++loadRef.current;
    let timer: any = null;
    function load() {
      fetch('/api/v1/graph/export').then(r => r.json()).then((graphData) => {
        if (id !== loadRef.current) return;
        const gd = graphData.data || graphData;
        const nodes = gd.nodes || [];
        const edges = gd.edges || [];
        rawNodesRef.current = nodes;
        rawEdgesRef.current = edges;
        edgesForRels.current = edges;

        const { elements: grouped, providerStats: ps } = buildGroupedElements(nodes, edges);
        setGroupedElements(grouped); setProviderStats(ps);
        const { elements: tree } = buildHierarchicalElements(nodes, edges);
        setTreeElements(tree);

        const cyElements: any[] = [];
        nodes.forEach((n: any, i: number) => {
          const type = n.type || n.Type || 'unknown';
          const iconUri = getIconDataUri(type);
          const statusKey = n.properties?.state || n.properties?.status || n.Properties?.state || n.Properties?.status;
          const statusDot = getStatusDot(statusKey);
          const color = providerColor((n.provider || n.Provider || '').toLowerCase()) || metaFor(type).bg;
          cyElements.push({ classes: '', data: {
            id: n.id || n.ID || 'n'+i,
            label: n.name || n.Name || n.id || 'n'+i,
            type, shortType: shortType(type), color, iconUri, statusDot,
            provider: n.provider || n.Provider || '',
            region: n.region || n.Region || '',
            properties: n.properties || n.Properties || {},
            tags: n.tags || n.Tags || [],
          }});
        });
        const validNodeIds = new Set(cyElements.map((el: any) => el.data.id));
        edges.forEach((e: any) => {
          const src = e.source_id || e.SourceID || e.source || '';
          const tgt = e.target_id || e.TargetID || e.target || '';
          if (!validNodeIds.has(src) || !validNodeIds.has(tgt)) return;
          const type = e.type || e.Type || e.relationship_type || '';
          cyElements.push({ data: {
            id: src+'-'+tgt, source: src, target: tgt,
            label: type, edgeType: type,
            edgeColor: edgeColor(type), edgeArrow: edgeArrow(type),
          }});
        });
        const tc: Record<string, number> = {};
        nodes.forEach((n: any) => { const t = shortType(n.type || n.Type || 'unknown'); tc[t] = (tc[t]||0) + 1; });
        setElements(cyElements);
        setStats({ nodeCount: nodes.length, edgeCount: edges.length, typeCount: Object.keys(tc).length });
        setTotalNodes(nodes.length);
        setPage(1);
        filterInitialized.current = false;
        setLoading(false);
      }).catch(() => { if (id === loadRef.current) { setLoading(false); timer = setTimeout(load, 1500); } });
    }
    load();
    return () => { loadRef.current++; if (timer) clearTimeout(timer); };
  }, []);

  // ─── Drift fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!driftMode) { setDriftData(null); setShowDrift(false); return; }
    fetch('/api/v1/terraform/drift').then(r => r.json()).then((res) => {
      const d = res.data || res;
      setDriftData(d);
      setShowDrift(true);
    }).catch(() => { setDriftData(null); });
  }, [driftMode]);

  // ─── Pagination: slice active elements ──────────────────────────────────
  const activeElements = useMemo(() => {
    const source = viewMode === 'tree' ? treeElements : viewMode === 'grouped' ? groupedElements : elements;
    const limit = page * pageSize;
    if (totalNodes <= limit) return source;
    const structuralTypes = new Set(['tree-provider', 'tree-account', 'tree-type', 'provider-group']);
    const structural: any[] = [];
    const paginated: any[] = [];
    let resourceCount = 0;
    for (const el of source) {
      if (el.data && el.data.source && el.data.target && !el.data.isProvider) {
        paginated.push(el);
      } else if (el.data && structuralTypes.has(el.data.type)) {
        structural.push(el);
      } else if (el.classes === 'belongs-to') {
        structural.push(el);
      } else {
        if (resourceCount < limit) { paginated.push(el); resourceCount++; }
      }
    }
    const result = [...structural, ...paginated];
    const includedIds = new Set<string>();
    paginated.forEach((el: any) => { if (el.data && el.data.id && !el.data.source) includedIds.add(el.data.id); });
    return result.filter((el: any) => {
      if (!el.data || !el.data.source) return true;
      return includedIds.has(el.data.source) && includedIds.has(el.data.target);
    });
  }, [viewMode, groupedElements, treeElements, elements, page, pageSize, totalNodes]);

  // ─── Filter logic ───────────────────────────────────────────────────────
  function isNodeVisible(node: D3Node): boolean {
    if (!filterText && !filterType) return true;
    const q = filterText.toLowerCase().trim();
    if (node.isStructural) return true;
    const match = !q || node.label.toLowerCase().includes(q) || node.shortType.toLowerCase().includes(q);
    const typeMatch = !filterType || node.shortType === filterType;
    return match && typeMatch;
  }

  // ─── Convert elements to D3 data ───────────────────────────────────────
  function buildD3Data(elems: any[]) {
        const nodeMap = new Map<string, any>();
    const pairs = new Set<string>();

    elems.forEach((el: any) => {
      if (!el.data || el.data.source) return;
      const d = el.data;
      const isStruct = ['tree-provider', 'tree-account', 'tree-type', 'provider-group'].includes(d.type);
      nodeMap.set(d.id, {
        id: d.id, label: d.label || d.id,
        shortType: d.shortType || shortType(d.type || ''),
        color: d.color || metaFor(d.type || '').bg,
        provider: d.provider || '', region: d.region || '',
        properties: d.properties || {}, tags: d.tags || [],
        type: d.type || 'unknown',
        isStructural: isStruct,
        nodeCount: d.nodeCount,
        parentProvider: d.parentProvider,
        treeLevel: d.treeLevel,
        connections: 0,
      });
    });

    const links: any[] = [];
    elems.forEach((el: any) => {
      if (!el.data || !el.data.source) return;
      const src = el.data.source;
      const tgt = el.data.target;
      if (!nodeMap.has(src) || !nodeMap.has(tgt)) return;
      const pairKey = src < tgt ? `${src}-${tgt}` : `${tgt}-${src}`;
      if (pairs.has(pairKey)) return;
      pairs.add(pairKey);

      const isBelongsTo = el.classes === 'belongs-to';
      links.push({
        id: el.data.id || `${src}-${tgt}`,
        source: src, target: tgt,
        label: el.data.label || '',
        edgeColor: isBelongsTo ? colorWithAlpha(providerColor(el.data.belongsToProvider || ''), 0.2) : (el.data.edgeColor || '#8b8b8e'),
        edgeArrow: el.data.edgeArrow || 'triangle',
        isBelongsTo,
        belongsToProvider: el.data.belongsToProvider,
      });
      const srcNode = nodeMap.get(src);
      const tgtNode = nodeMap.get(tgt);
      if (!isBelongsTo && srcNode && tgtNode) {
        srcNode.connections += 1;
        tgtNode.connections += 1;
      }
    });

    const nodes = Array.from(nodeMap.values());
    return { nodes, links };
  }

  // ─── Highlight helpers ──────────────────────────────────────────────────
  function getNeighborIds(nodeId: string): Set<string> {
    const ids = new Set<string>();
    ids.add(nodeId);
    d3LinksRef.current.forEach(l => {
      const sid = typeof l.source === 'object' ? (l.source as D3Node).id : String(l.source);
      const tid = typeof l.target === 'object' ? (l.target as D3Node).id : String(l.target);
      if (sid === nodeId) ids.add(tid);
      if (tid === nodeId) ids.add(sid);
    });
    return ids;
  }

  function applyHighlight(selectedIds: Set<string>) {
    const neighborIds = new Set<string>();
    selectedIds.forEach(id => {
      getNeighborIds(id).forEach(nid => neighborIds.add(nid));
    });

    const svg = svgElRef.current;
    if (!svg) return;

    // Card-style nodes
    svg.selectAll<SVGRectElement, D3Node>('rect.node-card-bg')
      .transition().duration(250).ease(d3.easeQuadOut)
      .attr('opacity', d => {
        if (selectedIds.size === 0) return 1;
        if (selectedIds.has(d.id)) return 1;
        if (neighborIds.has(d.id)) return 0.7;
        return 0.12;
      })
      .attr('stroke', d => selectedIds.has(d.id) ? colorWithAlpha(d.color, 0.9) : colorWithAlpha(d.color, 0.4))
      .attr('stroke-width', d => selectedIds.has(d.id) ? 2.5 : 1.5)
      .attr('filter', d => selectedIds.has(d.id) ? 'url(#node-glow)' : 'none');

    // Card text
    svg.selectAll<SVGTextElement, D3Node>('text.node-card-name, text.node-card-type')
      .transition().duration(250).ease(d3.easeQuadOut)
      .attr('opacity', d => {
        if (selectedIds.size === 0) return 1;
        if (selectedIds.has(d.id)) return 1;
        if (neighborIds.has(d.id)) return 0.7;
        return 0.12;
      });

    svg.selectAll<SVGRectElement, D3Node>('rect.node-card-bar')
      .transition().duration(250).ease(d3.easeQuadOut)
      .attr('opacity', d => {
        if (selectedIds.size === 0) return 1;
        if (selectedIds.has(d.id)) return 1;
        if (neighborIds.has(d.id)) return 0.7;
        return 0.12;
      });

    // Structural node circles
    svg.selectAll<SVGCircleElement, D3Node>('circle.node-circle')
      .transition().duration(250).ease(d3.easeQuadOut)
      .attr('opacity', d => {
        if (selectedIds.size === 0) return 1;
        if (selectedIds.has(d.id)) return 1;
        if (neighborIds.has(d.id)) return 0.7;
        return 0.15;
      })
      .attr('stroke-width', d => selectedIds.has(d.id) ? 4 : 2);

    svg.selectAll<SVGLineElement, D3Link>('line.node-edge')
      .transition().duration(200)
      .attr('opacity', d => {
        if (selectedIds.size === 0) return d.isBelongsTo ? 0.15 : 0.5;
        const sid = typeof d.source === 'object' ? (d.source as D3Node).id : String(d.source);
        const tid = typeof d.target === 'object' ? (d.target as D3Node).id : String(d.target);
        if (selectedIds.has(sid) || selectedIds.has(tid) || neighborIds.has(sid) || neighborIds.has(tid)) {
          return d.isBelongsTo ? 0.3 : 0.8;
        }
        return 0.04;
      })
      .attr('stroke-width', d => {
        if (selectedIds.size === 0) return d.isBelongsTo ? 0.5 : 1;
        const sid = typeof d.source === 'object' ? (d.source as D3Node).id : String(d.source);
        const tid = typeof d.target === 'object' ? (d.target as D3Node).id : String(d.target);
        return (selectedIds.has(sid) || selectedIds.has(tid)) ? 2.5 : (d.isBelongsTo ? 0.5 : 1);
      });
  }

  function syncSelectedFromCanvas() {
    const selected = d3NodesRef.current.filter(n => selectedInCanvas.current.has(n.id) && !n.isStructural);
    setSelectedNodes(selected.map(n => ({
      id: n.id, label: n.label, type: n.type,
      provider: n.provider, region: n.region,
      properties: n.properties, tags: n.tags,
    })));
    applyHighlight(selectedInCanvas.current);
  }

  function handleBgTap() {
    selectedInCanvas.current.clear();
    setSelectedNodes([]); setFocusNode(null); setDetailTab('info'); setImpactNodes(new Set()); setDiagramMermaid(null);
    applyHighlight(new Set());
  }

  const collapsedRefs = useRef<Set<string>>(new Set()); // IDs of collapsed structural nodes

  function handleNodeClick(event: MouseEvent, d: D3Node) {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    // Structural nodes (providers, accounts, type groups) toggle children
    if (d.isStructural) {
      const collapsed = collapsedRefs.current;
      if (viewMode === 'grouped' && d.type === 'provider-group') {
        // In grouped view, toggle all resource children of this provider
        const allChildren = d3NodesRef.current.filter(n => !n.isStructural && n.parentProvider === d.provider);
        const isCollapsing = !collapsed.has(d.id);
        if (isCollapsing) collapsed.add(d.id); else collapsed.delete(d.id);

        const svg = svgElRef.current;
        if (svg) {
          allChildren.forEach(c => {
            svg.selectAll<SVGGElement, D3Node>('g.node-group')
              .filter((nd: D3Node) => nd.id === c.id)
              .transition().duration(200)
              .attr('opacity', isCollapsing ? 0.06 : 1)
              .style('pointer-events', isCollapsing ? 'none' : 'auto');
          });
          svg.selectAll<SVGLineElement, D3Link>('line.node-edge')
            .filter((l: D3Link) => l.isBelongsTo && l.belongsToProvider === d.provider)
            .transition().duration(200)
            .attr('opacity', isCollapsing ? 0 : 0.15);
        }
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      if (selectedInCanvas.current.has(d.id)) selectedInCanvas.current.delete(d.id);
      else selectedInCanvas.current.add(d.id);
    } else {
      selectedInCanvas.current.clear();
      selectedInCanvas.current.add(d.id);
    }
    syncSelectedFromCanvas();
  }

  // ─── D3 Force Simulation ────────────────────────────────────────────────
  function resetSimulation() {
    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }
    initSimulation();
  }

  function initSimulation() {
    const container = svgRef.current;
    if (!container || activeElements.length === 0) return;

    const rect = container.getBoundingClientRect();
    const W = rect.width || 800;
    const H = rect.height || 600;

    container.innerHTML = '';
    svgElRef.current = null;

    const { nodes: rawNodes, links: rawLinks } = buildD3Data(activeElements);
    d3NodesRef.current = rawNodes;
    d3LinksRef.current = rawLinks;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('cursor', 'grab');

    svgElRef.current = svg;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 20])
      .on('zoom', (event) => {
        gMain.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svg.node()) handleBgTap();
    });

    const gMain = svg.append('g').attr('class', 'main-group');



    const gEdges = gMain.append('g').attr('class', 'edges');
    const gNodes = gMain.append('g').attr('class', 'nodes');

    const linkElements = gEdges.selectAll<SVGLineElement, D3Link>('line')
      .data(rawLinks)
      .enter().append('line')
      .attr('class', 'node-edge')
      .attr('stroke', d => d.edgeColor)
      .attr('stroke-width', d => d.isBelongsTo ? 0.5 : 1)
      .attr('opacity', d => d.isBelongsTo ? 0.15 : 0.5)
      .attr('stroke-dasharray', d => d.isBelongsTo ? '3 3' : 'none');

    const nodeGroups = gNodes.selectAll<SVGGElement, D3Node>('g.node-group')
      .data(rawNodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: D3Node) => handleNodeClick(event, d));

    // --- Structural nodes (providers, accounts, type groups) stay as circles ---
    nodeGroups.filter(d => d.isStructural).append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => d.type === 'tree-provider' || d.type === 'provider-group' ? 36 : d.type === 'tree-account' ? 20 : 22)
      .attr('fill', d => colorWithAlpha(d.color, 0.85))
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    nodeGroups.filter(d => d.isStructural)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'tree-provider' || d.type === 'provider-group' ? 5 : 4)
      .attr('fill', '#fff')
      .attr('font-size', d => d.type === 'tree-provider' || d.type === 'provider-group' ? '11px' : '9px')
      .attr('font-weight', 'bold')
      .text(d => d.label + (d.nodeCount ? ' (' + d.nodeCount + ')' : ''));

    // --- Resource nodes: card-style panels (inspired by Understand-Anything) ---
    const resGroups = nodeGroups.filter(d => !d.isStructural);

    // Background rounded rect
    resGroups.append('rect')
      .attr('class', 'node-card-bg')
      .attr('x', -36).attr('y', -10)
      .attr('width', 72).attr('height', 20)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', 'hsl(var(--card))')
      .attr('stroke', d => colorWithAlpha(d.color, 0.4))
      .attr('stroke-width', 1.5);

    // Left color bar (4px wide)
    resGroups.append('rect')
      .attr('class', 'node-card-bar')
      .attr('x', -36).attr('y', -10)
      .attr('width', 4).attr('height', 20)
      .attr('rx', 2).attr('ry', 2)
      .attr('fill', d => d.color);

    // Type label (small, uppercase, above name)
    resGroups.append('text')
      .attr('class', 'node-card-type')
      .attr('x', -28).attr('y', -3)
      .attr('fill', d => d.color)
      .attr('font-size', '6px')
      .attr('font-weight', '600')
      .attr('text-transform', 'uppercase')
      .text(d => d.shortType);

    // Resource name label
    resGroups.append('text')
      .attr('class', 'node-card-name')
      .attr('x', -28).attr('y', 6)
      .attr('fill', '#e1e1e3')
      .attr('font-size', '8px')
      .attr('font-weight', '500')
      .text(d => {
        const n = d.label;
        return n.length > 14 ? n.slice(0, 12) + '..' : n;
      });

    // Glow filter for selected nodes
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    nodeGroups.call(d3.drag<SVGGElement, D3Node>()
      .on('start', function(this: SVGGElement, _event: any, d: D3Node) {
        d.fx = d.x;
        d.fy = d.y;
        sim.alphaTarget(0.3).restart();
      })
      .on('drag', function(this: SVGGElement, event: any, d: D3Node) {
        const pt = d3.pointer(event.sourceEvent, gMain.node());
        d.fx = pt[0];
        d.fy = pt[1];
      })
      .on('end', function(this: SVGGElement, _event: any, d: D3Node) {
        d.fx = null;
        d.fy = null;
        sim.alphaTarget(0);
      }) as any);

    const sim = d3.forceSimulation<D3Node>(rawNodes)
      .force('link', d3.forceLink<D3Node, D3Link>(rawLinks)
        .id(d => d.id)
        .distance(d => (d as D3Link).isBelongsTo ? 10 : 80)
        .strength(d => (d as D3Link).isBelongsTo ? 0.003 : 0.4))
      .force('charge', d3.forceManyBody<D3Node>()
        .strength(d => d.isStructural ? -500 : -200 - (d.connections || 0) * 5)
        .distanceMax(800))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
      .force('collide', d3.forceCollide<D3Node>(d => d.isStructural ? 50 : 22).strength(0.6))
      .alphaDecay(0.02)
      .velocityDecay(0.3)
      .alphaMin(0.001)
      .on('tick', () => {
        linkElements
          .attr('x1', d => ((d.source as D3Node).x || 0))
          .attr('y1', d => ((d.source as D3Node).y || 0))
          .attr('x2', d => ((d.target as D3Node).x || 0))
          .attr('y2', d => ((d.target as D3Node).y || 0));

        nodeGroups.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
      });

    // Pre-converge: spread nodes out via synchronous ticks
    sim.alpha(1).restart();
    sim.tick(Math.max(100, Math.min(500, rawNodes.length * 2)));

    // Compute bounding box from positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rawNodes.forEach(n => {
      if (n.x === undefined || n.y === undefined) return;
      const rx = n.isStructural ? 44 : 40;
      const ry = n.isStructural ? 44 : 14;
      if (n.x - rx < minX) minX = n.x - rx;
      if (n.y - ry < minY) minY = n.y - ry;
      if (n.x + rx > maxX) maxX = n.x + rx;
      if (n.y + ry > maxY) maxY = n.y + ry;
    });

    if (minX !== Infinity) {
      const bw = maxX - minX, bh = maxY - minY;
      const padding = 60;
      const scale = Math.min(W / (bw + padding * 2), H / (bh + padding * 2), 1.2);
      const tx = W / 2 - (minX + bw / 2) * scale;
      const ty = H / 2 - (minY + bh / 2) * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    simRef.current = sim;
  }

  // ─── Zoom controls ─────────────────────────────────────────────────────
  function zoomFit() {
    if (!svgElRef.current || !zoomRef.current || !svgRef.current) return;
    const container = svgRef.current.getBoundingClientRect();
    const W = container.width || 800;
    const H = container.height || 600;
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      d3NodesRef.current.forEach(n => {
        if (n.x === undefined || n.y === undefined) return;
        const rx = n.isStructural ? 44 : 40;
        const ry = n.isStructural ? 44 : 14;
        if (n.x - rx < minX) minX = n.x - rx;
        if (n.y - ry < minY) minY = n.y - ry;
        if (n.x + rx > maxX) maxX = n.x + rx;
        if (n.y + ry > maxY) maxY = n.y + ry;
      });
      if (minX !== Infinity) {
        const bw = maxX - minX, bh = maxY - minY;
        const padding = 80;
        const scale = Math.min(W / (bw + padding * 2), H / (bh + padding * 2), 2);
        const tx = W / 2 - (minX + bw / 2) * scale;
        const ty = H / 2 - (minY + bh / 2) * scale;
        svgElRef.current.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    } catch {}
  }

  function zoomIn() {
    if (!svgElRef.current || !zoomRef.current) return;
    svgElRef.current.transition().duration(200).call(zoomRef.current.scaleBy, 1.3);
  }

  function zoomOut() {
    if (!svgElRef.current || !zoomRef.current) return;
    svgElRef.current.transition().duration(200).call(zoomRef.current.scaleBy, 1 / 1.3);
  }

  // ─── Trace impact ───────────────────────────────────────────────────────
  async function traceImpact(nodeId: string) {
    try {
      const res = await fetch('/api/v1/graph/neighborhood/' + encodeURIComponent(nodeId) + '?hops=2');
      const data = await res.json();
      const gd = data.data || data;
      const impacted: string[] = (gd.impacted || []).map((h: any) => h.resource_id);
      setImpactNodes(new Set(impacted));

      const svg = svgElRef.current;
      if (!svg) return;

      svg.selectAll('rect.node-card-bg')
        .transition().duration(400).ease(d3.easeQuadOut)
        .attr('opacity', d => {
          const n = d as D3Node;
          if (impacted.includes(n.id)) return 1;
          if (selectedInCanvas.current.has(n.id)) return 1;
          return 0.12;
        })
        .attr('stroke', d => {
          const n = d as D3Node;
          return impacted.includes(n.id) ? '#ef4444' : colorWithAlpha(n.color, 0.4);
        })
        .attr('stroke-width', d => impacted.includes((d as D3Node).id) ? 3 : 1.5);

      svg.selectAll('text.node-card-name, text.node-card-type, rect.node-card-bar')
        .transition().duration(400).ease(d3.easeQuadOut)
        .attr('opacity', d => {
          const n = d as D3Node;
          if (impacted.includes(n.id)) return 1;
          if (selectedInCanvas.current.has(n.id)) return 1;
          return 0.12;
        });

      svg.selectAll('circle.node-circle')
        .transition().duration(400).ease(d3.easeQuadOut)
        .attr('opacity', d => {
          const n = d as D3Node;
          if (impacted.includes(n.id)) return 1;
          return 0.15;
        })
        .attr('stroke', d => {
          const n = d as D3Node;
          return impacted.includes(n.id) ? '#ef4444' : n.color;
        })
        .attr('stroke-width', d => (d as D3Node).isStructural && impacted.includes((d as D3Node).id) ? 4 : 2);
    } catch {}
  }

  // ─── Fetch architecture diagram ─────────────────────────────────────────
  async function fetchArchitecture(forceRefresh = false) {
    if (diagramMermaid && !forceRefresh) return;
    try {
      const res = await fetch('/api/v1/graph/diagram');
      const data = await res.json();
      const gd = data.data || data;
      setDiagramMermaid(gd.diagram || 'No diagram available');
    } catch {}
  }

  // ─── Get connected resources ────────────────────────────────────────────
  function getConnectedResources(nodeId: string): { id: string; label: string; type: string; rel: string; direction: 'in' | 'out' }[] {
    const result: any[] = [];
    d3LinksRef.current.forEach(l => {
      if (l.isBelongsTo) return;
      const s = typeof l.source === 'object' ? (l.source as D3Node).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as D3Node).id : l.target;
      if (s !== nodeId && t !== nodeId) return;
      const otherId = s === nodeId ? t : s;
      const other = d3NodesRef.current.find(n => n.id === otherId);
      if (other) {
        result.push({
          id: other.id, label: other.label, type: other.type,
          rel: l.label, direction: s === nodeId ? 'out' : 'in' as 'out' | 'in',
        });
      }
    });
    return result;
  }

  // ─── Init/rebuild simulation on data change ─────────────────────────────
  useEffect(() => {
    if (loading || activeElements.length === 0) return;
    initSimulation();
    return () => {
      if (simRef.current) simRef.current.stop();
    };
  }, [loading, activeElements, viewMode, themeTick]);

  // ─── Apply filter visibility ───────────────────────────────────────────
  useEffect(() => {
    const svg = svgElRef.current;
    if (!svg || d3NodesRef.current.length === 0) return;
    svg.selectAll<SVGGElement, D3Node>('g.node-group')
      .transition().duration(200).ease(d3.easeQuadOut)
      .attr('opacity', d => isNodeVisible(d) ? 1 : 0.06)
      .style('pointer-events', d => isNodeVisible(d) ? 'auto' : 'none');
  }, [filterText, filterType]);

  // ─── Apply drift overlay ───────────────────────────────────────────────
  useEffect(() => {
    const svg = svgElRef.current;
    if (!svg || !showDrift || !driftData || d3NodesRef.current.length === 0) return;
    const missingIds = new Set((driftData.missing || []).map((d: any) => d.resource_id));
    const unmanagedIds = new Set((driftData.unmanaged || []).map((d: any) => d.resource_id));
    svg.selectAll<SVGRectElement, D3Node>('rect.node-card-bg')
      .attr('stroke', d => {
        if (missingIds.has(d.id)) return '#ef4444';
        if (unmanagedIds.has(d.id)) return '#f59e0b';
        if (d.properties?.source?.toLowerCase() === 'terraform') return '#a855f7';
        return colorWithAlpha(d.color, 0.4);
      })
      .attr('stroke-width', d => {
        if (missingIds.has(d.id) || unmanagedIds.has(d.id)) return 3;
        if (d.properties?.source?.toLowerCase() === 'terraform') return 2.5;
        return 1.5;
      });

    svg.selectAll<SVGRectElement, D3Node>('rect.node-card-bar')
      .attr('fill', d => {
        if (missingIds.has(d.id)) return '#ef4444';
        if (unmanagedIds.has(d.id)) return '#f59e0b';
        if (d.properties?.source?.toLowerCase() === 'terraform') return '#a855f7';
        return d.color;
      });
  }, [showDrift, driftData]);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (<div className="p-8 space-y-4 animate-fade"><div className="h-8 w-64 rounded-lg bg-[hsl(var(--card))] animate-pulse" /><div className="h-[400px] rounded-xl bg-[hsl(var(--card))] animate-pulse" /></div>);
  }

  if (elements.length === 0) {
    return (<div className="p-8 space-y-6 animate-fade"><h1 className="text-2xl font-semibold">Infrastructure Graph</h1><div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-16 text-center"><p className="text-[#8b8b8e]">No infrastructure discovered yet.</p><p className="text-[#5c5c5e] text-sm mt-1">Create a connector and run discovery first.</p><button onClick={() => window.location.href = '/graph?r='+Date.now()} className="mt-4 px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium">Retry</button></div></div>);
  }

  return (
    <div className="p-8 space-y-3 animate-fade animate-slide-up h-full flex flex-col">
      {/* Header bar */}
      <GlassCard className="!p-4 !py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Infrastructure Graph</h1>
          <p className="text-[#8b8b8e] text-sm mt-0.5">
            {stats.nodeCount} resources · {stats.edgeCount} connections · {stats.typeCount} types
            {viewMode === 'grouped' && ` · ${Object.keys(providerStats).length} providers`}
            {focusNode && ` · focus`}
            {selectedNodes.length > 0 && ` · ${selectedNodes.length} selected`}
            {totalNodes > pageSize && ` · showing ${Math.min(page * pageSize, totalNodes)} of ${totalNodes} resources`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('flat')} className={`px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${viewMode === 'flat' ? 'bg-[#6c5ce7] text-white' : 'text-[#8b8b8e] hover:text-white'}`}>Flat</button>
            <button onClick={() => setViewMode('grouped')} className={`px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${viewMode === 'grouped' ? 'bg-[#6c5ce7] text-white' : 'text-[#8b8b8e] hover:text-white'}`}>Grouped</button>
            <button onClick={() => setViewMode('tree')} className={`px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${viewMode === 'tree' ? 'bg-[#6c5ce7] text-white' : 'text-[#8b8b8e] hover:text-white'}`}>Tree</button>
          </div>
          <button onClick={zoomFit} className="px-2.5 py-1.5 text-[11px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all">Fit</button>
          <button onClick={resetSimulation} className="px-2.5 py-1.5 text-[11px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all" title="Re-run force layout">Reset Layout</button>
          <button onClick={() => setDriftMode(m => !m)} className={`px-2.5 py-1.5 text-[11px] border rounded-lg font-medium transition-all ${driftMode ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#a855f7]' : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>Drift</button>
          <button onClick={() => setHideUnconnected(h => !h)} className={`px-2.5 py-1.5 text-[11px] border rounded-lg font-medium transition-all ${hideUnconnected ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#a855f7]' : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>Hide Isolated</button>
          {focusNode && <button onClick={() => setFocusNode(null)} className="px-2.5 py-1.5 text-[11px] bg-[#6c5ce7]/10 border border-[#6c5ce7]/30 rounded-lg text-[#6c5ce7] font-medium hover:bg-[#6c5ce7]/20 transition-all">Clear Focus</button>}
        </div>
      </GlassCard>

      {/* Filters + provider pills */}
      <GlassCard className="!p-3 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5e] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Search nodes..." className="pl-8 pr-2.5 py-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[11px] text-[hsl(var(--foreground))] placeholder-[#5c5c5e] focus:outline-none focus:border-[#6c5ce7]/50 w-36 transition-all duration-200 ease-out" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-2.5 py-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[11px] text-[hsl(var(--foreground))] focus:outline-none focus:border-[#6c5ce7]/50">
          <option value="">All types</option>
          {(() => { const s = new Set<string>(); elements.forEach((el: any) => { if (!el.data.source && el.data.shortType) s.add(el.data.shortType); }); return Array.from(s).sort().map(t => <option key={t} value={t}>{t}</option>); })()}
        </select>
        {(filterText || filterType || focusNode) && <button onClick={() => { setFilterText(''); setFilterType(''); setFocusNode(null); }} className="text-[11px] text-[#6c5ce7] hover:text-[#a29bfe] whitespace-nowrap">Clear</button>}

        {Object.keys(providerStats).length > 0 && (
          <div className="flex gap-1 ml-1 pl-2 border-l border-[hsl(var(--border))]">
            {Object.entries(providerStats).sort().map(([provider, group]) => (
              <button key={provider} onClick={() => {
                const s = svgElRef.current;
                if (!s) return;
                s.selectAll<SVGGElement, D3Node>('g.node-group')
                  .filter((d: D3Node) => d.provider === provider && !d.isStructural)
                  .each(function() {
                    const el = d3.select(this);
                    const cur = parseFloat(el.attr('opacity') || '1');
                    el.transition().duration(200)
                      .attr('opacity', cur > 0.5 ? 0.08 : 1)
                      .style('pointer-events', cur > 0.5 ? 'none' : 'auto');
                  });
              }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80 whitespace-nowrap"
                style={{ background: colorWithAlpha(providerColor(provider), 0.15), color: providerColor(provider), border: `1px solid ${colorWithAlpha(providerColor(provider), 0.3)}` }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(provider) }} />
                <span>{provider.charAt(0).toUpperCase()+provider.slice(1)} ({group.count})</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Large graph warning banner */}
      {totalNodes >= LARGE_GRAPH_THRESHOLD && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-xs">
          <span className="text-[#f59e0b] font-medium">Large graph detected</span>
          <span className="text-[#e1e1e3]">
            showing {Math.min(page * pageSize, totalNodes)} of {totalNodes} resources — some nodes are hidden for performance.
          </span>
          <button onClick={() => { setPage(Math.ceil(totalNodes / pageSize)); }}
            className="ml-auto px-2 py-0.5 rounded text-[10px] font-medium text-[#f59e0b] hover:bg-[rgba(245,158,11,0.15)] transition-all">
            Load all
          </button>
        </div>
      )}

      {/* Main area - D3.js Force Simulation */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden">
          <div ref={svgRef} className="w-full h-full" />

          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20">
            <button onClick={zoomIn} className="w-8 h-8 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center justify-center text-sm font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] active:scale-[0.93] transition-all duration-150" title="Zoom in">+</button>
            <button onClick={zoomOut} className="w-8 h-8 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center justify-center text-sm font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] active:scale-95 transition-all duration-150 ease-out" title="Zoom out">-</button>
            <button onClick={zoomFit} className="w-8 h-8 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center justify-center text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] active:scale-95 transition-all duration-150 ease-out" title="Fit all">&#x229E;</button>
            <button onClick={() => setShowShortcuts(s => !s)} className="w-8 h-8 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg flex items-center justify-center text-xs font-bold text-[#6c5ce7] hover:bg-[hsl(var(--muted))] active:scale-95 transition-all duration-150 ease-out" title="Keyboard shortcuts">?</button>
          </div>

          {/* Keyboard shortcuts overlay */}
          {showShortcuts && (
            <div className="absolute inset-0 z-30 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
              <div className="w-72 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
                  <span className="text-sm font-semibold">Keyboard Shortcuts</span>
                  <button onClick={() => setShowShortcuts(false)} className="text-xs text-[#5c5c5e] hover:text-white">&#x2715;</button>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  {[
                    ['1 / 2 / 3', 'Switch view (flat / grouped / tree)'],
                    ['t', 'Toggle tree view'],
                    ['g', 'Focus selected node'],
                    ['r', 'Reset layout'],
                    ['f', 'Fit all to viewport'],
                    ['d', 'Toggle drift mode'],
                    ['Escape', 'Clear selection'],
                    ['Ctrl+A / Cmd+A', 'Select all visible nodes'],
                    ['?', 'Toggle this panel'],
                    ['/', 'Focus search'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[10px] font-mono text-[hsl(var(--foreground))]">{key}</kbd>
                      <span className="text-[#8b8b8e] ml-2 text-right">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Load More button bar */}
          {totalNodes > page * pageSize && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg">
              <span className="text-[11px] text-[#8b8b8e] whitespace-nowrap">
                Showing {Math.min(page * pageSize, totalNodes)} of {totalNodes} resources
              </span>
              <button onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded text-[11px] font-medium bg-[#6c5ce7] text-white hover:bg-[#5a4bd1] transition-all whitespace-nowrap">
                Load More
              </button>
              <button onClick={() => setPage(Math.ceil(totalNodes / pageSize))}
                className="px-3 py-1 rounded text-[11px] font-medium text-[#8b8b8e] hover:text-white hover:bg-[hsl(var(--muted))] transition-all whitespace-nowrap">
                Load All
              </button>
            </div>
          )}
        </div>

        {/* Type & Edge legend */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 max-w-[300px]">
          <GlassCard className="!p-2 !py-1.5 text-[10px]">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
                <span key={type} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2.5 h-[2px] rounded-full" style={{ background: color }} />
                  <span className="text-[#8b8b8e]">{type}</span>
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Selection toolbar */}
        {selectedNodes.length > 1 && (
          <GlassCard className="absolute top-2 left-2 z-30 !p-2 flex items-center gap-2 shadow-xl">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))] whitespace-nowrap">{selectedNodes.length} resources selected</span>
            <div className="w-px h-5 bg-[hsl(var(--border))]" />
            <GradientButton onClick={() => setTagDialogOpen(true)} className="!text-[10px] !px-2.5 !py-1">Tag</GradientButton>
            <button onClick={() => {
              const exportData = selectedNodes.map((n: NodeDetail) => ({
                id: n.id, label: n.label, type: n.type, provider: n.provider, region: n.region, properties: n.properties,
              }));
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'resources-export.json'; a.click();
              URL.revokeObjectURL(url);
            }} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all whitespace-nowrap">Export</button>
            <button onClick={zoomFit} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all whitespace-nowrap">Focus</button>
            <button onClick={handleBgTap} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all whitespace-nowrap">Clear</button>
          </GlassCard>
        )}

        {/* Bulk tag dialog */}
        {tagDialogOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20" onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }}>
            <div className="w-80 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'scale-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both' }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
                <span className="text-sm font-semibold">Tag {selectedNodes.length} resources</span>
                <button onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }} className="text-xs text-[#5c5c5e] hover:text-white">&#x2715;</button>
              </div>
              <div className="p-4 space-y-3">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Enter tags, comma-separated" className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-xs text-[hsl(var(--foreground))] placeholder-[#5c5c5e] focus:outline-none focus:border-[#6c5ce7]/50" />
                {bulkTagStatus && <p className={`text-[11px] ${bulkTagStatus.includes('failed') || bulkTagStatus.includes('Error') ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{bulkTagStatus}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all">Cancel</button>
                  <button onClick={async () => {
                    const tags = tagInput.split(',').map((t: string) => t.trim()).filter(Boolean);
                    if (tags.length === 0) { setBulkTagStatus('Please enter at least one tag.'); return; }
                    setBulkTagStatus('Applying tags...');
                    try {
                      const res = await fetch('/api/v1/resources/bulk/tag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedNodes.map((n: NodeDetail) => n.id), tags }),
                      });
                      const data = await res.json();
                      if (data.data?.status === 'tagged' || data.status === 'tagged') {
                        setBulkTagStatus('Tags applied to ' + selectedNodes.length + ' resources.');
                        setTimeout(() => { setTagDialogOpen(false); setBulkTagStatus(null); }, 1200);
                      } else { setBulkTagStatus('Failed to apply tags.'); }
                    } catch { setBulkTagStatus('Network error applying tags.'); }
                  }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#6c5ce7] text-white hover:bg-[#5a4bd1] transition-all">Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selectedNodes.length > 0 && (
          <GlassCard className="absolute top-2 right-2 w-80 !p-0 shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100% - 16px)', zIndex: 30 }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))] shrink-0">
              <span className="text-sm font-semibold truncate">
                {selectedNodes.length === 1 ? selectedNodes[0].label : selectedNodes.length + ' selected'}
              </span>
              <button onClick={handleBgTap} className="text-xs text-[#5c5c5e] hover:text-white shrink-0 ml-2">&#x2715;</button>
            </div>

            {selectedNodes.length === 1 ? (() => {
              const n = selectedNodes[0];
              const color = metaFor(n.type).bg;
              const rels = getConnectedResources(n.id);
              return (<div className="flex flex-col min-h-0" style={{ maxHeight: 'calc(100% - 44px)' }}>
                <div className="flex border-b border-[hsl(var(--border))] text-[11px] shrink-0">
                  <button onClick={() => setDetailTab('info')} className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'info' ? 'text-[#6c5ce7] border-b-2 border-[#6c5ce7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Info</button>
                  <button onClick={() => setDetailTab('rels')} className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'rels' ? 'text-[#6c5ce7] border-b-2 border-[#6c5ce7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Cons{rels.length > 0 ? <span className="ml-1 px-1 py-0.5 rounded-full text-[10px] bg-[#6c5ce7]/10 text-[#6c5ce7]">{rels.length}</span> : null}</button>
                  <button onClick={() => setDetailTab('docs')} className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'docs' ? 'text-[#6c5ce7] border-b-2 border-[#6c5ce7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Links</button>
                  <button onClick={() => { setDetailTab('arch'); fetchArchitecture(); }} className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'arch' ? 'text-[#6c5ce7] border-b-2 border-[#6c5ce7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Arch</button>
                  <button onClick={() => setDetailTab('drift')} className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'drift' ? 'text-[#a855f7] border-b-2 border-[#a855f7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Drift{driftData?.resources_with_drift?.length ? <span className="ml-1 px-1 py-0.5 rounded-full text-[10px] bg-[#a855f7]/10 text-[#a855f7]">{driftData.resources_with_drift.length}</span> : null}</button>
                  {n.tags?.includes('source:codegraph') && (
                    <button onClick={() => setDetailTab('code')}
                      className={'flex-1 py-2 text-center font-medium transition-all ' + (detailTab === 'code' ? 'text-[#a855f7] border-b-2 border-[#a855f7]' : 'text-[#5c5c5e] hover:text-[#8b8b8e]')}>Code</button>
                  )}
                </div>

                <div className="overflow-y-auto p-4 space-y-3 text-xs">
                  {detailTab === 'info' && (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: colorWithAlpha(color, 0.15), color }}>{typeDisplayName(n.type)}</span>
                        {n.provider && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: colorWithAlpha(providerColor(n.provider), 0.15), color: providerColor(n.provider) }}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(n.provider) }} />{n.provider}
                        </span>}
                        {n.status && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: colorWithAlpha(getStatusDot(n.status) || '#8b8b8e', 0.15), color: getStatusDot(n.status) || '#8b8b8e' }}>{n.status}</span>}
                      </div>
                      <div className="space-y-2">
                        <div><span className="text-[#5c5c5e]">ID</span><p className="text-[#e1e1e3] mt-0.5 font-mono text-[10px] break-all">{n.id}</p></div>
                        {n.region && <div><span className="text-[#5c5c5e]">Region</span><p className="text-[#e1e1e3] mt-0.5">{n.region}</p></div>}
                        {n.tags && n.tags.length > 0 && (
                          <div>
                            <span className="text-[#5c5c5e] text-[10px] font-semibold uppercase tracking-wider">Tags</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {n.tags.map((tag: string, i: number) => {
                                const eqIdx = tag.indexOf('=');
                                const [k, v] = eqIdx > 0 ? [tag.substring(0, eqIdx), tag.substring(eqIdx + 1)] : [tag, ''];
                                return (
                                  <span key={i} title={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ background: 'rgba(108,92,231,0.12)', color: '#a29bfe', border: '1px solid rgba(108,92,231,0.2)' }}>
                                    {v ? <><span className="opacity-60">{k}=</span><span>{v}</span></> : tag}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {Object.keys(n.properties).length > 0 && (
                          <div><span className="text-[#5c5c5e] text-[10px] font-semibold uppercase tracking-wider">Properties</span>
                            <div className="mt-1 space-y-0.5">{Object.entries(n.properties).map(([k, v]) => (
                              <div key={k} className="flex justify-between py-0.5 border-b border-[hsl(var(--border))] last:border-0 gap-2">
                                <span className="text-[#8b8b8e] shrink-0 min-w-[70px]">{k.replace(/_/g, ' ')}</span>
                                <span className="text-[#e1e1e3] text-right max-w-[180px] truncate">
                                  {isUrl(v) ? <a href={v} target="_blank" rel="noopener noreferrer" className="text-[#6c5ce7] hover:underline" onClick={e => e.stopPropagation()}>{v.length > 30 ? v.substring(0, 27)+'...' : v}</a> : String(v)}
                                </span>
                              </div>
                            ))}</div></div>
                        )}
                      </div>
                    </>
                  )}

                  {detailTab === 'rels' && (
                    rels.length === 0 ? <p className="text-[#5c5c5e] py-2">No connections found for this resource.</p>
                    : <div className="space-y-1">
                        {rels.map(r => (
                          <div key={r.id + r.rel} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer transition-all" onClick={() => {
                            selectedInCanvas.current.clear();
                            selectedInCanvas.current.add(r.id);
                            syncSelectedFromCanvas();
                          }}>
                            <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: colorWithAlpha(metaFor(r.type).bg, 0.2), color: metaFor(r.type).bg }}>
                              {shortType(r.type).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-[#e1e1e3] truncate">{r.label}</div>
                              <div className="flex items-center gap-1 text-[9px]">
                                <span className="text-[#5c5c5e]">{r.direction === 'out' ? '→' : '←'}</span>
                                <span className="text-[#8b8b8e]" style={{ color: edgeColor(r.rel) }}>{r.rel}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  )}

                  {detailTab === 'arch' && (
                    <>{diagramMermaid ? <MermaidDiagram definition={diagramMermaid} highlightNodeId={selectedNodes[0]?.id} /> : <p className="text-[#5c5c5e] py-2">Generating architecture diagram...</p>}</>
                  )}
                  {detailTab === 'drift' && (
                    <>
                      {!driftMode ? <p className="text-[#5c5c5e] py-2">Enable drift detection to see drift info.</p>
                      : !driftData ? <p className="text-[#5c5c5e] py-2">Loading drift data...</p>
                      : (() => {
                        const nodeDrift = (driftData.resources_with_drift || []).filter((d: any) => d.resource_id === n.id);
                        if (nodeDrift.length === 0) return <p className="text-[#5c5c5e] py-2">No drift detected for this resource.</p>;
                        return (<div className="space-y-2">{nodeDrift.map((d: any, i: number) => {
                          const isMissing = d.drift_type === 'missing';
                          return (<div key={i} className="px-3 py-2 rounded-lg" style={{ background: isMissing ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: '1px solid ' + (isMissing ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)') }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: isMissing ? '#ef4444' : '#f59e0b' }} />
                                <span className="text-[11px] font-semibold" style={{ color: isMissing ? '#ef4444' : '#f59e0b' }}>{isMissing ? 'Missing' : 'Unmanaged'}</span>
                              </div>
                              <p className="text-[10px] text-[#e1e1e3] leading-relaxed">{d.description}</p>
                              <p className="text-[9px] text-[#5c5c5e] mt-1 font-mono">{d.resource_type}</p>
                            </div>);
                        })}</div>);
                      })()}
                    </>
                  )}
                  {detailTab === 'code' && (
                    <div className="space-y-3">
                      {n.properties?.signature && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#5c5c5e] mb-1">Signature</p>
                          <pre className="px-3 py-2 rounded-lg bg-black/20 border border-[hsl(var(--border))] text-xs font-mono text-[#c084fc] whitespace-pre-wrap break-all">{n.properties.signature}</pre>
                        </div>
                      )}
                      {n.properties?.doc_comment && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#5c5c5e] mb-1">Doc Comment</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] italic border-l-2 border-[#a855f7]/30 pl-3">{n.properties.doc_comment}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {n.properties?.language && <div><p className="text-[10px] uppercase tracking-wider text-[#5c5c5e]">Language</p><p className="text-xs mt-0.5">{n.properties.language}</p></div>}
                        {n.properties?.file && <div><p className="text-[10px] uppercase tracking-wider text-[#5c5c5e]">File</p><p className="text-xs mt-0.5 font-mono text-[#c084fc]">{n.properties.file}</p></div>}
                        {n.properties?.line && <div><p className="text-[10px] uppercase tracking-wider text-[#5c5c5e]">Line</p><p className="text-xs mt-0.5">{n.properties.line}:{n.properties.column} - {n.properties.end_line}:{n.properties.end_column}</p></div>}
                        {n.properties?.kind && <div><p className="text-[10px] uppercase tracking-wider text-[#5c5c5e]">Kind</p><p className="text-xs mt-0.5 capitalize">{n.properties.kind}</p></div>}
                      </div>
                    </div>
                  )}
                  {detailTab === 'docs' && (
                    <div className="space-y-2">
                      <button onClick={async () => {
                        try {
                          const res = await fetch('/api/v1/docs/' + encodeURIComponent(n.id));
                          const data = await res.json();
                          if (data.data?.id || data.id) navigate('/docs/' + (data.data?.id || data.id));
                          else navigate('/docs');
                        } catch { navigate('/docs'); }
                      }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: colorWithAlpha(color, 0.12), color, border: '1px solid ' + colorWithAlpha(color, 0.3) }}>
                        View Documentation
                      </button>
                      <button onClick={async () => {
                        try {
                          const res = await fetch('/api/v1/runbooks/' + encodeURIComponent(n.id));
                          const data = await res.json();
                          if (data.runbook?.id || data.data?.id) navigate('/runbooks/' + (data.runbook?.id || data.data?.id));
                          else navigate('/runbooks');
                        } catch { navigate('/runbooks'); }
                      }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: colorWithAlpha('#6c5ce7', 0.1), color: '#6c5ce7', border: '1px solid rgba(108,92,231,0.25)' }}>
                        View Runbooks
                      </button>
                      <button onClick={() => setFocusNode(n.id)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}>Focus</button>
                      <button onClick={() => { traceImpact(n.id); setDetailTab('rels'); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>Trace Impact</button>
                    </div>
                  )}
                </div>
              </div>);
            })() : (
              <div className="p-4 space-y-2 overflow-y-auto">
                {selectedNodes.map(n => {
                  return (<div key={n.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'hsl(var(--muted))' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: metaFor(n.type).bg }} />
                    <span className="truncate text-[#e1e1e3]">{n.label}</span>
                    <span className="text-[#5c5c5e] shrink-0 ml-auto">{shortType(n.type)}</span>
                  </div>);
                })}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
