import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';
import { ServiceAreaType } from '../../../../../generated/prisma/client.js';

@ValidatorConstraint({ name: 'isValidServiceArea', async: false })
export class IsValidServiceAreaConstraint implements ValidatorConstraintInterface {
  validate(type: ServiceAreaType, args: ValidationArguments) {
    const object = args.object as any;
    switch (type) {
      case ServiceAreaType.INHERIT:
      case ServiceAreaType.NATIONWIDE:
      case ServiceAreaType.REMOTE:
        return !object.radiusKm && !object.administrativeRegionId && !object.latitude && !object.longitude && !object.polygon;
      case ServiceAreaType.RADIUS:
        return !!object.radiusKm && object.latitude !== undefined && object.longitude !== undefined && !object.administrativeRegionId && !object.polygon;
      case ServiceAreaType.POLYGON:
        return !!object.polygon && !object.radiusKm && !object.administrativeRegionId && object.latitude === undefined && object.longitude === undefined;
      case ServiceAreaType.ADMIN_REGION:
        return !!object.administrativeRegionId && !object.radiusKm && !object.polygon && object.latitude === undefined && object.longitude === undefined;
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
  @ValidateIf(o => o.type === ServiceAreaType.ADMIN_REGION)
  administrativeRegionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @ValidateIf(o => o.type === ServiceAreaType.RADIUS)
  radiusKm?: number;

  @IsOptional()
  @ValidateIf(o => o.type === ServiceAreaType.RADIUS)
  latitude?: number;

  @IsOptional()
  @ValidateIf(o => o.type === ServiceAreaType.RADIUS)
  longitude?: number;

  // Note: Polygon geometries would ideally be an array of lat/lng pairs
  @IsOptional()
  @ValidateIf(o => o.type === ServiceAreaType.POLYGON)
  polygon?: Array<[number, number]>;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
