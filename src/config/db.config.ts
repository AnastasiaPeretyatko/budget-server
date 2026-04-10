import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { NamingStrategy } from './db-naming.strategy';

export default registerAs(
  'database',
  (): DataSourceOptions => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    password: String(process.env.PGPASSWORD),
    username: String(process.env.PGUSER),
    entities: [join(__dirname, '../**/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../../db/migrations/*.{ts,js}')],
    namingStrategy: new NamingStrategy(),
    synchronize: false,
    logging: process.env.DATABASE_LOGGING_ENABLED === 'true',
    uuidExtension: 'pgcrypto',
  }),
);
