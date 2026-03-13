import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingAccountController } from './savings_account.controller';
import { SavingAccountEntity } from './savings_account.entity';
import { SavingAccountService } from './savings_account.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavingAccountEntity])],
  controllers: [SavingAccountController],
  providers: [SavingAccountService],
  exports: [SavingAccountService],
})
export class SavingAccountModule {}
