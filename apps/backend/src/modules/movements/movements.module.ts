import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';

@Module({
  imports: [MongooseModule.forFeature([])],
  providers: [MovementsService],
  controllers: [MovementsController],
  exports: [MovementsService],
})
export class MovementsModule {}
