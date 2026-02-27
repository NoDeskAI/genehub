import { Link } from 'react-router-dom';
import type { Gene } from '../api/client';

const CATEGORY_COLORS: Record<string, string> = {
  development: 'bg-blue-50 text-blue-700',
  efficiency: 'bg-green-50 text-green-700',
  data: 'bg-purple-50 text-purple-700',
  communication: 'bg-amber-50 text-amber-700',
  security: 'bg-red-50 text-red-700',
  creative: 'bg-pink-50 text-pink-700',
  operations: 'bg-cyan-50 text-cyan-700',
  network: 'bg-orange-50 text-orange-700',
};

export default function GeneCard({ gene }: { gene: Gene }) {
  const catColor = CATEGORY_COLORS[gene.category] || 'bg-gray-50 text-gray-700';

  return (
    <Link
      to={`/genes/${gene.slug}`}
      className="block bg-surface rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{gene.icon ? `${gene.icon}` : '🧬'}</span>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
            {gene.name}
          </h3>
        </div>
        <span className="text-xs text-muted">v{gene.version}</span>
      </div>

      <p className="text-sm text-muted mb-4 line-clamp-2">
        {gene.short_description || gene.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
            {gene.category}
          </span>
          {gene.compatibility.map((p) => (
            <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {p}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span title="安装次数">⬇ {gene.install_count}</span>
        </div>
      </div>
    </Link>
  );
}
