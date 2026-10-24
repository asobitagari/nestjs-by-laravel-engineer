import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export type ValidationErrors = Record<string, string[]>;

// Illuminate\Validation\ValidationException 相当。ボディは { message, errors }
export class ValidationException extends HttpException {
  constructor(message: string, errors: ValidationErrors) {
    super({ message, errors }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ValidationPipe の exceptionFactory。class-validator のエラーを Laravel の 422 形式にする
export function validationExceptionFactory(
  errors: ValidationError[],
): ValidationException {
  const bag: ValidationErrors = {};
  for (const error of errors) {
    const messages = Object.values(error.constraints ?? {});
    if (messages.length > 0) bag[error.property] = messages;
  }

  return new ValidationException(summarize(bag), bag);
}

// ValidationException::summarize と同じ書式：「最初のエラー (and N more error(s))」
function summarize(errors: ValidationErrors): string {
  const messages = Object.values(errors).flat();
  const [first = 'The given data was invalid.'] = messages;
  const rest = messages.length - 1;
  if (rest <= 0) return first;
  return `${first} (and ${rest} more ${rest === 1 ? 'error' : 'errors'})`;
}
