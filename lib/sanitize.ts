export function sanitizeProductForRole<T extends Record<string, unknown>>(product: T, role: string) {
  if (role === 'owner') return product;
  const { buyingCost: _bc, ...safeProduct } = product;
  return safeProduct;
}

export function sanitizeSaleForRole<T extends Record<string, any>>(sale: T, role: string) {
  const plain = typeof sale?.toObject === 'function' ? sale.toObject() : sale;
  if (role === 'owner' || !plain) return plain;
  return {
    ...plain,
    items: (plain.items || []).map(({ unitCost: _c, ...item }: Record<string, unknown>) => item),
  };
}

export function sanitizeReceivingForRole<T extends Record<string, any>>(receiving: T, role: string) {
  const plain = typeof receiving?.toObject === 'function' ? receiving.toObject() : receiving;
  if (role === 'owner' || !plain) return plain;
  const { totalCost: _tc, items, ...rest } = plain;
  return {
    ...rest,
    items: (items || []).map(({ unitCost: _uc, ...item }: Record<string, unknown>) => item),
  };
}

export function sanitizeReplenishmentForRole<T extends Record<string, any>>(replenishment: T, role: string) {
  const plain = typeof replenishment?.toObject === 'function' ? replenishment.toObject() : replenishment;
  if (role === 'owner' || !plain) return plain;
  const { subtotal: _s, total: _t, items, ...rest } = plain;
  return {
    ...rest,
    items: (items || []).map(({ unitCost: _uc, ...item }: Record<string, unknown>) => item),
  };
}
