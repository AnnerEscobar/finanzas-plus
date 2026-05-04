import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: { name: string; email: string; userId?: string }) {
    try {
      const userId = body.userId || body.email || `user-${Date.now()}`;

      const existingUser = await this.usersService.findById(userId);
      if (existingUser) {
        return { error: 'Usuario ya existe', statusCode: 400 };
      }

      const newUser = await this.usersService.create({
        _id: userId,
        name: body.name || 'Usuario',
        email: body.email || `user-${Date.now()}@example.com`,
        currency: 'Q',
        timezone: 'America/Guatemala',
        settings: {},
      });

      const token = this.authService.generateToken(userId);
      return { token, user: newUser, message: 'Usuario creado exitosamente' };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al registrar usuario';
      return { error: errorMsg, details: error };
    }
  }

  @Post('login')
  async login(@Body('userId') userId: string) {
    const user = await this.authService.validateUser(userId);
    if (!user) {
      return { error: 'Usuario no encontrado. Registrate primero en /api/auth/register' };
    }
    const token = this.authService.generateToken(userId);
    return { token, user };
  }
}
