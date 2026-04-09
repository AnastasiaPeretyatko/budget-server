import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, TokenExpiredError } from '@nestjs/jwt';

import { ApiException } from 'src/common/exceptions/api.exceptions';

import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { IUser } from '../user/types';
import { DataSource } from 'typeorm';
import { UserEntity } from '../user/user.entity';

const ACESSEC_TOKEN_TIME = '1m';
const REFRESH_TOKEN_TIME = '15m';

@Injectable()
export class AuthService {
  constructor(
    private readonly datasource: DataSource,
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    return {
      user,
      token: this.generateToken(user!, ACESSEC_TOKEN_TIME),
      refreshToken: this.generateToken(user!, REFRESH_TOKEN_TIME),
    };
  }

  async register(dto: LoginDto) {
    const user = await this.userService.createUser(dto);
    if (!user) throw ApiException.serverError('Something some wrong!');

    return {
      user: { id: user.id, email: user.email },
      token: this.generateToken(user, ACESSEC_TOKEN_TIME),
      refreshToken: this.generateToken(user, REFRESH_TOKEN_TIME),
    };
  }

  private async validateUser(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.datasource
      .getRepository(UserEntity)
      .createQueryBuilder('users')
      .addSelect('users.password')
      .where('users.email = :email', { email })
      .getOne();

    if (!user) throw ApiException.badRequest('User is not found!');

    const passwordEquals = await user.comparePassword(password);

    if (!passwordEquals) throw ApiException.unautorized(`User is not found!`);
    return await this.userService.findOneBy({ email: dto.email });
  }

  private generateToken(
    user: IUser,
    tokenLifeTime?: JwtSignOptions['expiresIn'],
  ) {
    const payload = { email: user.email, id: user.id };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET_KEY || 'SECRET',
      expiresIn: tokenLifeTime || ACESSEC_TOKEN_TIME,
    });
  }

  refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify<IUser>(token, {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET_KEY || 'SECRET',
      });

      if (!payload) throw ApiException.unautorized('Refresh token unvalid');
      return {
        token: this.generateToken(payload, ACESSEC_TOKEN_TIME),
      };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw ApiException.unautorized('Refresh token expired');
      }

      throw ApiException.unautorized('Refresh token invalid');
    }
  }
}
