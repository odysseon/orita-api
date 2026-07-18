import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { parsePhoneNumberWithError } from 'libphonenumber-js';

@ValidatorConstraint({ async: false })
export class IsE164PhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    if (!phone) return false;
    try {
      const phoneNumber = parsePhoneNumberWithError(phone);
      return phoneNumber.isValid() && phoneNumber.format('E.164') === phone;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Phone number must be a valid globally formatted E.164 number (e.g., +2348012345678)';
  }
}

export function IsE164Phone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsE164PhoneConstraint,
    });
  };
}
