import { validator } from 'hono/validator';
import type { ValidationTargets } from 'hono';
import type { ZodTypeAny } from 'zod';

type ValidationTarget = keyof ValidationTargets;

export function zValidator<TSchema extends ZodTypeAny, TTarget extends ValidationTarget>(
  target: TTarget,
  schema: TSchema
) {
  return validator(target, async (value, c) => {
    const result = await schema.safeParseAsync(value);

    if (!result.success) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    return result.data;
  });
}
