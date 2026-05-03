import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
});

@Module({})
export class ConfigModule {
  static forRoot() {
    return {
      module: ConfigModule,
    };
  }
}
