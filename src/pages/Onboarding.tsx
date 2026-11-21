import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CytoscapeComponent from 'react-cytoscapejs';
import { ErrorBoundary } from '../components/graph/ErrorBoundary';

// ─── Showcase cards (replaces old connector selection) ───────────────────────

interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
}

const SHOWCASE: ShowcaseItem[] = [
  {
    id: 'discovery', title: 'Multi-Cloud Discovery', gradient: 'from-[#6c5ce7] to-[#a29bfe]',
    description: 'Automatically discovers resources across 21 providers — AWS, Azure, GCP, Kubernetes, and more — without manual configuration.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    id: 'runbooks', title: 'AI Runbooks', gradient: 'from-[#2ed573] to-[#7bed9f]',
    description: 'Generates operational runbooks for every resource using your LLM — OpenAI, Anthropic, or Ollama. Context-aware and always current.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    id: 'graph', title: 'Live Infrastructure Graph', gradient: 'from-[#0097e6] to-[#74b9ff]',
    description: 'Interactive graph with three views — Flat, Grouped, Tree — plus architecture diagrams, blast radius analysis, and dependency mapping.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
];

// ─── Setup animation steps ───────────────────────────────────────────────────

const SETUP_STEPS = [
  { label: 'Loading demo environment...', sublabel: 'Preparing your dashboard' },
  { label: 'Building sample infrastructure...', sublabel: 'Generating realistic resources and connections' },
  { label: 'Creating architecture diagrams...', sublabel: 'Mapping Mermaid-based topology views' },
  { label: 'Generating runbooks...', sublabel: 'Creating AI-powered operational docs' },
  { label: 'Finalizing...', sublabel: 'Optimizing graph layout and indexing' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Welcome', 'Overview', 'Setup', 'Explore'];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  const cyRef = useRef<any>(null);

  const discoveryStarted = useRef(false);

  // ─── Setup animation (demo mode) / instant pass (production) ──────────────

  useEffect(() => {
    if (step !== 2 || discoveryStarted.current) return;
    discoveryStarted.current = true;

    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

    if (!isDemo) {
      // Production: no fake loading, pass through immediately
      setDiscoveryProgress(100);
      setDiscoveryComplete(true);
      return;
    }

    // Demo mode: progressive loading animation
    setDiscoveryProgress(0);
    setDiscoveryComplete(false);

    const totalDuration = 3000;
    const interval = 120;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / totalDuration) * 100, 95);
      setDiscoveryProgress(pct);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setDiscoveryProgress(100);
        setDiscoveryComplete(true);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [step]);

  // ─── Graph elements for step 4 preview ─────────────────────────────────────

  const graphElements = useMemo(() => {
    if (step !== 3) return [];
    const previewNodes = [
      // AWS hub
      { data: { id: 'aws', label: 'AWS', type: 'tree-provider', provider: 'aws', nodeCount: '8' }, classes: 'h-collapsed' },
      { data: { id: 'aws-eks', label: 'EKS\nCluster', type: 'tree-type', provider: 'aws', color: '#e84393', nodeCount: '3', parentProvider: 'aws' }, classes: 'h-collapsed' },
      // K8s hub
      { data: { id: 'k8s', label: 'K8s', type: 'tree-provider', provider: 'kubernetes', nodeCount: '6' }, classes: '' },
      { data: { id: 'k8s-web', label: 'web-gateway', parentProvider: 'kubernetes', type: 'tree-type', provider: 'kubernetes', color: '#6c5ce7', nodeCount: '1' }, classes: '' },
      { data: { id: 'k8s-api', label: 'checkout-api', parentProvider: 'kubernetes', type: 'tree-type', provider: 'kubernetes', color: '#2ed573', nodeCount: '1' }, classes: '' },
      { data: { id: 'k8s-pay', label: 'payments', parentProvider: 'kubernetes', type: 'tree-type', provider: 'kubernetes', color: '#ffa502', nodeCount: '1' }, classes: '' },
      { data: { id: 'k8s-id', label: 'identity', parentProvider: 'kubernetes', type: 'tree-type', provider: 'kubernetes', color: '#0097e6', nodeCount: '1' }, classes: '' },
      // External
      { data: { id: 'ext', label: 'External', type: 'tree-provider', provider: 'external', nodeCount: '2' }, classes: 'h-collapsed' },
    ];
    const previewEdges = [
      { data: { id: 'e-aws-k8s', source: 'aws', target: 'k8s', label: '', edgeType: 'CONNECTS_TO', edgeColor: '#8b8b8e', edgeArrow: 'triangle' }, classes: 'belongs-to cross-group' },
      { data: { id: 'e-aws-ext', source: 'aws', target: 'ext', label: '', edgeType: 'CONNECTS_TO', edgeColor: '#8b8b8e', edgeArrow: 'triangle' }, classes: 'belongs-to cross-group' },
      { data: { id: 'e-w-api', source: 'k8s-web', target: 'k8s-api', label: 'routes to', edgeType: 'ROUTES_TO', edgeColor: '#fdcb6e', edgeArrow: 'triangle' }, classes: '' },
      { data: { id: 'e-api-pay', source: 'k8s-api', target: 'k8s-pay', label: 'depends on', edgeType: 'DEPENDS_ON', edgeColor: '#ffa502', edgeArrow: 'diamond' }, classes: '' },
      { data: { id: 'e-w-id', source: 'k8s-web', target: 'k8s-id', label: 'auth', edgeType: 'DEPENDS_ON', edgeColor: '#ffa502', edgeArrow: 'diamond' }, classes: '' },
    ];
    return [...previewNodes, ...previewEdges];
  }, [step]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      completeOnboarding();
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
  }

  function completeOnboarding() {
    localStorage.setItem('zerelio_onboarded', 'true');
    navigate('/', { replace: true });
  }

  function handleSkip() {
    localStorage.setItem('zerelio_onboarded', 'true');
    navigate('/', { replace: true });
  }

  // ─── Progress bar segments ─────────────────────────────────────────────────

  const currentStepIndex = step;

  // ─── Graph styles (subset of Graph.tsx styles) ────────────────────────────

  const previewStylesheet: any[] = [
    { selector: 'node[type="tree-provider"]', style: {
      'background-color': (ele: any) => {
        const colors: Record<string, string> = { aws: '#ff9900', kubernetes: '#326ce5', external: '#636e72' };
        return colors[ele.data('provider')] || '#6c5ce7';
      },
      'border-width': 0, 'shape': 'ellipse', 'width': 60, 'height': 60,
      'text-valign': 'center', 'text-halign': 'center',
      'label': (ele: any) => `${ele.data('label')}\n${ele.data('nodeCount')}`,
      'color': '#fff', 'font-size': '10px', 'font-weight': 'bold', 'text-wrap': 'wrap',
      'background-opacity': 0.85, 'overlay-opacity': 0, 'z-index': 20,
    }},
    { selector: 'node[type="tree-type"]', style: {
      'background-color': (ele: any) => ele.data('color'),
      'border-width': 0, 'shape': 'ellipse', 'width': 42, 'height': 42,
      'text-valign': 'center', 'text-halign': 'center',
      'label': (ele: any) => `${ele.data('label')}`,
      'color': '#fff', 'font-size': '7px', 'font-weight': 'bold', 'text-wrap': 'wrap',
      'background-opacity': 0.5, 'overlay-opacity': 0, 'z-index': 10,
    }},
    { selector: 'edge', style: {
      'width': 1.5, 'opacity': 0.4,
      'line-color': (ele: any) => ele.data('edgeColor') || '#8b8b8e',
      'curve-style': 'bezier',
      'target-arrow-shape': (ele: any) => ele.data('edgeArrow') || 'triangle',
      'target-arrow-color': (ele: any) => ele.data('edgeColor') || '#8b8b8e',
      'label': (ele: any) => ele.data('label'),
      'font-size': '5px', 'color': '#8b8b8e',
      'text-background-color': '#0a0a0b',
      'text-background-opacity': 0.6,
      'text-background-padding': '1px',
      'overlay-opacity': 0,
    }},
    { selector: 'edge.belongs-to', style: {
      'width': 1, 'opacity': 0.2,
      'line-color': '#8b8b8e',
      'curve-style': 'haystack',
      'target-arrow-shape': 'none',
    }},
  ];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', zIndex: 9999 }}>
      {/* Skip button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all font-medium"
        >
          Skip &rarr;
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex-none px-8 pt-12 pb-6">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ${
                    i < currentStepIndex
                      ? 'bg-[#6c5ce7] text-white'
                      : i === currentStepIndex
                      ? 'bg-[#6c5ce7] text-white ring-2 ring-[#6c5ce7]/30'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${i === currentStepIndex ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full mx-1 ${i < currentStepIndex ? 'bg-[#6c5ce7]' : 'bg-[hsl(var(--muted))]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center px-8 pb-20 overflow-auto">
        <div className="w-full max-w-xl animate-fade">
          {step === 0 && <WelcomeStep onNext={handleNext} />}
          {step === 1 && <ShowcaseStep />}
          {step === 2 && <SetupStep progress={discoveryProgress} complete={discoveryComplete} />}
          {step === 3 && (
            <ExploreStep
              elements={graphElements}
              stylesheet={previewStylesheet}
              cyRef={cyRef}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex-none px-8 py-6 border-t border-[hsl(var(--border))]">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="px-5 py-2.5 text-sm font-medium rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            &larr; Back
          </button>

          <button
            onClick={handleNext}
            disabled={step === 2 && !discoveryComplete}
            className={`px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              step < 3
                ? 'bg-[#6c5ce7] hover:bg-[#5a4bd1] shadow-lg shadow-[#6c5ce7]/20'
                : 'bg-[#2ed573] hover:bg-[#26b863] shadow-lg shadow-[#2ed573]/20'
            }`}
          >
            {step === 0 && 'Get Started'}
            {step === 1 && 'Continue'}
            {step === 2 && (discoveryComplete ? 'Continue' : 'Setting up...')}
            {step === 3 && 'Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      {/* Logo / brand icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center shadow-2xl shadow-[#6c5ce7]/30">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] bg-clip-text text-transparent">Zerelio</span>
        </h1>
        <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-md mx-auto leading-relaxed">
          Map your entire infrastructure, auto-generate documentation, and understand every dependency
          across clouds, Kubernetes, and SaaS.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {[
          { icon: '🔍', title: 'Auto-Discovery', desc: 'Find every resource across providers' },
          { icon: '📄', title: 'Live Docs', desc: 'Auto-generated runbooks & docs' },
          { icon: '🕸️', title: 'Dependency Map', desc: 'Visualize connections in real-time' },
        ].map((feat) => (
          <div key={feat.title} className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center hover:border-[#6c5ce7]/30 transition-all">
            <div className="text-2xl mb-2">{feat.icon}</div>
            <h3 className="text-sm font-semibold mb-1">{feat.title}</h3>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-xl font-semibold text-base transition-all duration-200 shadow-lg shadow-[#6c5ce7]/20 hover:shadow-xl hover:shadow-[#6c5ce7]/30"
        >
          Get Started
        </button>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
          3 quick steps &middot; Takes about 10 seconds
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Showcase ────────────────────────────────────────────────────────

function ShowcaseStep() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">What Zerelio Does</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Three core capabilities — all powered by automatic infrastructure discovery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
        {SHOWCASE.map((item) => (
          <div key={item.id}
            className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 text-left flex gap-4 hover:border-[#6c5ce7]/30 transition-all">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
              {item.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Setup ──────────────────────────────────────────────────────────

function SetupStep({ progress, complete }: { progress: number; complete: boolean }) {
  const activeStepIndex = Math.min(
    Math.floor((progress / 100) * SETUP_STEPS.length),
    SETUP_STEPS.length - 1
  );

  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="text-2xl font-bold">Setting Up Your Environment</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          {complete ? 'Your demo environment is ready!' : 'Loading your personalized demo experience...'}
        </p>
      </div>

      {/* Animated scanner illustration */}
      <div className="flex justify-center">
        <div className="relative w-48 h-48">
          {/* Outer ring */}
          <div className={`absolute inset-0 rounded-full border-2 ${complete ? 'border-[#2ed573]' : 'border-[#6c5ce7]'} opacity-30`} />
          {/* Animated arc */}
          {!complete && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#6c5ce7] animate-spin" style={{ animationDuration: '1.5s' }} />
          )}
          {/* Inner content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {complete ? (
              <div className="w-16 h-16 rounded-full bg-[#2ed573]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#2ed573]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-[#6c5ce7] animate-pulse" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto">
        <div className="h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              complete ? 'bg-[#2ed573]' : 'bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status labels */}
      <div className="space-y-2 max-w-sm mx-auto">
        {SETUP_STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-all duration-300 ${
              i < activeStepIndex
                ? 'text-[hsl(var(--foreground))] opacity-60'
                : i === activeStepIndex && !complete
                ? 'text-[hsl(var(--foreground))] bg-[#6c5ce7]/5 border border-[#6c5ce7]/10'
                : complete
                ? 'text-[hsl(var(--foreground))] opacity-60'
                : 'text-[hsl(var(--muted-foreground))] opacity-30'
            }`}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
              {i < activeStepIndex || complete ? (
                <svg className="w-4 h-4 text-[#2ed573]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : i === activeStepIndex ? (
                <div className="w-2.5 h-2.5 rounded-full bg-[#6c5ce7] animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{s.sublabel}</p>
            </div>
          </div>
        ))}
      </div>

      {complete && (
        <div className="animate-fade">
          <p className="text-sm text-[#2ed573] font-medium">Ready! Your demo environment is loaded.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Explore Graph ───────────────────────────────────────────────────

function ExploreStep({
  elements,
  stylesheet,
  cyRef,
}: {
  elements: any[];
  stylesheet: any[];
  cyRef: React.MutableRefObject<any>;
}) {
  return (
    <div className="space-y-6 text-center">
      {/* Success header */}
      <div>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#2ed573]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#2ed573]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold">Your Infrastructure is Mapped!</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Zerelio has discovered and connected your resources. Here is a preview of your graph.
        </p>
      </div>

      {/* Mini embedded graph */}
      <div className="rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden" style={{ height: '260px' }}>
        <ErrorBoundary>
          {elements.length > 0 ? (
            <CytoscapeComponent
              elements={elements}
              layout={{ name: 'cose', animate: false, nodeRepulsion: () => 30000, idealEdgeLength: () => 100, gravity: 0.5, padding: 20 }}
              stylesheet={stylesheet}
              style={{ width: '100%', height: '100%' }}
              cy={(cy: any) => { cyRef.current = cy; setTimeout(() => { try { cy.fit(undefined, 30); } catch {} }, 100); }}
              zoomingEnabled={true}
              userZoomingEnabled={true}
              minZoom={0.3}
              maxZoom={2.5}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))] text-sm">
              Loading graph preview...
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Resource counts */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {[
          { label: 'Resources', value: '38+', icon: '🔧' },
          { label: 'Dependencies', value: '38', icon: '🔗' },
          { label: 'Resource Types', value: '12', icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-[hsl(var(--foreground))]">{s.value}</div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Explore options */}
      <div className="flex flex-wrap justify-center gap-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md">
          Explore your full graph, view auto-generated documentation, or set up additional connectors in the sidebar.
        </p>
      </div>
    </div>
  );
}
