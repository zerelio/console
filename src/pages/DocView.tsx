import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function DocView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/docs/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => {
        const data = (d && d.doc) || (d && d.data) || d || {};
        setTitle(data.title || data.name || id || '');
        setContent(data.content || data.body || 'No content available');
      })
      .catch(() => setContent('Failed to load document'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full animate-fade animate-slide-up">
        <div className="flex-1 overflow-auto p-12 max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-3/4 rounded-lg bg-[#121214] animate-pulse" />
          <div className="h-4 w-1/2 rounded-lg bg-[#121214] animate-pulse" />
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 w-full rounded-lg bg-[#121214] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full animate-fade animate-slide-up">
      <button onClick={() => navigate('/docs')} className="absolute top-4 left-4 z-10 px-3 py-1.5 text-xs text-[#8b8b8e] hover:text-[#e1e1e3] bg-[#121214] rounded-lg border border-[#1a1a1e] transition-all">
        ← Back to docs
      </button>
      <div className="flex-1 overflow-auto p-12 max-w-3xl mx-auto pt-20">
        <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}
            components={{
              h1: ({children}) => <h1 className="text-xl font-bold mb-4 mt-6 text-white">{children}</h1>,
              h2: ({children}) => <h2 className="text-lg font-bold mb-3 mt-5 text-white">{children}</h2>,
              h3: ({children}) => <h3 className="text-base font-bold mb-2 mt-4 text-white">{children}</h3>,
              p: ({children}) => <p className="mb-3 leading-relaxed text-[#c1c1c4]">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[#c1c1c4]">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[#c1c1c4]">{children}</ol>,
              li: ({children}) => <li>{children}</li>,
              code: ({children}) => <code className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded text-[#e1e1e3]">{children}</code>,
              pre: ({children}) => <pre className="text-xs bg-[hsl(var(--muted))] p-3 rounded-lg mb-3 overflow-x-auto text-[#e1e1e3]">{children}</pre>,
              strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
              table: ({children}) => <table className="min-w-full border-collapse mb-3 text-sm text-[#c1c1c4]">{children}</table>,
              th: ({children}) => <th className="border border-[#1a1a1e] px-3 py-2 bg-[hsl(var(--muted))] text-left font-semibold text-white">{children}</th>,
              td: ({children}) => <td className="border border-[#1a1a1e] px-3 py-2">{children}</td>,
            }}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
