import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type Gene, listGenes } from '../api/client';
import CategoryNav from '../components/CategoryNav';
import GeneCard from '../components/GeneCard';

const SORT_OPTIONS = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'rating', label: '评分' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [genes, setGenes] = useState<Gene[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page')) || 1;

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setLoading(true);
    listGenes({ q: q || undefined, category: category || undefined, sort, page, page_size: 12 })
      .then((data) => {
        setGenes(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      })
      .catch(() => {
        setGenes([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [q, category, sort, page]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{q ? `搜索: "${q}"` : '浏览基因'}</h1>
        <p className="text-muted text-sm">{total} 个基因</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <CategoryNav active={category} onChange={(c) => updateParam('category', c)} />
        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items
            <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : genes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-muted">没有找到匹配的基因</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {genes.map((gene) => (
            <GeneCard key={gene.id} gene={gene} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button
            type="button"
            onClick={() => updateParam('page', String(page - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => updateParam('page', String(page + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
