import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';

export interface JwtPayload {
  id: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException({
        message: 'The user is not logged in',
      });
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        message: 'The user is not logged in',
      });
    }

    try {
      const user = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET_KEY || 'SECRET',
      });

      req.user = user; // теперь тип безопасен
      return true;
    } catch {
      throw new UnauthorizedException({
        message: 'The user is not logged in',
      });
    }
  }
}
