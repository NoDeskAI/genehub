import {
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Dna,
  Download,
  Layers,
  Star,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type AgentTemplate, getTemplate } from '@/api/client';
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

export default function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [template, setTemplate] = useState<AgentTemplate | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getTemplate(slug)
      .then(setTemplate)
      .catch(() => setError('找不到该 AI 员工模板'));
  }, [slug]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-gray-900 mb-2">{error}</p>
        <Link to="/templates" className="text-primary hover:underline">
          返回浏览
        </Link>
      </div>
    );
  }

  if (!template) {
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

  const installCmd = `genehub install-template ${template.slug} -p openclaw`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1 text-sm text-muted mb-6">
        <Link to="/templates" className="hover:text-gray-900 transition">
          AI 员工模板
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900">{template.name}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start gap-4">
            {template.avatar_url ? (
              <img
                src={template.avatar_url}
                alt={template.name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <LucideIcon name={template.icon} className="w-7 h-7 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <p className="text-muted text-sm mt-1">
                {template.slug} · v{template.version}
              </p>
              {template.role && (
                <p className="text-primary/80 text-sm mt-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {template.role}
                </p>
              )}
              <p className="text-gray-700 mt-2">{template.short_description}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">描述</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {template.description}
              </p>
            </CardContent>
          </Card>

          {(template.genomes as { slug: string; version: string }[]).length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  包含的基因组 ({(template.genomes as { slug: string }[]).length})
                </h2>
                <div className="space-y-2">
                  {(template.genomes as { slug: string; version: string }[]).map((g) => (
                    <Link
                      key={g.slug}
                      to={`/genomes/${g.slug}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
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
          )}

          {(template.genes as { slug: string; version: string }[]).length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Dna className="w-5 h-5" />
                  额外基因 ({(template.genes as { slug: string }[]).length})
                </h2>
                <div className="space-y-2">
                  {(template.genes as { slug: string; version: string }[]).map((g) => (
                    <Link
                      key={g.slug}
                      to={`/genes/${g.slug}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Dna className="w-4 h-4 text-primary" />
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
          )}

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

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3 text-sm">
              {template.role && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">角色</span>
                    <span className="text-gray-700 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {template.role}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted">分类</span>
                <span className="text-gray-700">{template.category}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted">作者</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {template.author?.name || '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">基因组</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {(template.genomes as { slug: string }[]).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">额外基因</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Dna className="w-3 h-3" />
                  {(template.genes as { slug: string }[]).length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted">安装次数</span>
                <span className="text-gray-700 flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {template.install_count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">评分</span>
                <span className="text-gray-700">
                  {template.avg_rating > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {template.avg_rating.toFixed(1)}
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
                  {new Date(template.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </CardContent>
          </Card>

          {template.tags.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">标签</h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {template.compatibility.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">兼容产品</h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.compatibility.map((p) => (
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
