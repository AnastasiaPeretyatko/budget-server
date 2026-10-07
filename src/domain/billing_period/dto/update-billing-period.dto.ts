import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import { BillingPeriodStatus } from '../billing_period.entity';
import { IsEndNotBeforeStart, IsRealDate } from './validators';

// Поле не передано (undefined) — не менять. Сбросить поле (null) нельзя.
export class UpdateBillingPeriodDto {
  @IsRealDate()
  startDate?: string;

  @IsEndNotBeforeStart()
  @IsRealDate()
  endDate?: string;

  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((_, value) => value !== undefined)
  startDay?: number;

  // Переоткрыть завершённый период нельзя — только закрыть
  @IsIn([BillingPeriodStatus.COMPLETED], {
    message: 'status can only be set to completed',
  })
  @ValidateIf((_, value) => value !== undefined)
  status?: BillingPeriodStatus;
}
