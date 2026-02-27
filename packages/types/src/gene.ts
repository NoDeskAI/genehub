import type { GeneSource, ReviewStatus } from './enums.js';
import type { Author, GeneManifest } from './manifest.js';

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
  source: GeneSource;
  source_ref: string | null;
  manifest: GeneManifest;
  compatibility: string[];
  dependencies: { slug: string; version: string }[];
  synergies: string[];
  parent_gene_id: string | null;
  author: Author;
  install_count: number;
  avg_rating: number;
  effectiveness_score: number;
  review_status: ReviewStatus;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Genome = {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  short_description: string;
  icon: string | null;
  genes: { slug: string; version: string; config_override?: Record<string, unknown> }[];
  compatibility: string[];
  install_count: number;
  avg_rating: number;
  author: Author;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GeneVersion = {
  id: string;
  gene_id: string;
  version: string;
  manifest: GeneManifest;
  changelog: string;
  is_latest: boolean;
  published_at: string;
};
