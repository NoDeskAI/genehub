import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Gene, type GeneVersion, getGene, getGeneVersions } from '../api/client';
import { ICON_MAP } from '../components/GeneCard';

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
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  );
}

function InstallBlock({ slug }: { slug: string }) {
  const commands = [
    { label: '安装', cmd: `genehub install ${slug} -p openclaw` },
    { label: '深度学习安装', cmd: `genehub install ${slug} --learn -p openclaw` },
  ];

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      <div className="p-4 space-y-3 font-mono text-sm text-gray-300">
        {commands.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-4">
            <div>
              <span className="text-gray-500 mr-2">#</span>
              <span className="text-gray-500">{c.label}</span>
              <div className="text-green-400">$ {c.cmd}</div>
            </div>
            <CopyButton text={c.cmd} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GeneDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [gene, setGene] = useState<Gene | null>(null);
  const [versions, setVersions] = useState<GeneVersion[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getGene(slug)
      .then(setGene)
      .catch(() => setError('找不到该基因'));
    getGeneVersions(slug)
      .then(setVersions)
      .catch(() => {});
  }, [slug]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😵</div>
        <p className="text-xl text-gray-900 mb-2">{error}</p>
        <Link to="/browse" className="text-primary hover:underline">
          返回浏览
        </Link>
      </div>
    );
  }

  if (!gene) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const manifest = gene.manifest as Record<string, unknown>;
  const learning = manifest.learning as { level?: string; objectives?: string[] } | undefined;
  const skill = manifest.skill as { description?: string } | undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-6">
        <Link to="/browse" className="hover:text-gray-900 transition">
          浏览
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{gene.name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <span className="text-4xl">{(gene.icon && ICON_MAP[gene.icon]) || '🧬'}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{gene.name}</h1>
              <p className="text-muted text-sm mt-1">
                {gene.slug} · v{gene.version}
              </p>
              <p className="text-gray-700 mt-2">{gene.short_description}</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">描述</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{gene.description}</p>
          </div>

          {/* Skill */}
          {skill?.description && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">技能说明</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {skill.description}
              </p>
            </div>
          )}

          {/* Learning */}
          {learning && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">学习配置</h2>
              {learning.level && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">学习等级：</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                    {learning.level}
                  </span>
                </div>
              )}
              {learning.objectives && learning.objectives.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">学习目标：</span>
                  <ul className="space-y-1">
                    {learning.objectives.map((obj) => (
                      <li key={obj} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-primary mt-0.5">▸</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Install */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">安装</h2>
            <InstallBlock slug={gene.slug} />
          </div>

          {/* Versions */}
          {versions.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">版本历史</h2>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between border-b border-border last:border-0 pb-3 last:pb-0"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium text-gray-900">
                        v{v.version}
                      </span>
                      {v.is_latest && (
                        <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          latest
                        </span>
                      )}
                      {v.changelog && <p className="text-sm text-gray-500 mt-1">{v.changelog}</p>}
                    </div>
                    <time className="text-xs text-muted whitespace-nowrap">
                      {new Date(v.published_at).toLocaleDateString('zh-CN')}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">分类</span>
              <Link
                to={`/browse?category=${gene.category}`}
                className="text-primary hover:underline"
              >
                {gene.category}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">来源</span>
              <span className="text-gray-700">{gene.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">作者</span>
              <span className="text-gray-700">{gene.author?.name || '未知'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">安装次数</span>
              <span className="text-gray-700">{gene.install_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">平均评分</span>
              <span className="text-gray-700">
                {gene.avg_rating > 0 ? gene.avg_rating.toFixed(1) : '暂无'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">发布时间</span>
              <span className="text-gray-700">
                {new Date(gene.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>

          {/* Tags */}
          {gene.tags.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">标签</h3>
              <div className="flex flex-wrap gap-2">
                {gene.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {gene.compatibility.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">兼容产品</h3>
              <div className="flex flex-wrap gap-2">
                {gene.compatibility.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {gene.dependencies.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">依赖</h3>
              <div className="space-y-2">
                {gene.dependencies.map((dep) => (
                  <Link
                    key={dep.slug}
                    to={`/genes/${dep.slug}`}
                    className="flex justify-between text-sm hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition"
                  >
                    <span className="text-primary">{dep.slug}</span>
                    <span className="text-muted">{dep.version}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Synergies */}
          {gene.synergies.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">协同基因</h3>
              <div className="flex flex-wrap gap-2">
                {gene.synergies.map((s) => (
                  <Link
                    key={s}
                    to={`/genes/${s}`}
                    className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
