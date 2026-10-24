import { ValidationError } from 'class-validator';
import {
  ValidationException,
  validationExceptionFactory,
} from '../../../src/http/filters/validation-exception.factory.js';

function error(
  property: string,
  constraints: Record<string, string>,
): ValidationError {
  return Object.assign(new ValidationError(), {
    property,
    constraints,
    children: [],
  });
}

function body(exception: ValidationException) {
  return exception.getResponse() as {
    message: string;
    errors: Record<string, string[]>;
  };
}

describe('validationExceptionFactory', () => {
  it('422 の ValidationException を返す', () => {
    const exception = validationExceptionFactory([
      error('name', { isNotEmpty: 'name should not be empty' }),
    ]);

    expect(exception).toBeInstanceOf(ValidationException);
    expect(exception.getStatus()).toBe(422);
  });

  it('1 件のとき message はそのエラー文', () => {
    const exception = validationExceptionFactory([
      error('name', { isNotEmpty: 'name should not be empty' }),
    ]);

    expect(body(exception).message).toBe('name should not be empty');
  });

  it('2 件のとき (and 1 more error) が付く', () => {
    const exception = validationExceptionFactory([
      error('name', { isNotEmpty: 'name should not be empty' }),
      error('email', { isEmail: 'email must be an email' }),
    ]);

    expect(body(exception).message).toBe(
      'name should not be empty (and 1 more error)',
    );
  });

  it('3 件のとき (and 2 more errors) と複数形になる', () => {
    const exception = validationExceptionFactory([
      error('title', {
        isNotEmpty: 'title should not be empty',
        isString: 'title must be a string',
      }),
      error('price', { min: 'price must not be less than 1' }),
    ]);

    expect(body(exception).message).toBe(
      'title should not be empty (and 2 more errors)',
    );
  });

  it('errors はプロパティ名ごとのメッセージの配列で、違反したプロパティだけがキーになる', () => {
    const exception = validationExceptionFactory([
      error('title', {
        isNotEmpty: 'title should not be empty',
        isString: 'title must be a string',
      }),
      error('price', { min: 'price must not be less than 1' }),
    ]);

    expect(body(exception).errors).toEqual({
      title: ['title should not be empty', 'title must be a string'],
      price: ['price must not be less than 1'],
    });
  });
});
