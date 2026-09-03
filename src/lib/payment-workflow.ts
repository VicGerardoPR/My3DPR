type ExistingOrder = { guest_email?: string | null; payment_method?: string | null } | null;

export function shouldFinalizeFailedClaim(claimed: boolean) {
  return claimed;
}

export function canRecoverIdempotentOrder(
  errorCode: string | undefined,
  order: ExistingOrder,
  email: string,
  method: 'STRIPE' | 'PAYPAL',
) {
  return errorCode === '23505'
    && order?.guest_email?.toLowerCase() === email.toLowerCase()
    && order.payment_method === method;
}
