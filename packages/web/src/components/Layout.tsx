import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🧬</span>
            <span className="text-xl font-bold text-gray-900">GeneHub</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索基因..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </form>

          <nav className="hidden md:flex items-center gap-4 text-sm text-muted">
            <Link to="/browse" className="hover:text-gray-900 transition">
              浏览
            </Link>
            <a
              href="https://github.com/NoDeskAI/genehub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-900 transition"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-surface border-t border-border py-8 text-sm text-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>🧬 GeneHub — NoDeskAI 基因库</div>
          <div className="flex gap-6">
            <a
              href="https://github.com/NoDeskAI/genehub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-900 transition"
            >
              GitHub
            </a>
            <a
              href="https://github.com/NoDeskAI/genehub/issues"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-900 transition"
            >
              反馈
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
