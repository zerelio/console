export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/10 flex items-center justify-center mb-6">
        <span className="text-4xl font-bold text-[#5c5c5e]">?</span>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-[#8b8b8e] mb-8 max-w-md">The page you're looking for doesn't exist or has been moved.</p>
      <a href="/" className="px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-xl text-sm font-medium transition-all">
        Go to Dashboard
      </a>
    </div>
  );
}
