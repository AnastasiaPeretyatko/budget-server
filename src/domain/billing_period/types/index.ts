import { BillingPeriodStatus } from '../billing_period.entity';

export interface CreateBillingPeriodDto {
  startDate: string;
  endDate: string;
  startDay: number;
}

export interface UpdateBillingPeriodDto {
  id: string;
  startDate?: string;
  endDate?: string;
  status?: BillingPeriodStatus;
  startDay?: number;
}
