import { Bot, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type GeneReview,
  getGeneReviews,
  getGenomeReviews,
  getTemplateReviews,
  type PagedData,
} from '@/api/client';
import { getReviewStatusConfig } from '@/lib/status';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

type EntityType = 'gene' | 'genome' | 'template';

const FETCH_MAP: Record<EntityType, typeof getGeneReviews> = {
  gene: getGeneReviews,
  genome: getGenomeReviews,
  template: getTemplateReviews,
};

export default function ReviewList({
  slug,
  entityType = 'gene',
}: {
  slug: string;
  entityType?: EntityType;
}) {
  const [data, setData] = useState<PagedData<GeneReview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const fetcher = FETCH_MAP[entityType];
    fetcher(slug, { page, page_size: 10 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug, entityType, page]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border border-border rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-muted">暂无评审记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.items.map((review) => {
        const verdictConfig = review.verdict ? getReviewStatusConfig(review.verdict) : null;
        return (
          <div key={review.id} className="border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-900">{review.reviewer}</span>
                {review.model && <span className="text-xs text-muted">({review.model})</span>}
              </div>
              <div className="flex items-center gap-2">
                {review.score != null && (
                  <Badge variant="info" className="text-xs">
                    {review.score.toFixed(1)} 分
                  </Badge>
                )}
                {verdictConfig && (
                  <Badge variant={verdictConfig.variant}>{verdictConfig.label}</Badge>
                )}
                {review.feedback && (
                  <span title={`人工反馈: ${review.feedback}`}>
                    {review.feedback === 'helpful' ? (
                      <ThumbsUp className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {review.comments.length > 0 && (
              <ul className="space-y-1.5">
                {review.comments.map((comment, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: comments are plain strings without stable keys
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">-</span>
                    <span>{comment}</span>
                  </li>
                ))}
              </ul>
            )}

            <time className="text-xs text-muted block">
              {new Date(review.created_at).toLocaleString('zh-CN')}
            </time>
          </div>
        );
      })}

      {data.total_pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-gray-50 transition"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-xs text-muted">
            {page} / {data.total_pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="px-3 py-1.5 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-gray-50 transition"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
