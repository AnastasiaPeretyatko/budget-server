import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import * as qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useLogger(app.get(Logger));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const expressApp = app.getHttpAdapter().getInstance();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  expressApp.set('query parser', (str: string) => qs.parse(str));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // 👈 тоже желательно включить
    }),
  );

  await app.listen(process.env.APP_PORT ?? 3000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
