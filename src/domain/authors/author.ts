export type Author = { id: number; name: string; email: string | null };
export type CreateAuthorInput = { name: string; email?: string | null };
export type UpdateAuthorInput = { name: string; email?: string | null };
