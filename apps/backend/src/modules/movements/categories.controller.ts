import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  /**
   * GET /categories?type=expense
   * Obtener categorías del usuario (con filtro opcional por tipo)
   */
  @Get()
  async getCategories(@Query('type') type: string, @Req() req: any) {
    return this.categoriesService.getCategories(req.user.userId, type);
  }

  /**
   * POST /categories
   * Crear nueva categoría
   */
  @Post()
  async createCategory(@Body() data: any, @Req() req: any) {
    return this.categoriesService.createCategory(req.user.userId, data);
  }

  /**
   * PUT /categories/:id
   * Actualizar categoría
   */
  @Put(':id')
  async updateCategory(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.categoriesService.updateCategory(req.user.userId, id, data);
  }

  /**
   * DELETE /categories/:id
   * Desactivar categoría (soft delete)
   */
  @Delete(':id')
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.deleteCategory(req.user.userId, id);
  }
}
