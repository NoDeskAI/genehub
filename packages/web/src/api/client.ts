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
  source_ref: string | null;
  compatibility: string[];
  dependencies: { slug: string; version: string }[];
  synergies: string[];
  author: { type: string; name: string };
  install_count: number;
  avg_rating: number;
  effectiveness_score: number;
  review_status: string;
  ai_score: number | null;
  ai_verdict: string | null;
  ai_enriched: boolean;
  publisher_id: string | null;
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

export type GeneReview = {
  id: string;
  gene_id: string;
  reviewer: string;
  score: number | null;
  verdict: string | null;
  comments: string[];
  changes_made: Record<string, unknown> | null;
  feedback: string | null;
  model: string | null;
  created_at: string;
};

export type Genome = {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  icon: string | null;
  genes: { slug: string; version: string; config_override?: Record<string, unknown> }[];
  compatibility: string[];
  install_count: number;
  avg_rating: number;
  author: { type: string; name: string };
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type FederatedGeneItem = {
  slug: string;
  name: string;
  description: string | null;
  version: string | null;
  category: string | null;
  tags: string[];
  source: 'local' | 'clawhub';
  score: number;
  install_count: number | null;
  avg_rating: number | null;
  clawhub_display_name?: string;
};

export type FederatedSearchResult = {
  query: string;
  total: number;
  items: FederatedGeneItem[];
  sources: { local: number; clawhub: number };
};

type ApiResponse<T> = { code: number; message: string; data: T };
export type PagedData<T> = {
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
  tag?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<PagedData<Gene>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.compatibility) sp.set('compatibility', params.compatibility);
  if (params?.tag) sp.set('tags', params.tag);
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

export async function getGeneReviews(
  slug: string,
  params?: { page?: number; page_size?: number },
): Promise<PagedData<GeneReview>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  return get<PagedData<GeneReview>>(`/genes/${slug}/reviews${qs ? `?${qs}` : ''}`);
}

export async function listGenomes(params?: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<PagedData<Genome>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  return get<PagedData<Genome>>(`/genomes${qs ? `?${qs}` : ''}`);
}

export async function getGenome(slug: string): Promise<Genome> {
  return get<Genome>(`/genomes/${slug}`);
}

export type AgentTemplate = {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  short_description: string;
  role: string | null;
  category: string;
  tags: string[];
  icon: string | null;
  avatar_url: string | null;
  genomes: { slug: string; version: string }[];
  genes: { slug: string; version: string }[];
  compatibility: string[];
  install_count: number;
  avg_rating: number;
  author: { type: string; name: string };
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export async function listTemplates(params?: {
  q?: string;
  category?: string;
  role?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<PagedData<AgentTemplate>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.role) sp.set('role', params.role);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  const qs = sp.toString();
  return get<PagedData<AgentTemplate>>(`/templates${qs ? `?${qs}` : ''}`);
}

export async function getTemplate(slug: string): Promise<AgentTemplate> {
  return get<AgentTemplate>(`/templates/${slug}`);
}

export async function federatedSearch(params: {
  q: string;
  category?: string;
  limit?: number;
}): Promise<FederatedSearchResult> {
  const sp = new URLSearchParams();
  sp.set('q', params.q);
  if (params.category) sp.set('category', params.category);
  if (params.limit) sp.set('limit', String(params.limit));
  return get<FederatedSearchResult>(`/genes/search?${sp.toString()}`);
}
