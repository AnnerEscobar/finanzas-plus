import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Movement, MovementSchema } from './schemas/movement.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Movement.name, schema: MovementSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    AccountsModule,
  ],
  providers: [MovementsService, CategoriesService],
  controllers: [MovementsController, CategoriesController],
  exports: [MovementsService, CategoriesService],
})
export class MovementsModule {}
