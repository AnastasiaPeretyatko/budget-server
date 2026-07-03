export interface CreateSavingAccountDto {
  name: string;
  description?: string;
  amount: string;
}

export interface UpdateSavingAccountDto {
  id: string;
  name?: string;
  description?: string;
  amount?: string;
}

export interface SavingAccountRaw {
  periodIncome: string;
  periodExpense: string;
  transactionCount: string;
}
