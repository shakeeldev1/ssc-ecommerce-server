import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST ?? 'localhost';
const isLocalDbHost = dbHost === 'localhost' || dbHost === '127.0.0.1';
const useSsl = process.env.DB_SSL ? process.env.DB_SSL === 'true' : !isLocalDbHost;

/**
 * Standalone DataSource used only by the TypeORM CLI to generate and run
 * migrations. The running application connects via TypeOrmModule instead
 * (see database/typeorm.config.ts).
 */
export default new DataSource({
  type: 'postgres',
  host: dbHost,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'ssc_db',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations_history',
});
