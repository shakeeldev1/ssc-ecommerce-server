import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Configuration } from '@/config/configuration';

export const buildTypeOrmOptions = (
  configService: ConfigService<Configuration, true>,
): TypeOrmModuleOptions => {
  const database = configService.get('database', { infer: true });

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.name,
    synchronize: database.synchronize,
    logging: database.logging,
    ssl: database.ssl ? { rejectUnauthorized: true } : false,
    entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations_history',
  };
};
