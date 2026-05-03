import { Module } from '@nestjs/common';
import { ClosuresService } from './closures.service';
import { ClosuresController } from './closures.controller';

@Module({
  providers: [ClosuresService],
  controllers: [ClosuresController],
  exports: [ClosuresService],
})
export class ClosuresModule {}
