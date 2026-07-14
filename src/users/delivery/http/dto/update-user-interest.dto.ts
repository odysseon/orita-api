import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserInterestDto {
  /**
   * The unique identifier of the category to add to interests.
   * @example "cmrhwnjhl0001m0fxfcpxmwyl"
   */
  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
