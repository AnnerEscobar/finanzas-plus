import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  /**
   * Categorías por defecto del proyecto (CLAUDE.md)
   */
  private readonly DEFAULT_CATEGORIES = [
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

  /**
   * Obtener categorías del usuario (con auto-init si no tiene)
   */
  async getCategories(userId: string, type?: string) {
    // Auto-inicializar si el usuario no tiene categorías
    const count = await this.categoryModel.countDocuments({ userId });
    if (count === 0) {
      await this.initializeDefaultCategories(userId);
    }

    const query: any = { userId, isActive: true };
    if (type) {
      query.type = type;
    }

    return this.categoryModel.find(query).sort({ type: 1, name: 1 });
  }

  /**
   * Crear categoría personalizada
   */
  async createCategory(userId: string, data: any) {
    if (!data.name) {
      throw new BadRequestException('El nombre de la categoría es requerido');
    }

    // Validar que no exista una con el mismo nombre/tipo
    const existing = await this.categoryModel.findOne({
      userId,
      name: data.name,
      type: data.type || 'expense',
      isActive: true,
    });
    if (existing) {
      throw new BadRequestException('Ya existe una categoría con ese nombre');
    }

    const category = new this.categoryModel({
      userId,
      name: data.name,
      type: data.type || 'expense',
      isDefault: false,
      isActive: true,
    });

    return category.save();
  }

  /**
   * Inicializar categorías por defecto
   */
  async initializeDefaultCategories(userId: string) {
    const categories = this.DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      isDefault: true,
      isActive: true,
    }));

    return this.categoryModel.insertMany(categories);
  }

  /**
   * Forzar reinicialización (recrea las default si faltan)
   */
  async ensureDefaultCategories(userId: string) {
    const result = {
      created: 0,
      existing: 0,
    };

    for (const def of this.DEFAULT_CATEGORIES) {
      const exists = await this.categoryModel.findOne({
        userId,
        name: def.name,
        type: def.type,
      });
      if (!exists) {
        await this.categoryModel.create({
          ...def,
          userId,
          isDefault: true,
          isActive: true,
        });
        result.created++;
      } else {
        result.existing++;
        // Si está inactiva, reactivarla
        if (!exists.isActive) {
          exists.isActive = true;
          await exists.save();
        }
      }
    }

    return result;
  }

  /**
   * Buscar categoría por ID + usuario
   */
  async findByIdAndUser(id: string, userId: string) {
    const category = await this.categoryModel.findOne({ _id: id, userId });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  /**
   * Actualizar categoría
   */
  async updateCategory(userId: string, categoryId: string, data: any) {
    await this.findByIdAndUser(categoryId, userId);

    delete data.userId;
    delete data._id;
    delete data.isDefault;

    return this.categoryModel.findOneAndUpdate(
      { _id: categoryId, userId },
      data,
      { new: true },
    );
  }

  /**
   * Eliminar duplicados: por cada combinación (name + type), conserva el primero
   * (preferendo isDefault) y desactiva los demás
   */
  async deduplicateCategories(userId: string) {
    const all = await this.categoryModel
      .find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: 1 });

    const seen = new Map<string, string>(); // key => _id kept
    const toDeactivate: string[] = [];

    for (const cat of all) {
      const key = `${cat.type}__${cat.name.toLowerCase().trim()}`;
      if (seen.has(key)) {
        toDeactivate.push((cat._id as any).toString());
      } else {
        seen.set(key, (cat._id as any).toString());
      }
    }

    if (toDeactivate.length > 0) {
      await this.categoryModel.updateMany(
        { _id: { $in: toDeactivate }, userId },
        { isActive: false },
      );
    }

    return { removed: toDeactivate.length };
  }

  /**
   * Desactivar categoría (soft delete)
   * No permite eliminar categorías default
   */
  async deleteCategory(userId: string, categoryId: string) {
    const category = await this.findByIdAndUser(categoryId, userId);

    if (category.isDefault) {
      throw new BadRequestException('No se pueden eliminar categorías predeterminadas');
    }

    return this.categoryModel.findOneAndUpdate(
      { _id: categoryId, userId },
      { isActive: false },
      { new: true },
    );
  }
}
