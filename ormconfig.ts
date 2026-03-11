import { ConfigModule } from '@nestjs/config';

import { DataSource } from 'typeorm';

import dbConfig from './src/config/db.config';

ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    '.env',
  ],
  isGlobal: true,
  load: [dbConfig],
});

export const AppDataSource = new DataSource(dbConfig());
