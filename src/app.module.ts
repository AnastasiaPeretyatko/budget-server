import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { LoggerModule } from 'nestjs-pino';
import { pinoHttpConfig } from './config/pino-pretty.config';
import { UserModule } from './domain/user/user.module';
import { SvcConfigModule } from './config/svc.config.module';
import { AuthModule } from './domain/auth/auth.module';
import { CategoriesModule } from './domain/categories/categories.module';
import { SavingAccountModule } from './domain/savings_account/savings_account.module';
import { TransitionModule } from './domain/transition/transition.module';
import { WorkspaceModule } from './domain/workspace/workspaces.module';
import { BillingPeriodModule } from './domain/billing_period/billing_period.module';
import { StatisticsModule } from './domain/statistics/statistics.module';
import { TagsModule } from './domain/tags/tags.module';
import { HealthController } from './domain/health';

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: pinoHttpConfig }),
    SvcConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<{ database: DataSourceOptions }, true>,
      ) => configService.get('database'),
    }),
    AuthModule,
    UserModule,
    CategoriesModule,
    SavingAccountModule,
    TransitionModule,
    WorkspaceModule,
    BillingPeriodModule,
    StatisticsModule,
    TagsModule,
  ],
  providers: [],
  controllers: [HealthController],
})
export class AppModule {}
