import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getEnv } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS — en producción usa la variable CORS_ORIGIN (puede ser lista separada por comas)
  const corsOrigin = getEnv('CORS_ORIGIN', 'http://localhost:4200');
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Railway asigna PORT dinámicamente; en local usamos 9999
  const port = process.env.PORT || 9999;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on port ${port} | env: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
