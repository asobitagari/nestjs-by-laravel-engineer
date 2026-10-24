import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Validator::make($data, $rules) 相当。HTTP を通さず、エラーになったプロパティ名を返す
export async function invalidProperties<T extends object>(
  cls: new () => T,
  plain: object,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain), {
    whitelist: true,
  });
  return errors.map((error) => error.property);
}

export function toInstance<T extends object>(
  cls: new () => T,
  plain: object,
): T {
  return plainToInstance(cls, plain);
}
