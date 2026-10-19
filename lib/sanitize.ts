export function sanitizeProductForRole<T extends Record<string, unknown>>(product: T, role: string) {
  if (role === 'owner') return product;
  const { buyingCost: _bc, ...safeProduct } = product;
  return safeProduct;
}

export function sanitizeSaleForRole<T extends Record<string, any>>(sale: T, role: string) {
  const plain = typeof sale.toObject === 'function' ? sale.toObject() : sale;
  if (role === 'owner') return plain;
  return {
    ...plain,
    items: (plain.items || []).map(({ unitCost: _c, ...item }: Record<string, unknown>) => item),
  };
}
