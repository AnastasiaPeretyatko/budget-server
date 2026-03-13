import { registerAs } from '@nestjs/config';

import { TelegramConfig } from './types';

export default registerAs(
  'telegram',
  (): TelegramConfig => ({
    token: process.env.TELEGRAM_BOT_ACCESS_KEY,
  }),
);
