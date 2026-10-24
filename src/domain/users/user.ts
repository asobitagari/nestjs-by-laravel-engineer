export type User = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
};
export type UserWithPassword = User & { password: string };
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
};
export type UpdateUserInput = { name: string; email: string; isAdmin: boolean };
