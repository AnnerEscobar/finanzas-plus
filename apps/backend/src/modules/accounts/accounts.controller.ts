import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  /**
   * POST /accounts
   * Crear una nueva cuenta
   */
  @Post()
  @HttpCode(201)
  async create(@Body() accountData: any, @Req() req: any) {
    return this.accountsService.create(req.user.userId, accountData);
  }

  /**
   * GET /accounts
   * Listar todas las cuentas activas con resumen
   */
  @Get()
  async findByUser(@Req() req: any) {
    const accounts = await this.accountsService.findByUserId(req.user.userId);
    const summary = await this.accountsService.getSummary(req.user.userId);

    return {
      accounts,
      totalBalance: summary.totalBalanceCents,
      totalBalanceFormatted: summary.totalBalanceFormatted,
      summary,
    };
  }

  /**
   * GET /accounts/summary
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.accountsService.getSummary(req.user.userId);
  }

  /**
   * GET /accounts/balance/total
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
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: any) {
    return this.accountsService.findByIdAndUser(id, req.user.userId);
  }

  /**
   * PUT /accounts/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any, @Req() req: any) {
    return this.accountsService.update(id, req.user.userId, updateData);
  }

  /**
   * DELETE /accounts/:id
   * Soft delete (marcar como inactiva)
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.accountsService.delete(id, req.user.userId);
  }
}
