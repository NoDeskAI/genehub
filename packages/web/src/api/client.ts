const BASE = '/api/v1';

export type Gene = {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  icon: string | null;
  source: string;
  compatibility: string[];
  dependencies: { slug: string; version: string }[];
  synergies: string[];
  author: { type: string; name: string };
  install_count: number;
  avg_rating: number;
  effectiveness_score: number;
  is_published: boolean;
  manifest: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GeneVersion = {
  id: string;
  version: string;
  changelog: string;
  is_latest: boolean;
  published_at: string;
};

type ApiResponse<T> = { code: number; message: string; data: T };
type PagedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

export async function listGenes(params?: {
  q?: string;
  category?: string;
  compatibility?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<PagedData<Gene>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.compatibility) sp.set('compatibility', params.compatibility);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  return get<PagedData<Gene>>(`/genes${qs ? `?${qs}` : ''}`);
}

export async function getGene(slug: string): Promise<Gene> {
  return get<Gene>(`/genes/${slug}`);
}

export async function getGeneVersions(slug: string): Promise<GeneVersion[]> {
  return get<GeneVersion[]>(`/genes/${slug}/versions`);
}
