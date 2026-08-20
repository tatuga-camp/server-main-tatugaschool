import { validate } from 'class-validator';
import { UpdateUserDto } from './patch-user.dto';

describe('UpdateUserDto', () => {
  it('accepts language en and th', async () => {
    for (const language of ['en', 'th']) {
      const dto = Object.assign(new UpdateUserDto(), { language });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects an unknown language', async () => {
    const dto = Object.assign(new UpdateUserDto(), { language: 'fr' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });

  it('allows language to be omitted', async () => {
    const dto = Object.assign(new UpdateUserDto(), { firstName: 'A' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
