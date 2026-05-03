import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  generateToken(userId: string) {
    return this.jwtService.sign({ sub: userId });
  }
}
