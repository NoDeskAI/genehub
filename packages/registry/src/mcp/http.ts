import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './server.js';

/**
 * Handle an MCP Streamable HTTP request (stateless).
 * Each request gets a fresh transport + server so concurrent calls are safe.
 * Transport/server are not explicitly closed — for stateless mode the SSE stream
 * body may still be consumed after handleRequest returns the Response.
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createMcpServer();
  await server.connect(transport);

  return transport.handleRequest(request);
}
