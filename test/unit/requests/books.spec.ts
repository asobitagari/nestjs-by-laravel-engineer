import { CreateBookRequest } from '../../../src/http/requests/books/create-book.request.js';
import { UpdateBookRequest } from '../../../src/http/requests/books/update-book.request.js';
import { invalidProperties } from './validate.js';

const valid = { title: 'こころ', authorId: 1, price: 600 };

describe('CreateBookRequest', () => {
  it('Valid', async () => {
    expect(await invalidProperties(CreateBookRequest, valid)).toEqual([]);
  });

  it('title なし → title', async () => {
    expect(
      await invalidProperties(CreateBookRequest, {
        ...valid,
        title: undefined,
      }),
    ).toEqual(['title']);
  });

  it('authorId なし → authorId', async () => {
    expect(
      await invalidProperties(CreateBookRequest, {
        ...valid,
        authorId: undefined,
      }),
    ).toEqual(['authorId']);
  });

  it('price 0 → price', async () => {
    expect(
      await invalidProperties(CreateBookRequest, { ...valid, price: 0 }),
    ).toEqual(['price']);
  });
});

describe('UpdateBookRequest', () => {
  it('Valid', async () => {
    expect(await invalidProperties(UpdateBookRequest, valid)).toEqual([]);
  });

  it('title なし → title', async () => {
    expect(
      await invalidProperties(UpdateBookRequest, {
        ...valid,
        title: undefined,
      }),
    ).toEqual(['title']);
  });
});
