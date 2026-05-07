import { Controller, Post, Body } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Endpoint temporal para migraciones de datos.
 * ELIMINAR después de usar.
 */
@Controller('migrate')
export class MigrationController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Post('userid')
  async migrateUserId(@Body() body: { fromId: string; toId: string }) {
    const { fromId, toId } = body;

    if (!fromId || !toId) {
      return { error: 'Se requieren fromId y toId' };
    }

    const collections = [
      'accounts',
      'debts',
      'creditcards',
      'movements',
      'funds',
      'closures',
      'categories',
    ];

    const results: Record<string, any> = {};

    for (const col of collections) {
      try {
        const result = await this.connection
          .collection(col)
          .updateMany({ userId: fromId }, { $set: { userId: toId } });
        results[col] = { modified: result.modifiedCount };
      } catch (e) {
        results[col] = { error: (e as Error).message };
      }
    }

    return { success: true, fromId, toId, results };
  }
}
