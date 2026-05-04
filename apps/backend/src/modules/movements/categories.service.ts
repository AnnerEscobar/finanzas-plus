import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  /**
   * Obtener categorías del usuario
   */
  async getCategories(userId: string, type?: string) {
    const query: any = { userId, isActive: true };

    if (type) {
      query.type = type;
    }

    return this.categoryModel.find(query).sort({ name: 1 });
  }

  /**
   * Crear categoría personalizada
   */
  async createCategory(userId: string, data: any) {
    const { name, type } = data;

    const category = new this.categoryModel({
      userId,
      name,
      type: type || 'expense',
      isDefault: false,
      isActive: true,
    });

    return category.save();
  }

  /**
   * Inicializar categorías por defecto para un usuario
   */
  async initializeDefaultCategories(userId: string) {
    const defaultCategories = [
      { name: 'Comida', type: 'expense' },
      { name: 'Golosinas', type: 'expense' },
      { name: 'Servicios', type: 'expense' },
      { name: 'Salud', type: 'expense' },
      { name: 'Deudas', type: 'expense' },
      { name: 'Entretenimiento', type: 'expense' },
      { name: 'Familia', type: 'expense' },
      { name: 'Emergencias', type: 'expense' },
      { name: 'Salario', type: 'income' },
      { name: 'Otros Ingresos', type: 'income' },
    ];

    const categories = defaultCategories.map((cat) => ({
      ...cat,
      userId,
      isDefault: true,
    }));

    return this.categoryModel.insertMany(categories);
  }

  /**
   * Actualizar categoría
   */
  async updateCategory(userId: string, categoryId: string, data: any) {
    return this.categoryModel.findOneAndUpdate(
      { _id: categoryId, userId },
      data,
      { new: true },
    );
  }

  /**
   * Desactivar categoría (soft delete)
   */
  async deleteCategory(userId: string, categoryId: string) {
    return this.categoryModel.findOneAndUpdate(
      { _id: categoryId, userId },
      { isActive: false },
      { new: true },
    );
  }
}
