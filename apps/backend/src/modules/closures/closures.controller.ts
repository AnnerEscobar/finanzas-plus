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
import { ClosuresService } from './closures.service';

@Controller('closures')
@UseGuards(JwtAuthGuard)
export class ClosuresController {
  constructor(private closuresService: ClosuresService) {}

  /**
   * GET /closures
   * Lista todos los cierres del usuario
   */
  @Get()
  async listClosures(@Req() req: any) {
    const closures = await this.closuresService.listClosures(req.user.userId);
    return { closures, count: closures.length };
  }

  /**
   * GET /closures/evolution
   * Resumen de evolución para gráfica
   */
  @Get('evolution')
  async getEvolution(@Req() req: any) {
    return this.closuresService.getEvolutionSummary(req.user.userId);
  }

  /**
   * POST /closures/generate
   * Generar cierre para un mes específico
   * Body: { month: 'YYYY-MM' }
   */
  @Post('generate')
  @HttpCode(201)
  async generateClosure(@Body() body: any, @Req() req: any) {
    return this.closuresService.generateClosure(req.user.userId, body.month);
  }

  /**
   * GET /closures/month/:month
   * Obtener cierre por mes (YYYY-MM)
   */
  @Get('month/:month')
  async getClosureByMonth(@Param('month') month: string, @Req() req: any) {
    return this.closuresService.getClosureByMonth(req.user.userId, month);
  }

  /**
   * GET /closures/:id
   */
  @Get(':id')
  async getClosure(@Param('id') id: string, @Req() req: any) {
    return this.closuresService.getClosureById(id, req.user.userId);
  }

  /**
   * PUT /closures/:id
   * Actualizar snapshot (solo si está editable)
   */
  @Put(':id')
  async updateClosure(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.closuresService.updateClosure(id, req.user.userId, data);
  }

  /**
   * POST /closures/:id/close
   * Cerrar mes (bloquear edición)
   */
  @Post(':id/close')
  @HttpCode(200)
  async closeMonth(@Param('id') id: string, @Req() req: any) {
    return this.closuresService.closeMonth(id, req.user.userId);
  }

  /**
   * POST /closures/:id/reopen
   * Reabrir mes cerrado
   */
  @Post(':id/reopen')
  @HttpCode(200)
  async reopenMonth(@Param('id') id: string, @Req() req: any) {
    return this.closuresService.reopenMonth(id, req.user.userId);
  }

  /**
   * DELETE /closures/:id
   */
  @Delete(':id')
  async deleteClosure(@Param('id') id: string, @Req() req: any) {
    return this.closuresService.deleteClosure(id, req.user.userId);
  }
}
