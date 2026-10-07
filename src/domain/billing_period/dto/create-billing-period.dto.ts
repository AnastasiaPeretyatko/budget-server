import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { IsEndNotBeforeStart, IsPeriodShape, IsRealDate } from './validators';

// Нужно либо обе даты (endDate >= startDate), либо startDay
export class CreateBillingPeriodDto {
  @IsRealDate()
  startDate?: string;

  @IsPeriodShape()
  @IsEndNotBeforeStart()
  @IsRealDate()
  endDate?: string;

  // ValidateIf: IsOptional пропустил бы и null
  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((_, value) => value !== undefined)
  startDay?: number;
}
