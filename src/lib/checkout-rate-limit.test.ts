import { describe, expect, it } from 'vitest';
import { checkoutQuoteRateLimitBucket, checkoutRateLimitBuckets } from './checkout-rate-limit';

describe('checkout rate limit buckets', () => {
  it('creates stable distributed buckets without retaining raw identifiers', () => {
    const buckets = checkoutRateLimitBuckets('203.0.113.9', 'Buyer@Example.com');
    expect(buckets).toHaveLength(4);
    expect(buckets.some((bucket) => bucket.includes('global'))).toBe(false);
    expect(buckets.filter((bucket) => bucket.includes(':minute:'))).toHaveLength(2);
    expect(buckets.filter((bucket) => bucket.includes(':day:'))).toHaveLength(2);
    expect(buckets.join('|')).not.toContain('203.0.113.9');
    expect(buckets.join('|')).not.toContain('buyer@example.com');
    expect(buckets).toEqual(checkoutRateLimitBuckets('203.0.113.9', 'buyer@example.com'));
    expect(buckets).not.toEqual(checkoutRateLimitBuckets('203.0.113.10', 'buyer@example.com'));
  });

  it('creates a stable quote bucket without retaining the raw IP address', () => {
    const bucket = checkoutQuoteRateLimitBucket('203.0.113.9');
    expect(bucket).toContain('checkout:quote:ip:minute:');
    expect(bucket).not.toContain('203.0.113.9');
    expect(bucket).toBe(checkoutQuoteRateLimitBucket('203.0.113.9'));
    expect(bucket).not.toBe(checkoutQuoteRateLimitBucket('203.0.113.10'));
  });
});
