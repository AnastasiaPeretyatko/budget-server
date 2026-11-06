export interface CreateSavingAccountDto {
  name: string;
  description?: string;
  amount: string;
  isSafe?: boolean;
  icon?: string;
  color?: string;
  index: number;
}

export interface UpdateSavingAccountDto {
  id: string;
  name?: string;
  description?: string;
  amount?: string;
  isSafe?: boolean;
}

export interface SavingAccountRaw {
  periodIncome: string;
  periodExpense: string;
  transactionCount: string;
}
