import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MovementsService } from './movements.service';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private movementsService: MovementsService) {}

  /**
   * POST /movements/income
   */
  @Post('income')
  @HttpCode(201)
  async createIncome(@Body() data: any, @Req() req: any) {
    return this.movementsService.createIncome(req.user.userId, data);
  }

  /**
   * POST /movements/expense
   */
  @Post('expense')
  @HttpCode(201)
  async createExpense(@Body() data: any, @Req() req: any) {
    return this.movementsService.createExpense(req.user.userId, data);
  }

  /**
   * POST /movements/transfer
   */
  @Post('transfer')
  @HttpCode(201)
  async createTransfer(@Body() data: any, @Req() req: any) {
    return this.movementsService.createTransfer(req.user.userId, data);
  }

  /**
   * POST /movements/adjustment
   */
  @Post('adjustment')
  @HttpCode(201)
  async createAdjustment(@Body() data: any, @Req() req: any) {
    return this.movementsService.createAdjustment(req.user.userId, data);
  }

  /**
   * GET /movements
   * Filtros: accountId, type, categoryId, fromDate, toDate, limit
   */
  @Get()
  async getMovements(@Query() filters: any, @Req() req: any) {
    const movements = await this.movementsService.getMovements(req.user.userId, filters);
    return {
      movements,
      count: movements.length,
    };
  }

  /**
   * GET /movements/summary?year=2026&month=5
   */
  @Get('summary')
  async getMonthlySummary(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
  ) {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    return this.movementsService.getMonthlySummary(req.user.userId, y, m);
  }

  /**
   * GET /movements/:id
   */
  @Get(':id')
  async getMovement(@Param('id') id: string, @Req() req: any) {
    return this.movementsService.findByIdAndUser(id, req.user.userId);
  }

  /**
   * DELETE /movements/:id
   * Elimina movimiento revirtiendo el efecto en la cuenta
   */
  @Delete(':id')
  async deleteMovement(@Param('id') id: string, @Req() req: any) {
    return this.movementsService.deleteMovement(req.user.userId, id);
  }
}
