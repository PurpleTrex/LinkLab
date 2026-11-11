import type { publicLink } from './link.ts';
import type { Analytics } from '../server/analytics.ts';
export type LinkView = ReturnType<typeof publicLink>;
export type Overview = Awaited<ReturnType<Analytics['overview']>>;
export interface LinkPage {
  links: LinkView[];
  nextCursor: string | null;
}
