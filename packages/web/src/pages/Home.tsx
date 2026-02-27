import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type Gene, listGenes } from '../api/client';
import GeneCard from '../components/GeneCard';

const CATEGORIES = [
  { id: 'development', label: '开发', icon: '💻', desc: '编码、测试、重构' },
  { id: 'efficiency', label: '效率', icon: '⚡', desc: '流程、自动化、工具' },
  { id: 'data', label: '数据', icon: '📊', desc: '分析、可视化、建模' },
  { id: 'communication', label: '沟通', icon: '💬', desc: '表达、协作、汇报' },
  { id: 'creative', label: '创意', icon: '🎨', desc: '设计、写作、脑暴' },
  { id: 'security', label: '安全', icon: '🔒', desc: '审计、加固、合规' },
];

export default function Home() {
  const [featured, setFeatured] = useState<Gene[]>([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listGenes({ sort: 'popular', page_size: 6 })
      .then((d) => setFeatured(d.items))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">AI 员工的基因库</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            发现、安装、分享 AI Agent 的能力基因。让你的 AI 员工持续进化。
          </p>
          <form onSubmit={handleSearch} className="max-w-lg mx-auto">
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索基因，如 code-review, TDD..."
                className="flex-1 px-4 py-3 bg-transparent text-white placeholder:text-white/50 focus:outline-none text-base"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition"
              >
                搜索
              </button>
            </div>
          </form>
          <div className="mt-6 flex justify-center gap-4 text-sm text-white/60">
            <span>🧬 {featured.length > 0 ? `${featured.length}+ 个基因` : '基因持续上新'}</span>
            <span>•</span>
            <span>🚀 L0-L3 学习协议</span>
            <span>•</span>
            <span>🔌 多平台兼容</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">按分类浏览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/browse?category=${cat.id}`}
              className="bg-surface rounded-xl border border-border p-4 text-center hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="text-3xl mb-2">{cat.icon}</div>
              <div className="font-medium text-gray-900 text-sm">{cat.label}</div>
              <div className="text-xs text-muted mt-1">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">热门基因</h2>
            <Link to="/browse?sort=popular" className="text-sm text-primary hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((gene) => (
              <GeneCard key={gene.id} gene={gene} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">快速上手</h2>
          <p className="text-gray-400 mb-6">一行命令，安装基因并开始学习</p>
          <div className="bg-gray-800 rounded-xl p-4 max-w-md mx-auto text-left font-mono text-sm">
            <div className="text-gray-500">$ npm i -g @nodeskai/genehub</div>
            <div className="text-green-400">$ genehub install code-review --learn -p openclaw</div>
          </div>
        </div>
      </section>
    </div>
  );
}
