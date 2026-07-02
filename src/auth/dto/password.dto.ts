import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class LoginPasswordDto {
  /**
   * The email address of the user.
   * @example ada@example.com
   */
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /**
   * The password for the account.
   * @example secret123!
   */
  @IsNotEmpty()
  @IsStrongPassword()
  password!: string;
}

export class RequestPasswordResetDto {
  /**
   * The email address of the user.
   * @example ada@example.com
   */
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  /**
   * The reset token sent to the user's email.
   */
  @IsNotEmpty()
  token!: string;

  /**
   * The new password for the account.
   * @example secret123!
   */
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword!: string;
}

export class ChangePasswordDto {
  /**
   * The current password.
   */
  @IsNotEmpty()
  currentPassword!: string;

  /**
   * The new password to set.
   * @example secret123!
   */
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword!: string;
}

export class AddPasswordDto {
  /**
   * The password to add to the account.
   * @example secret123!
   */
  @IsNotEmpty()
  @IsStrongPassword()
  password!: string;
}
