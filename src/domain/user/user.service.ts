import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IUser } from './types';
import { UserEntity } from './user.entity';
import { LoginDto } from '../auth/dto/login.dto';
import { ApiException } from 'src/common/exceptions/api.exceptions';

@Injectable()
export class UserService {
  constructor(
    private readonly datasource: DataSource,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(UserService.name);
  }

  async findOneBy(dto: Partial<IUser>) {
    return this.datasource.getRepository(UserEntity).findOneBy(dto);
  }

  async createUser({ email, password }: LoginDto) {
    const isUsed = await this.findOneBy({ email });

    if (isUsed) throw ApiException.badRequest('User is already registered');

    const user = new UserEntity();
    user.email = email;
    user.plainPassword = password;

    await this.datasource.getRepository(UserEntity).save(user);
    return await this.findOneBy({ email });
  }
}
