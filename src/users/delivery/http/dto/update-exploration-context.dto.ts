import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class UpdateExplorationContextDto {
  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  longitude!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
