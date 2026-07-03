import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { extractError } from './common/helpers';

@Injectable()
export class AppService {
  private readonly URL: string;
  private readonly tmpServiceURL = 'https://larning-log-j4wm.onrender.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AppService.name)
    private readonly logger: PinoLogger,
  ) {
    this.URL = this.configService.get<string>('app.healthUrl', '');
  }

  @Cron('0 */3 * * * *') //every 3 minutes
  async handleCron() {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(this.URL),
      );
      const tmpReq: AxiosResponse = await firstValueFrom(
        this.httpService.get(this.tmpServiceURL),
      );
      this.logger.debug('MAINTAIN SERVER JOB: %d OK', response.status);
      this.logger.debug('MAINTAIN TMP-SERVER: %d OK', tmpReq?.status);
    } catch (error: unknown) {
      const { message, stack } = extractError(error);
      this.logger.error({ stack }, 'MAINTAIN SERVER JOB error: %s', message);
    }
  }
}
