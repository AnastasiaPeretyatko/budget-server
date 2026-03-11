import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import svcConfig from './svc.config';
import { SvcConfigService } from './svc.config.service';
import dbConfig from './db.config';
import telegramConfig from './telegram.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        `.env`,
      ],
      isGlobal: true,
      load: [svcConfig, dbConfig, telegramConfig],
    }),
  ],
  providers: [SvcConfigService, ConfigService],
  exports: [SvcConfigService, ConfigService],
})
export class SvcConfigModule {}
