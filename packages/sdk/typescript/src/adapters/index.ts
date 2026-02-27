import type { GeneAdapter } from '@genehub/types';
import { OpenClawAdapter } from './openclaw.js';
import { NanobotAdapter } from './nanobot.js';
import { GenericAdapter } from './generic.js';

const ADAPTERS: (() => GeneAdapter)[] = [
  () => new OpenClawAdapter(),
  () => new NanobotAdapter(),
  () => new GenericAdapter(),
];

export async function detectAdapter(): Promise<GeneAdapter> {
  for (const create of ADAPTERS) {
    const adapter = create();
    if (await adapter.detect()) {
      return adapter;
    }
  }
  return new GenericAdapter();
}

export function getAdapter(product: string): GeneAdapter {
  switch (product) {
    case 'openclaw':
      return new OpenClawAdapter();
    case 'nanobot':
      return new NanobotAdapter();
    default:
      return new GenericAdapter();
  }
}
