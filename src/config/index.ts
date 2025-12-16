import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
	port: number;
	nodeEnv: string;
}

export interface MongoConfig {
	uri: string;
}

export interface MinioConfig {
	endpoint: string;
	port: number;
	useSSL: boolean;
	accessKey: string;
	secretKey: string;
	bucketName: string;
	region: string; // S3 region (e.g., 'us-east-1')
	internalHostname: string; // Internal Docker hostname (for presigned URLs)
	externalHostname: string; // External hostname for redirect (accessible from client)
}

export interface S3RedirectConfig {
	internalHostname: string; // Internal Docker hostname (for presigned URLs)
	externalHostname: string; // External hostname for redirect (accessible from client)
}

export interface RedisConfig {
	host: string;
	port: number;
}

export const appConfig = registerAs<AppConfig>('app', () => ({
	port: parseInt(process.env.PORT || '3001', 10),
	nodeEnv: process.env.NODE_ENV || 'development',
}));

export const mongoConfig = registerAs<MongoConfig>('mongo', () => ({
	uri: process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/constructor_mini?authSource=admin',
}));

export const minioConfig = registerAs<MinioConfig>('minio', () => ({
	endpoint: process.env.S3_ENDPOINT || 'localhost',
	port: parseInt(process.env.S3_PORT || '9000', 10),
	useSSL: process.env.S3_USE_SSL === 'true',
	accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
	secretKey: process.env.S3_SECRET_KEY || 'minioadmin123',
	bucketName: process.env.S3_BUCKET_NAME || 'media',
	region: process.env.S3_REGION || 'us-east-1',
	internalHostname: process.env.S3_INTERNAL_HOSTNAME || 'constructor_mini_minio:9000',
	externalHostname: process.env.S3_EXTERNAL_HOSTNAME || 'localhost:9000',
}));

export const redisConfig = registerAs<RedisConfig>('redis', () => ({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379', 10),
}));

export const s3RedirectConfig = registerAs<S3RedirectConfig>('s3Redirect', () => ({
	internalHostname: process.env.S3_INTERNAL_HOSTNAME || 'constructor_mini_minio:9000',
	externalHostname: process.env.S3_EXTERNAL_HOSTNAME || 'localhost:9000',
}));

export const envValidationSchema = Joi.object({
	PORT: Joi.number().default(3001),
	NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
	MONGODB_URI: Joi.string().required(),
	S3_ENDPOINT: Joi.string().default('localhost'),
	S3_PORT: Joi.number().default(9000),
	S3_USE_SSL: Joi.string().valid('true', 'false').default('false'),
	S3_ACCESS_KEY: Joi.string().required(),
	S3_SECRET_KEY: Joi.string().required(),
	S3_BUCKET_NAME: Joi.string().default('media'),
	S3_REGION: Joi.string().default('us-east-1'),
	S3_INTERNAL_HOSTNAME: Joi.string().default('constructor_mini_minio:9000'),
	S3_EXTERNAL_HOSTNAME: Joi.string().default('localhost:9000'),
	JWT_SECRET: Joi.string().default('your-secret-key'),
	REDIS_HOST: Joi.string().default('localhost'),
	REDIS_PORT: Joi.number().default(6379),
});

