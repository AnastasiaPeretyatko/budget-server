import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { TransitionService } from './transition.service';
import { TransitionController } from './transition.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransitionEntity])],
  controllers: [TransitionController],
  providers: [TransitionService],
  exports: [TransitionService],
})
export class TransitionModule {}
