import type {
  ApiResponse,
  Gene,
  GeneListParams,
  GeneManifest,
  GeneVersion,
  Genome,
  PaginatedData,
  ResolvedGene,
} from '@nodeskai/genehub-types';

export type GeneHubClientOptions = {
  registryUrl: string;
  token?: string;
};

export class GeneHubClient {
  private baseUrl: string;
  private token?: string;

  constructor(options: GeneHubClientOptions) {
    this.baseUrl = options.registryUrl.replace(/\/$/, '');
    this.token = options.token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    const json = (await res.json()) as ApiResponse<T> & { error_code?: string };

    if (!res.ok || json.code !== 0) {
      const msg = json.message || `HTTP ${res.status}`;
      throw new Error(`[GeneHub] ${json.error_code ?? 'error'}: ${msg}`);
    }

    return json.data;
  }

  async searchGenes(params: GeneListParams = {}): Promise<PaginatedData<Gene>> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.category) qs.set('category', params.category);
    if (params.tags?.length) qs.set('tags', params.tags.join(','));
    if (params.compatibility) qs.set('compatibility', params.compatibility);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.page_size) qs.set('page_size', String(params.page_size));

    const query = qs.toString();
    return this.request<PaginatedData<Gene>>(`/api/v1/genes${query ? `?${query}` : ''}`);
  }

  async getGene(slug: string): Promise<Gene> {
    return this.request<Gene>(`/api/v1/genes/${slug}`);
  }

  async getManifest(slug: string, version?: string): Promise<GeneManifest> {
    const qs = version ? `?version=${encodeURIComponent(version)}` : '';
    return this.request<GeneManifest>(`/api/v1/genes/${slug}/manifest${qs}`);
  }

  async getVersions(slug: string): Promise<GeneVersion[]> {
    return this.request<GeneVersion[]>(`/api/v1/genes/${slug}/versions`);
  }

  async getVersion(slug: string, version: string): Promise<GeneVersion> {
    return this.request<GeneVersion>(`/api/v1/genes/${slug}/versions/${version}`);
  }

  async getGenome(slug: string): Promise<Genome> {
    return this.request<Genome>(`/api/v1/genomes/${slug}`);
  }

  async publishGene(manifest: GeneManifest, files?: Record<string, string>): Promise<Gene> {
    return this.request<Gene>('/api/v1/genes', {
      method: 'POST',
      body: JSON.stringify({ manifest, files }),
    });
  }

  async publishVersion(
    slug: string,
    manifest: GeneManifest,
    changelog?: string,
    files?: Record<string, string>,
  ): Promise<Gene> {
    return this.request<Gene>(`/api/v1/genes/${slug}/versions`, {
      method: 'POST',
      body: JSON.stringify({ manifest, changelog, files }),
    });
  }

  async getGeneFiles(
    slug: string,
    version?: string,
  ): Promise<{ path: string; size: number; sha: string; type: string }[]> {
    const qs = version ? `?version=${encodeURIComponent(version)}` : '';
    return this.request(`/api/v1/genes/${slug}/files${qs}`);
  }

  async getGeneFileContent(
    slug: string,
    filePath: string,
    version?: string,
  ): Promise<{ path: string; content: string }> {
    const qs = version ? `?version=${encodeURIComponent(version)}` : '';
    return this.request(`/api/v1/genes/${slug}/files/${filePath}${qs}`);
  }

  async downloadArchive(slug: string, version?: string): Promise<ArrayBuffer> {
    const qs = version ? `?version=${encodeURIComponent(version)}` : '';
    const url = `${this.baseUrl}/api/v1/genes/${slug}/archive${qs}`;
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`[GeneHub] Download archive failed: HTTP ${res.status}`);
    }
    return res.arrayBuffer();
  }

  async resolve(
    slug: string,
    version?: string,
    product?: string,
  ): Promise<{ plan: ResolvedGene[]; warnings: string[] }> {
    return this.request(`/api/v1/resolve`, {
      method: 'POST',
      body: JSON.stringify({ slug, version, product }),
    });
  }

  async reportInstall(slug: string): Promise<void> {
    await this.request(`/api/v1/genes/${slug}/installed`, { method: 'POST', body: '{}' });
  }

  async reportEffectiveness(
    slug: string,
    report: { metric_type: string; value: number; context?: string },
  ): Promise<void> {
    await this.request(`/api/v1/genes/${slug}/effectiveness`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }
}
