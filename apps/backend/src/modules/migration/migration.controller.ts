import { Controller, Post, Body } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * ENDPOINT TEMPORAL DE MIGRACIÓN — eliminar después de usar
 */
@Controller('migrate')
export class MigrationController {
  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * POST /api/migrate/userid
   * Body: { fromUserId: "juan123", toUserId: "anner.escobar", collection: "funds" }
   * Si no se envía `collection`, migra TODAS las colecciones.
   */
  @Post('userid')
  async migrateUserId(
    @Body() body: { fromUserId: string; toUserId: string; collection?: string },
  ) {
    const { fromUserId, toUserId, collection } = body;

    if (!fromUserId || !toUserId) {
      return { error: 'fromUserId y toUserId son requeridos' };
    }

    const allCollections = [
      'accounts',
      'movements',
      'categories',
      'creditcards',
      'debts',
      'funds',
      'closures',
    ];

    const targets = collection ? [collection] : allCollections;
    const results: Record<string, number> = {};

    for (const col of targets) {
      const result = await this.connection.collection(col).updateMany(
        { userId: fromUserId },
        { $set: { userId: toUserId } },
      );
      results[col] = result.modifiedCount;
    }

    return { migrated: results };
  }
}
