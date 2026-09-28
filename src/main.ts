import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from '@/bootstrap';
import { Configuration } from '@/config/configuration';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const configService = app.get(ConfigService<Configuration, true>);
  const { port, apiPrefix } = configService.get('app', { infer: true });

  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger docs available at: http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
