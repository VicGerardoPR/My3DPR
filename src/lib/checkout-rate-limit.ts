import { createHash } from 'node:crypto';

function fingerprint(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function checkoutRateLimitBuckets(ip: string, email: string) {
  const ipHash = fingerprint(ip);
  const emailHash = fingerprint(email);
  return [
    `checkout:ip:minute:${ipHash}`,
    `checkout:email:minute:${emailHash}`,
    `checkout:ip:day:${ipHash}`,
    `checkout:email:day:${emailHash}`,
  ];
}
