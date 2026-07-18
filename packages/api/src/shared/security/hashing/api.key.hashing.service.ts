import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Hashes tenant API keys for storage/lookup.
 *
 * Unlike (bcrypt), this uses a fast, deterministic
 * SHA-256 hash on purpose: API keys are high-entropy random tokens (not
 * guessable human passwords), and every authenticated request needs to look
 * one up by its hash in O(1) via a unique index — a salted/slow hash like
 * bcrypt would produce a different digest each time and couldn't be used as
 * a lookup key at all.
 */
@Injectable()
export class ApiKeyHashingService {
  hash(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
