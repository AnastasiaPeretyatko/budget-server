export interface CreateSavingAccountDto {
  name: string;
  description?: string;
  amount: string;
  isSafe?: boolean;
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
