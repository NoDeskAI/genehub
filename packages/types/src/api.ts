import type { Gene, GeneVersion, Genome } from './gene.js';

export type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  code: number;
  error_code: string;
  message: string;
  data: null;
};

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type GeneListParams = {
  q?: string;
  category?: string;
  tags?: string[];
  compatibility?: string;
  sort?: 'newest' | 'popular' | 'rating';
  page?: number;
  page_size?: number;
};

export type GeneListResponse = ApiResponse<PaginatedData<Gene>>;
export type GeneDetailResponse = ApiResponse<Gene>;
export type GeneManifestResponse = ApiResponse<Gene['manifest']>;
export type GeneVersionsResponse = ApiResponse<GeneVersion[]>;
export type GenomeDetailResponse = ApiResponse<Genome>;

export type CreateGeneRequest = {
  manifest: Gene['manifest'];
  source?: string;
  source_ref?: string;
};

export const ERROR_CODES = {
  TOKEN_INVALID: 10001,
  TOKEN_EXPIRED: 10002,
  GENE_NOT_FOUND: 20001,
  GENE_VERSION_CONFLICT: 20002,
  GENE_SLUG_EXISTS: 20003,
  GENE_MANIFEST_INVALID: 20004,
  GENOME_NOT_FOUND: 30001,
  DEPENDENCY_RESOLVE_FAILED: 40001,
  COMPATIBILITY_MISMATCH: 40002,
  LEARNING_TASK_TIMEOUT: 50001,
  LEARNING_CALLBACK_FAILED: 50002,
  INTERNAL_ERROR: 90001,
} as const;
