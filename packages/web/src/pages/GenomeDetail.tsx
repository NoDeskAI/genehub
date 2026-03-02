import { Calendar, Check, ChevronRight, Copy, Download, Layers, Star, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Genome, getGenome } from '@/api/client';
import LucideIcon from '@/components/LucideIcon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition flex items-center gap-1"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

export default function GenomeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [genome, setGenome] = useState<Genome | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getGenome(slug)
      .then(setGenome)
      .catch(() => setError('找不到该基因组'));
  }, [slug]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😵</div>
        <p className="text-xl text-gray-900 mb-2">{error}</p>
        <Link to="/genomes" className="text-primary hover:underline">
          返回浏览
        </Link>
      </div>
    );
  }

  if (!genome) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const installCmd = `genehub install-genome ${genome.slug} -p openclaw`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted mb-6">
        <Link to="/genomes" className="hover:text-gray-900 transition">
          基因组
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900">{genome.name}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <LucideIcon name={genome.icon} className="w-9 h-9 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{genome.name}</h1>
              <p className="text-muted text-sm mt-1">
                {genome.slug} · v{genome.version}
              </p>
              <p className="text-gray-700 mt-2">{genome.short_description}</p>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">描述</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {genome.description}
              </p>
            </CardContent>
          </Card>

          {/* Included Genes */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                包含的基因 ({genome.genes.length})
              </h2>
              <div className="space-y-2">
                {genome.genes.map((g) => (
                  <Link
                    key={g.slug}
                    to={`/genes/${g.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span>🧬</span>
                      <span className="text-sm font-medium text-primary">{g.slug}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {g.version}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Install */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">安装</h2>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="p-4 font-mono text-sm text-gray-300 flex items-center justify-between gap-4">
                <div>
                  <span className="text-green-400">$ {installCmd}</span>
                </div>
                <CopyButton text={installCmd} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">分类</span>
                <span className="text-gray-700">{genome.category}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted">作者</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {genome.author?.name || '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">基因数量</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {genome.genes.length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted">安装次数</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {genome.install_count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">评分</span>
                <span className="text-gray-700">
                  {genome.avg_rating > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {genome.avg_rating.toFixed(1)}
                    </span>
                  ) : (
                    '暂无'
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted">发布时间</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(genome.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {genome.tags.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">标签</h3>
                <div className="flex flex-wrap gap-1.5">
                  {genome.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compatibility */}
          {genome.compatibility.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">兼容产品</h3>
                <div className="flex flex-wrap gap-1.5">
                  {genome.compatibility.map((p) => (
                    <Badge key={p} variant="info">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
