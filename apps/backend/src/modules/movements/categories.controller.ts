import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  /**
   * GET /categories?type=expense
   */
  @Get()
  async getCategories(@Query('type') type: string, @Req() req: any) {
    const categories = await this.categoriesService.getCategories(req.user.userId, type);
    return {
      categories,
      count: categories.length,
    };
  }

  /**
   * POST /categories
   */
  @Post()
  @HttpCode(201)
  async createCategory(@Body() data: any, @Req() req: any) {
    return this.categoriesService.createCategory(req.user.userId, data);
  }

  /**
   * POST /categories/ensure-defaults
   * Asegura que las categorías default existan
   */
  @Post('ensure-defaults')
  @HttpCode(200)
  async ensureDefaults(@Req() req: any) {
    return this.categoriesService.ensureDefaultCategories(req.user.userId);
  }

  /**
   * PUT /categories/:id
   */
  @Put(':id')
  async updateCategory(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.categoriesService.updateCategory(req.user.userId, id, data);
  }

  /**
   * DELETE /categories/:id
   */
  @Delete(':id')
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.deleteCategory(req.user.userId, id);
  }
}
