import { registerAs } from '@nestjs/config';

const getConfig = () => ({
  ports: {
    rest: process.env.PORT,
  },
  otp: process.env.SECRET_OTP_CODE,
});

export type AppConfig = ReturnType<typeof getConfig>;

export default registerAs('service', getConfig);
