import { Controller } from '@nestjs/common';
import { MovementsService } from './movements.service';

@Controller('movements')
export class MovementsController {
  constructor(private movementsService: MovementsService) {}
}
