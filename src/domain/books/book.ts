export type Book = {
  id: number;
  title: string;
  authorId: number;
  price: number;
};
export type CreateBookInput = {
  title: string;
  authorId: number;
  price: number;
};
export type UpdateBookInput = {
  title: string;
  authorId: number;
  price: number;
};
