/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
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
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(AppService.name);
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
      this.logger.debug(`[MAINTAIN SERVER JOB]: ${response.status} OK`);
      this.logger.debug(`[MAINTAIN TMP-SERVER]: ${tmpReq?.status} OK`);
    } catch (error: unknown) {
      const { message, stack } = extractError(error);
      this.logger.error(
        `[MAINTAIN SERVER JOB] Error during request: ${message}`,
        stack,
      );
    }
  }
}
