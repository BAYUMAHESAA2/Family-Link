import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Email tidak ditemukan');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Password salah');
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async register(email: string, password: string, name: string, jamaahCode?: string) {
    return this.usersService.create({ email, password, name, jamaahCode });
  }
}