import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { LoggerModule } from 'nestjs-pino';
import { pinoPrettyConfig } from './config/pino-pretty.config';
import { getControllerName } from './common/helpers/get-controller-name.helper';
import { UserModule } from './domain/user/user.module';
import { SvcConfigModule } from './config/svc.config.module';
import { AuthModule } from './domain/auth/auth.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: pinoPrettyConfig,
        customProps: (req) => ({
          context: getControllerName(req),
        }),
      },
    }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
