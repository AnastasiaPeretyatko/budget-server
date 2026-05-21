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
  spend: string;
  remaining: string;
  transactionCount: string;
}
