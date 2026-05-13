import { registerAs } from '@nestjs/config';
import { AppConfig } from './types';

export default registerAs('app', (): AppConfig => {
  return {
    healthUrl: process.env.HEALTH_CHECK_URL as string,
  };
});
