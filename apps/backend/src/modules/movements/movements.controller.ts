import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MovementsService } from './movements.service';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private movementsService: MovementsService) {}

  /**
   * POST /movements/income
   * Registrar un ingreso (RB-05)
   */
  @Post('income')
  async createIncome(@Body() data: any, @Req() req: any) {
    return this.movementsService.createIncome(req.user.userId, data);
  }

  /**
   * POST /movements/expense
   * Registrar un gasto con efectivo/débito (RB-06)
   */
  @Post('expense')
  async createExpense(@Body() data: any, @Req() req: any) {
    return this.movementsService.createExpense(req.user.userId, data);
  }

  /**
   * POST /movements/transfer
   * Registrar transferencia entre cuentas propias (RB-08)
   */
  @Post('transfer')
  async createTransfer(@Body() data: any, @Req() req: any) {
    return this.movementsService.createTransfer(req.user.userId, data);
  }

  /**
   * POST /movements/adjustment
   * Registrar ajuste de saldo (conciliación)
   */
  @Post('adjustment')
  async createAdjustment(@Body() data: any, @Req() req: any) {
    return this.movementsService.createAdjustment(req.user.userId, data);
  }

  /**
   * GET /movements
   * Obtener movimientos con filtros
   */
  @Get()
  async getMovements(@Query() filters: any, @Req() req: any) {
    return this.movementsService.getMovements(req.user.userId, filters);
  }

  /**
   * GET /movements/summary?year=2026&month=5
   * Obtener resumen mensual
   */
  @Get('summary')
  async getMonthlySummary(@Query('year') year: string, @Query('month') month: string, @Req() req: any) {
    return this.movementsService.getMonthlySummary(req.user.userId, parseInt(year), parseInt(month));
  }
}
