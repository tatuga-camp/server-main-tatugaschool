import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAssignmentDto } from './patch-assignment.dto';

const base = {
  query: { assignmentId: '64b8f0c2e1d2a3b4c5d6e7f8' },
};

describe('UpdateAssignmentDto.allowStudentViewScore', () => {
  it('accepts false', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      ...base,
      data: { allowStudentViewScore: false },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.data.allowStudentViewScore).toBe(false);
  });

  it('accepts true', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      ...base,
      data: { allowStudentViewScore: true },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('is optional', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      ...base,
      data: { title: 'x' },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-boolean', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      ...base,
      data: { allowStudentViewScore: 'no' },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
