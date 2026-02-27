import type { Context } from 'hono';
import { ERROR_CODES } from '@genehub/types';

export class AppError extends Error {
  constructor(
    public code: number,
    public errorCode: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static geneNotFound(slug: string) {
    return new AppError(ERROR_CODES.GENE_NOT_FOUND, 'gene_not_found', `基因 ${slug} 不存在`, 404);
  }

  static slugExists(slug: string) {
    return new AppError(
      ERROR_CODES.GENE_SLUG_EXISTS,
      'gene_slug_exists',
      `基因 slug ${slug} 已存在`,
      409,
    );
  }

  static manifestInvalid(detail: string) {
    return new AppError(
      ERROR_CODES.GENE_MANIFEST_INVALID,
      'gene_manifest_invalid',
      `Manifest 校验失败: ${detail}`,
      422,
    );
  }

  static versionNotFound(slug: string, version: string) {
    return new AppError(
      ERROR_CODES.GENE_VERSION_NOT_FOUND,
      'gene_version_not_found',
      `基因 ${slug} 版本 ${version} 不存在`,
      404,
    );
  }

  static versionConflict(slug: string, version: string) {
    return new AppError(
      ERROR_CODES.GENE_VERSION_CONFLICT,
      'gene_version_conflict',
      `基因 ${slug} 版本 ${version} 已存在`,
      409,
    );
  }

  static dependencyResolveFailed(detail: string) {
    return new AppError(
      ERROR_CODES.DEPENDENCY_RESOLVE_FAILED,
      'dependency_resolve_failed',
      `依赖解析失败: ${detail}`,
      422,
    );
  }

  static compatibilityMismatch(detail: string) {
    return new AppError(
      ERROR_CODES.COMPATIBILITY_MISMATCH,
      'compatibility_mismatch',
      `兼容性不匹配: ${detail}`,
      422,
    );
  }

  static tokenInvalid() {
    return new AppError(ERROR_CODES.TOKEN_INVALID, 'token_invalid', '无效的 API Token', 401);
  }

  static permissionDenied() {
    return new AppError(ERROR_CODES.PERMISSION_DENIED, 'permission_denied', '权限不足', 403);
  }

  static internal(message = '内部错误') {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, 'internal_error', message, 500);
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { code: err.code, error_code: err.errorCode, message: err.message, data: null },
      err.status as 400,
    );
  }

  console.error('Unhandled error:', err);
  return c.json(
    {
      code: ERROR_CODES.INTERNAL_ERROR,
      error_code: 'internal_error',
      message: '内部错误',
      data: null,
    },
    500,
  );
}
