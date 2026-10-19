export function sanitizeProductForRole<T extends Record<string, unknown>>(product: T, role: string) {
  if (role === 'owner') return product;
  const { buyingCost: _bc, ...safeProduct } = product;
  return safeProduct;
}
