import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { TransitionService } from './transition.service';
import { TransitionController } from './transition.controller';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransitionEntity, SavingAccountEntity])],
  controllers: [TransitionController],
  providers: [TransitionService],
  exports: [TransitionService],
})
export class TransitionModule {}
