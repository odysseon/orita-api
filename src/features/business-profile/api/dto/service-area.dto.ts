import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  IsNumber,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceAreaType } from '../../../../../generated/prisma/client.js';

@ValidatorConstraint({ name: 'isValidServiceArea', async: false })
export class IsValidServiceAreaConstraint implements ValidatorConstraintInterface {
  validate(type: ServiceAreaType, args: ValidationArguments) {
    const object = args.object as BaseServiceAreaDto;
    switch (type) {
      case ServiceAreaType.INHERIT:
      case ServiceAreaType.NATIONWIDE:
      case ServiceAreaType.REMOTE:
        return (
          object.radiusKm == null &&
          object.administrativeRegionId == null &&
          object.latitude == null &&
          object.longitude == null &&
          object.polygon == null
        );
      case ServiceAreaType.RADIUS:
        return (
          object.radiusKm != null &&
          object.latitude != null &&
          object.longitude != null &&
          object.administrativeRegionId == null &&
          object.polygon == null
        );
      case ServiceAreaType.POLYGON:
        return (
          object.polygon != null &&
          object.radiusKm == null &&
          object.administrativeRegionId == null &&
          object.latitude == null &&
          object.longitude == null
        );
      case ServiceAreaType.ADMIN_REGION:
        return (
          object.administrativeRegionId != null &&
          object.radiusKm == null &&
          object.polygon == null &&
          object.latitude == null &&
          object.longitude == null
        );
      default:
        return false;
    }
  }

  defaultMessage() {
    return 'Service area fields do not match the specified type constraints.';
  }
}

export class BaseServiceAreaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(ServiceAreaType)
  @Validate(IsValidServiceAreaConstraint)
  type!: ServiceAreaType;

  @IsOptional()
  @IsString()
  @ValidateIf((o: BaseServiceAreaDto) => o.type === ServiceAreaType.ADMIN_REGION)
  administrativeRegionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @ValidateIf((o: BaseServiceAreaDto) => o.type === ServiceAreaType.RADIUS)
  @Type(() => Number)
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ValidateIf((o: BaseServiceAreaDto) => o.type === ServiceAreaType.RADIUS)
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ValidateIf((o: BaseServiceAreaDto) => o.type === ServiceAreaType.RADIUS)
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3) // Min 3 points for a valid polygon/triangle
  @ValidateIf((o: BaseServiceAreaDto) => o.type === ServiceAreaType.POLYGON)
  polygon?: Array<[number, number]>;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
