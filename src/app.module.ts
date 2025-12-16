import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { appConfig, mongoConfig, minioConfig, redisConfig, s3RedirectConfig, envValidationSchema } from './config';
import type { AppConfig, RedisConfig } from './config';
import { Media, MediaSchema } from './schemas/media.schema';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MiniIOS3Service } from './services/s3.service';
import { S3Service } from './services/s3.abstract';
import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env', '.env.local'],
			load: [appConfig, mongoConfig, minioConfig, redisConfig, s3RedirectConfig],
			validationSchema: envValidationSchema,
			validationOptions: {
				abortEarly: false,
			},
		}),
		CacheModule.registerAsync({
			isGlobal: true,
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => {
				const redisConfig = configService.get<RedisConfig>('redis', { infer: true });
				return {
					store: await redisStore({
						socket: {
							host: redisConfig?.host || 'localhost',
							port: redisConfig?.port || 6379,
						},
					}),
					ttl: 900, // 15 minutes default TTL
				};
			},
			inject: [ConfigService],
		}),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => {
				const mongoConfig = configService.get('mongo', { infer: true });
				return {
					uri: mongoConfig?.uri,
				};
			},
			inject: [ConfigService],
		}),
		MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
		PassportModule,
	],
	controllers: [MediaController],
	providers: [
		{
			provide: S3Service,
			useClass: MiniIOS3Service,
		},
		MediaService,
		JwtStrategy,
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule { }

