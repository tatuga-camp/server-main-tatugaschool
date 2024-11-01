import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
  } from 'class-validator';
  
  // Define the validator constraint
  @ValidatorConstraint({ async: false })
  export class IsEducationYearConstraint implements ValidatorConstraintInterface {
    validate(value: string, args: ValidationArguments) {
      // Regex to match 1-10 as the first part and 4-digit year as the second part
      if (Array.isArray(value) && typeof value[1] === 'string') {
        value = value[1];
      }
  
      // Validate the extracted or single string value
      const regex = /^(10|[1-9])\/\d{4}$/;
      return typeof value === 'string' && regex.test(value);
    }
  
    defaultMessage(args: ValidationArguments) {
      return 'Education year format is invalid. Expected format: "1-10/YYYY"';
    }
  }
  
  // Custom decorator function
  export function IsEducationYear(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
      registerDecorator({
        target: object.constructor,
        propertyName: propertyName,
        options: validationOptions,
        constraints: [],
        validator: IsEducationYearConstraint,
      });
    };
  }
  