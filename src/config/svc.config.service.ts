import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SvcConfigService {
  constructor(private readonly configService: ConfigService) {}

  public get<T>(name: string): T {
    const value = this.configService.get<T>(name);

    if (!value) {
      throw new InternalServerErrorException(
        `${name} parameter does not specified in .env file`,
      );
    }

    return value;
  }
}
