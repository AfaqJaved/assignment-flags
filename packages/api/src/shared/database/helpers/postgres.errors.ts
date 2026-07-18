export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

/** Returns the name of the violated unique constraint (e.g. `idx_tenant_slug`), or `''` if unavailable. */
export function getUniqueViolationConstraint(error: unknown): string {
  return typeof error === 'object' && error !== null && 'constraint' in error
    ? (error as { constraint: string }).constraint
    : '';
}
