import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  type: 'question' | 'answer';
  text: string;
  sources?: string[];
  id?: string;
}

interface LLMProfile {
  name: string;
  provider: string;
  model: string;
  is_default: boolean;
}

interface StoredConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

const STORAGE_KEY = 'zerelio_qa_conversations';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: StoredConversation[] = JSON.parse(raw);
    const now = Date.now();
    return all.filter(c => now - new Date(c.createdAt).getTime() < TTL);
  } catch { return []; }
}

function saveConversation(conv: StoredConversation) {
  try {
    const all = loadConversations();
    const idx = all.findIndex(c => c.id === conv.id);
    if (idx >= 0) all[idx] = conv;
    else all.unshift(conv);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
  } catch { /* storage full — ignore */ }
}

const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';

function staggerDelay(i: number, base = 40): string {
  return `${i * base}ms`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resourceId?: string;
  pageContext?: string;
  suggestedQuestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'How many AWS resources do I have?',
  'Show me my DNS records',
  "What's in my graph?",
  'Show recent changes',
  'What resources are undocumented?',
];

export function KnowledgePanel({ open, onClose, resourceId, suggestedQuestions }: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convId, setConvId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [resourceQueries, setResourceQueries] = useState<{resource_id: string; status: 'querying' | 'found' | 'not_found'}[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load profiles and last conversation on mount
  useEffect(() => {
    const saved = loadConversations();
    if (saved.length > 0) {
      setMessages(saved[0].messages);
      setConvId(saved[0].id);
    }
    fetch('/api/v1/admin/llm/profiles')
      .then(r => r.json())
      .then(d => {
        const list: LLMProfile[] = d && d.data ? d.data : Array.isArray(d) ? d : [];
        setProfiles(list);
        const def = list.find(p => p.is_default);
        if (def) setSelectedProfile(def.name);
        else if (list.length > 0) setSelectedProfile(list[0].name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const id = convId || `qa-${Date.now()}`;
    if (!convId) setConvId(id);
    const title = messages.find(m => m.type === 'question')?.text?.slice(0, 60) || 'Chat';
    saveConversation({ id, title, messages, createdAt: new Date().toISOString() });
  }, [messages, convId]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingAnswer]);

  const askQuestion = useCallback(async (q: string) => {
    setQuestion('');
    setError('');
    setStreamingAnswer('');
    setResourceQueries([]);
    setThinkingSteps([]);
    setShowThinking(false);
    setFollowUps([]);
    const newMsg: Message = { type: 'question', text: q, id: `q-${Date.now()}` };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (selectedProfile) headers['X-Zerelio-LLM-Profile'] = selectedProfile;
      const res = await fetch('/api/v1/qa/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: q,
          resource_ids: resourceId ? [resourceId] : [],
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Stream error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';
      let sources: string[] = [];
      let streamDone = false;

      while (true) {
        if (streamDone) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]' || data === '') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token') {
              fullAnswer += parsed.content;
              setStreamingAnswer(fullAnswer);
            } else if (parsed.type === 'sources') {
              sources = parsed.sources || [];
            } else if (parsed.type === 'done') {
              // Stream complete
            } else if (parsed.type === 'error') {
              setError(parsed.message);
            } else if (parsed.type === 'resource_query') {
              setResourceQueries(prev => [...prev.filter(r => r.resource_id !== parsed.resource_id), { resource_id: parsed.resource_id, status: 'querying' }]);
            } else if (parsed.type === 'status') {
              if (parsed.resource_count !== undefined) {
                const count = typeof parsed.resource_count === 'number' ? parsed.resource_count : parseInt(String(parsed.resource_count));
                setResourceQueries(prev => prev.map(r => ({ ...r, status: count > 0 ? 'found' : 'not_found' })));
              }
            } else if (parsed.type === 'thinking') {
              if (parsed.content) {
                setThinkingSteps(prev => [...prev, parsed.content]);
                setShowThinking(true);
              }
            } else if (parsed.type === 'suggestions') {
              if (Array.isArray(parsed.questions)) {
                setFollowUps(parsed.questions);
              }
            }
          } catch {}
        }
      }

      setMessages(prev => [...prev, { type: 'answer', text: fullAnswer, sources }]);
      setStreamingAnswer('');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('Failed to connect: ' + (e.message || 'connection failed'));
        setStreamingAnswer('');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [resourceId, selectedProfile]);

  async function handleSubmit() {
    if (!question.trim() || loading) return;
    await askQuestion(question.trim());
  }

  function newChat() {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConvId('');
    setError('');
    setQuestion('');
    setStreamingAnswer('');
    setResourceQueries([]);
    setThinkingSteps([]);
    setShowThinking(false);
  }

  function loadConversation(conv: StoredConversation) {
    setMessages(conv.messages);
    setConvId(conv.id);
    setShowHistory(false);
    setError('');
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const all = loadConversations();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(c => c.id !== id)));
    } catch {}
  }

  const toggleCollapse = (i: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const suggestions = suggestedQuestions || DEFAULT_SUGGESTIONS;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.3)' }}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full z-40`}
        style={{
          width: 440,
          background: 'hsl(var(--card))',
          borderLeft: '1px solid hsl(var(--border))',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform 250ms ${easeOut}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-14 border-b shrink-0"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Ask AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{
                color: showHistory ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                background: showHistory ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                transition: `background 160ms ${easeOut}, color 160ms ${easeOut}`,
              }}
            >
              History
            </button>
            <button
              onClick={newChat}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{
                color: 'hsl(var(--muted-foreground))',
                transition: `color 160ms ${easeOut}, transform 160ms ${easeOut}`,
              }}
              onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              + New
            </button>
            <button onClick={onClose} className="text-xs px-1.5 py-1.5 rounded-lg"
              style={{
                color: 'hsl(var(--muted-foreground))',
                transition: `transform 160ms ${easeOut}`,
              }}
              onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Resource context indicator */}
        {resourceId && (
          <div className="flex items-center gap-2 px-5 py-1.5 text-[11px]" style={{ background: '#6c5ce710', borderBottom: '1px solid #6c5ce720' }}>
            <svg className="w-3.5 h-3.5 shrink-0 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <span className="truncate" style={{ color: '#6c5ce7' }}>Context: {resourceId}</span>
            <span className="ml-auto text-[10px]" style={{ color: '#8b8b8e' }}>in scope</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 120px)' }}>
          {/* History sidebar */}
          {showHistory && (() => {
            const convs = loadConversations();
            return (
              <div
                className="mb-4 p-3 rounded-xl"
                style={{
                  background: 'hsl(var(--secondary))',
                  border: '1px solid hsl(var(--border))',
                  transformOrigin: 'top center',
                }}
              >
                <p className="text-xs font-semibold tracking-wider mb-2 uppercase"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Past Conversations
                </p>
                {convs.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>No saved conversations</p>
                ) : convs.map(c => (
                  <div
                    key={c.id}
                    onClick={() => loadConversation(c)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs mb-0.5"
                    style={{
                      transition: `background 160ms ${easeOut}`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--border))'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span className="truncate flex-1" style={{ color: 'hsl(var(--foreground))' }}>{c.title}</span>
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="shrink-0 ml-2"
                      style={{
                        color: 'hsl(var(--muted-foreground))',
                        transition: `color 160ms ${easeOut}`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff4757'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'; }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}

          {resourceId && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
              <span className="w-2 h-2 rounded-full bg-[#6c5ce7] shrink-0" />
              <span>Asking about: <strong style={{color: 'hsl(var(--foreground))'}}>{resourceId}</strong></span>
            </div>
          )}

          {messages.length === 0 && !loading && !streamingAnswer && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Ask about your infrastructure
              </p>
              {profiles.length > 0 && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Using:
                  </span>
                  <select
                    value={selectedProfile}
                    onChange={e => setSelectedProfile(e.target.value)}
                    className="text-[10px] px-2 py-0.5 rounded-md outline-none"
                    style={{
                      background: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {profiles.map(p => (
                      <option key={p.name} value={p.name}>{p.name} ({p.provider})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mt-4 space-y-2 max-w-xs mx-auto">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg"
                    style={{
                      color: 'hsl(var(--muted-foreground))',
                      border: '1px solid hsl(var(--border))',
                      transition: `border-color 160ms ${easeOut}, background 160ms ${easeOut}, transform 160ms ${easeOut}`,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'hsl(var(--primary))';
                      el.style.background = 'hsl(var(--primary) / 0.05)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'hsl(var(--border))';
                      el.style.background = 'transparent';
                    }}
                    onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.type === 'question' ? 'justify-end' : 'justify-start'}`}
              style={{
                animation: `kt-fade-in 250ms ${easeOut} both`,
                animationDelay: staggerDelay(i, 30),
              }}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.type === 'question' ? 'text-white' : ''
                }`}
                style={msg.type === 'question'
                  ? { background: 'hsl(var(--primary))' }
                  : { background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }
                }
              >
                {msg.type === 'question' ? (
                  msg.text
                ) : (
                  <div>
                    <div className="flex items-center justify-end mb-1">
                      <button
                        onClick={() => toggleCollapse(i)}
                        className="text-[10px]"
                        style={{
                          color: 'hsl(var(--muted-foreground))',
                          transition: `color 160ms ${easeOut}`,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'; }}
                      >
                        {collapsed.has(i) ? 'Expand' : 'Collapse'}
                      </button>
                    </div>
                    {!collapsed.has(i) && (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className="text-base font-bold mb-2 mt-4">{children}</h1>,
                            h2: ({children}) => <h2 className="text-sm font-bold mb-1.5 mt-3">{children}</h2>,
                            h3: ({children}) => <h3 className="text-xs font-bold mb-1 mt-2">{children}</h3>,
                            p: ({children}) => <p className="mb-2" style={{color: 'hsl(var(--muted-foreground))'}}>{children}</p>,
                            ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                            li: ({children}) => <li>{children}</li>,
                            code: ({children}) => <code className="text-[10px] px-1 py-0.5 rounded" style={{background: 'hsl(var(--muted))'}}>{children}</code>,
                            pre: ({children}) => <pre className="text-[10px] p-2 rounded-lg mb-2 overflow-x-auto" style={{background: 'hsl(var(--muted))'}}>{children}</pre>,
                            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          }}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                      <button onClick={() => { navigator.clipboard.writeText(msg.text); }} className="text-[10px]" style={{color: 'hsl(var(--muted-foreground))', transition: 'color 160ms ease-out'}} onMouseEnter={e => {(e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';}} onMouseLeave={e => {(e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))';}}>Copy answer</button>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                        <p className="text-[10px] font-semibold mb-1" style={{color: 'hsl(var(--muted-foreground))'}}>Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((s, j) => (
                            <a key={s} href={`/resources/${encodeURIComponent(s)}`}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: 'hsl(var(--muted))',
                                color: 'hsl(var(--primary))',
                                transition: `opacity 160ms ${easeOut}`,
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            >
                              [{j + 1}] {s}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Confidence indicator */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2ed573]/10 text-[#2ed573]">High confidence</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Resource query bubbles */}
          {resourceQueries.length > 0 && !streamingAnswer && (
            <div className="space-y-1.5" style={{ animation: `kt-fade-in 200ms ${easeOut} both` }}>
              <p className="text-[10px] font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Querying resources</p>
              {resourceQueries.map((rq) => (
                <div key={rq.resource_id} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                  {rq.status === 'querying' ? (
                    <span className="w-3 h-3 rounded-full border-2 border-[#6c5ce7] border-t-transparent animate-spin shrink-0" />
                  ) : rq.status === 'found' ? (
                    <span className="text-[#2ed573] shrink-0">✓</span>
                  ) : (
                    <span className="text-[#ff4757] shrink-0">✗</span>
                  )}
                  <span className="truncate flex-1" style={{ color: 'hsl(var(--foreground))' }}>{rq.resource_id}</span>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {rq.status === 'querying' ? 'searching...' : rq.status === 'found' ? 'found' : 'not found'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Thinking/chain-of-thought panel */}
          {thinkingSteps.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ animation: `kt-fade-in 200ms ${easeOut} both` }}>
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Thinking ({thinkingSteps.length} steps)</span>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{showThinking ? '▲' : '▼'}</span>
              </button>
              {showThinking && (
                <div className="px-3 py-2 space-y-1.5 text-xs leading-relaxed max-h-48 overflow-y-auto"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderTop: 'none' }}>
                  {thinkingSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#6c5ce7] shrink-0 font-medium">[{i + 1}]</span>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Streaming answer in progress */}
          {streamingAnswer && (
            <div className="flex justify-start" style={{ animation: `kt-fade-in 200ms ${easeOut} both` }}>
              <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed"
                style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className="mb-2" style={{color: 'hsl(var(--muted-foreground))'}}>{children}</p>,
                      code: ({children}) => <code className="text-[10px] px-1 py-0.5 rounded" style={{background: 'hsl(var(--muted))'}}>{children}</code>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    }}>
                    {streamingAnswer}
                  </ReactMarkdown>
                </div>
                <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
              </div>
            </div>
          )}

          {loading && !streamingAnswer && (
            <div className="flex justify-start" style={{ animation: `kt-fade-in 160ms ${easeOut} both` }}>
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'hsl(var(--secondary))' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6c5ce7' }} />
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6c5ce7', animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6c5ce7', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{error}</div>
          )}

          {followUps.length > 0 && !loading && (
            <div className="space-y-1.5 pt-1" style={{ animation: `kt-fade-in 250ms cubic-bezier(0.23, 1, 0.32, 1) both` }}>
              <p className="text-[10px] font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Follow-up</p>
              <div className="flex flex-wrap gap-1.5">
                {followUps.map((q, i) => (
                  <button key={i} onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg text-left transition-all"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--primary))'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t"
          style={{
            borderColor: 'hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask about your infrastructure..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'hsl(var(--input))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                transition: `border-color 160ms ${easeOut}`,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white"
              style={{
                background: 'hsl(var(--primary))',
                transition: `transform 160ms ${easeOut}, opacity 160ms ${easeOut}`,
              }}
              onMouseDown={e => {
                if (!(e.currentTarget as HTMLButtonElement).disabled) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)';
                }
              }}
              onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes kt-fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes kt-slide-in {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
