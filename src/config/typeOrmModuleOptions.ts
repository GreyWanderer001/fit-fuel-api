import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const typeOrmModuleOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get('POSTGRES_HOST'),
    port: configService.get('POSTGRES_PORT'),
    username: configService.get('POSTGRES_USERNAME'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DATABASE'),
    synchronize: true,
    entities: [__dirname + '/../models/entities/*.entity{.js,.ts}'],
    namingStrategy: new SnakeNamingStrategy(),
    ssl: { rejectUnauthorized: false },
    extra: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  };
};
