import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneHubClient } from '../client.js';

const BASE_URL = 'https://registry.example.com';

describe('GeneHubClient', () => {
  let client: GeneHubClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new GeneHubClient({ registryUrl: BASE_URL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('searchGenes(query) 应构造正确 URL 并返回解析结果', async () => {
    const mockData = { items: [], total: 0, page: 1, page_size: 20 };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: mockData }),
    });

    const result = await client.searchGenes({ q: 'test' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes?q=test`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('getGene(slug) 应构造正确 URL 并返回基因数据', async () => {
    const mockGene = { slug: 'my-gene', name: 'My Gene', version: '1.0.0' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: mockGene }),
    });

    const result = await client.getGene('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/v1/genes/my-gene`, expect.any(Object));
    expect(result).toEqual(mockGene);
  });

  it('getManifest(slug) 应构造正确 URL 并返回 manifest', async () => {
    const mockManifest = { slug: 'my-gene', version: '1.0.0', name: 'Test' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: mockManifest }),
    });

    const result = await client.getManifest('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/manifest`,
      expect.any(Object),
    );
    expect(result).toEqual(mockManifest);
  });

  it('getManifest(slug, version) 应添加 version 查询参数', async () => {
    const mockManifest = { slug: 'my-gene', version: '2.0.0', name: 'Test' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: mockManifest }),
    });

    await client.getManifest('my-gene', '2.0.0');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/manifest?version=2.0.0`,
      expect.any(Object),
    );
  });

  it('getVersions(slug) 应构造正确 URL', async () => {
    const mockVersions = [{ version: '1.0.0' }, { version: '2.0.0' }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: mockVersions }),
    });

    const result = await client.getVersions('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/versions`,
      expect.any(Object),
    );
    expect(result).toEqual(mockVersions);
  });

  it('reportInstall(slug) 应发送 POST 请求', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: null }),
    });

    await client.reportInstall('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/installed`,
      expect.objectContaining({
        method: 'POST',
        body: '{}',
      }),
    );
  });

  it('downloadArchive(slug) 应返回 ArrayBuffer', async () => {
    const mockBuffer = new ArrayBuffer(8);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockBuffer),
    });

    const result = await client.downloadArchive('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/archive`,
      expect.objectContaining({ headers: {} }),
    );
    expect(result).toBe(mockBuffer);
  });

  it('downloadArchive(slug, version) 应添加 version 查询参数', async () => {
    const mockBuffer = new ArrayBuffer(8);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockBuffer),
    });

    await client.downloadArchive('my-gene', '2.0.0');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/archive?version=2.0.0`,
      expect.any(Object),
    );
  });

  it('非 ok 响应应抛出错误', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: 1, message: 'Not Found', error_code: 'not_found' }),
    });

    await expect(client.getGene('missing')).rejects.toThrow(/\[GeneHub\].*Not Found/);
  });

  it('code 非 0 时应抛出错误', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 1, message: 'Internal error', data: null }),
    });

    await expect(client.getGene('my-gene')).rejects.toThrow(/\[GeneHub\].*Internal error/);
  });

  it('设置 token 时应在请求头中包含 Authorization', async () => {
    const authedClient = new GeneHubClient({ registryUrl: BASE_URL, token: 'secret-token' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: {} }),
    });

    await authedClient.getGene('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('downloadArchive 在设置 token 时应包含 Authorization 头', async () => {
    const authedClient = new GeneHubClient({ registryUrl: BASE_URL, token: 'secret-token' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });

    await authedClient.downloadArchive('my-gene');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/genes/my-gene/archive`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret-token' },
      }),
    );
  });
});
