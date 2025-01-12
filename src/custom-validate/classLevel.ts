import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class StringFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;

    const regex = /\/?/;
    return regex.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'The value must match the required format: grade/level.';
  }
}

export function IsClassLevel(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: StringFormatConstraint,
    });
  };
}
