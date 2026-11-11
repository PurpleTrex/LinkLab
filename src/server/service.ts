import { AppError, notFound } from '../domain/errors.ts';
import {
  fingerprint,
  linkState,
  randomAlias,
  type Clock,
  type CreateInput,
  type Link,
} from '../domain/link.ts';
import { LinkRepository } from './repository.ts';

export class LinkService {
  constructor(
    readonly repository: LinkRepository,
    readonly clock: Clock,
    readonly makeAlias = randomAlias,
  ) {}

  async create(
    ownerId: string,
    input: CreateInput,
    creationKey: string,
  ): Promise<{ link: Link; replayed: boolean }> {
    const hash = await fingerprint(input);
    const replay = (existing: Link) => {
      if (existing.requestHash !== hash)
        throw new AppError(
          409,
          'idempotency_conflict',
          'This idempotency key was already used for a different request.',
        );
      return { link: existing, replayed: true };
    };
    const existing = await this.repository.byKey(ownerId, creationKey);
    if (existing) return replay(existing);
    if (
      input.expiresAt !== null &&
      (input.expiresAt <= this.clock.now() || input.expiresAt > this.clock.now() + 365 * 86400000)
    ) {
      throw new AppError(
        400,
        'invalid_expiration',
        'Expiration must be in the future and within one year.',
      );
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const link: Link = {
        ...input,
        id: crypto.randomUUID(),
        ownerId,
        alias: input.alias ?? this.makeAlias(),
        createdAt: this.clock.now(),
        creationKey,
        requestHash: hash,
        revokedAt: null,
        version: 1,
      };
      const inserted = await this.repository.insert(link);
      if (inserted) return { link: inserted, replayed: false };
      const concurrent = await this.repository.byKey(ownerId, creationKey);
      if (concurrent) return replay(concurrent);
      if (input.alias)
        throw new AppError(
          409,
          'alias_unavailable',
          'That alias is already in use. Choose another.',
        );
    }
    throw new AppError(
      503,
      'alias_allocation_failed',
      'A link could not be allocated. Please retry.',
      { 'Retry-After': '1' },
    );
  }

  async resolve(alias: string): Promise<Link> {
    const link = await this.repository.byAlias(alias);
    if (!link) throw notFound();
    if (linkState(link, this.clock.now()) !== 'active')
      throw new AppError(410, 'link_unavailable', 'This link has expired or has been revoked.');
    return link;
  }

  async revoke(owner: string, id: string, version: number) {
    const updated = await this.repository.revoke(owner, id, version, this.clock.now());
    if (updated) return updated;
    const existing = await this.repository.byId(owner, id);
    if (!existing) throw notFound();
    if (existing.revokedAt !== null) return existing;
    throw new AppError(409, 'version_conflict', 'The link has changed. Refresh and try again.');
  }
}
