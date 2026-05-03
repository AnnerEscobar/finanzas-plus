import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body('userId') userId: string) {
    const user = await this.authService.validateUser(userId);
    if (!user) {
      return { error: 'Invalid user' };
    }
    const token = this.authService.generateToken(userId);
    return { token, user };
  }
}
