import { Controller, Get, Post, Body, Param, Put, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  /**
   * POST /accounts
   * Crear una nueva cuenta
   * Body: { alias, institution?, type?, currentBalanceCents? }
   */
  @Post()
  async create(@Body() accountData: any, @Req() req: any) {
    return this.accountsService.create(req.user.userId, accountData);
  }

  /**
   * GET /accounts
   * Listar todas las cuentas activas del usuario
   */
  @Get()
  async findByUser(@Req() req: any) {
    const accounts = await this.accountsService.findByUserId(req.user.userId);
    const totalBalance = await this.accountsService.getTotalBalance(req.user.userId);

    return {
      accounts,
      totalBalance,
      totalBalanceFormatted: `Q${(totalBalance / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /accounts/total
   * Obtener el saldo total disponible (RB-01)
   */
  @Get('balance/total')
  async getTotalBalance(@Req() req: any) {
    const totalCents = await this.accountsService.getTotalBalance(req.user.userId);

    return {
      totalCents,
      totalFormatted: `Q${(totalCents / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /accounts/:id
   * Obtener detalles de una cuenta específica
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.accountsService.findById(id);
  }

  /**
   * PUT /accounts/:id
   * Actualizar una cuenta
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.accountsService.update(id, updateData);
  }
}
