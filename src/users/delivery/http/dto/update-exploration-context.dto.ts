import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateExplorationContextDto {
  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  longitude!: number;
}
