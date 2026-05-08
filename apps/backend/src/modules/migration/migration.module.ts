import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';

@Module({
  controllers: [MigrationController],
})
export class MigrationModule {}
