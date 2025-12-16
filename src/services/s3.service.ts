import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { lookup } from 'dns';
import { promisify } from 'util';
import type { MinioConfig } from '../config';
import { S3Service as AbstractS3Service } from './s3.abstract';

const dnsLookup = promisify(lookup);

@Injectable()
export class MiniIOS3Service extends AbstractS3Service implements OnModuleInit {
	private readonly logger = new Logger(MiniIOS3Service.name);
	private minioClient!: Minio.Client;
	private minioClientForPresigned!: Minio.Client; // Separate instance for presigned URLs with external hostname
	private bucketName: string;
	private minioConfig!: MinioConfig;

	constructor(private configService: ConfigService) {
		super();
		this.minioConfig = this.configService.get<MinioConfig>('minio', { infer: true })!;
		this.bucketName = this.minioConfig?.bucketName || 'media';
	}

	async onModuleInit(): Promise<void> {
		// Initialize clients asynchronously after module initialization
		await this.initializeClients();
	}

	private async initializeClients(): Promise<void> {
		try {
			// Resolve internal hostname to IP to avoid "invalid hostname" error
			const internalEndpoint = this.minioConfig?.endpoint || 'localhost';
			let internalIP = internalEndpoint;
			if (internalEndpoint !== 'localhost' && internalEndpoint !== '127.0.0.1') {
				try {
					const resolved = await dnsLookup(internalEndpoint);
					internalIP = resolved.address;
					this.logger.log(`Resolved ${internalEndpoint} to ${internalIP}`);
				} catch (error) {
					this.logger.warn(`Failed to resolve ${internalEndpoint}, using as-is`);
				}
			}

			this.minioClient = new Minio.Client({
				endPoint: internalIP,
				port: this.minioConfig?.port || 9000,
				useSSL: this.minioConfig?.useSSL || false,
				accessKey: this.minioConfig?.accessKey || 'minioadmin',
				secretKey: this.minioConfig?.secretKey || 'minioadmin123',
			});

			// MinIO client for presigned URLs (uses external hostname for client access)
			const externalHostname = this.minioConfig?.externalHostname || 'localhost:9000';
			const [host, portStr] = externalHostname.split(':');
			const port = parseInt(portStr || '9000', 10);
			this.minioClientForPresigned = new Minio.Client({
				endPoint: host,
				port: port,
				useSSL: this.minioConfig?.useSSL || false,
				accessKey: this.minioConfig?.accessKey || 'minioadmin',
				secretKey: this.minioConfig?.secretKey || 'minioadmin123',
			});

			await this.ensureBucketExists();
		} catch (error: any) {
			this.logger.error(`Failed to initialize MinIO clients: ${error.message}`);
			throw error;
		}
	}

	async ensureBucketExists(): Promise<void> {
		try {
			const minioConfig = this.configService.get<MinioConfig>('minio', { infer: true });
			const region = minioConfig?.region || 'us-east-1';
			const exists = await this.minioClient.bucketExists(this.bucketName);
			if (exists) {
				this.logger.log(`Bucket ${this.bucketName} already exists`);
			} else {
				await this.minioClient.makeBucket(this.bucketName, region);
				this.logger.log(`Bucket ${this.bucketName} created in region ${region}`);
			}
		} catch (error: any) {
			this.logger.error(`Error checking/creating bucket: ${error.message}`);
		}
	}

	async getPresignedUrl(key: string, expiresIn: number = 3600, useInternalHostname = false): Promise<string> {
		// Use appropriate MinIO client based on whether we need internal or external hostname
		const client = useInternalHostname ? this.minioClient : this.minioClientForPresigned;
		return await client.presignedPutObject(this.bucketName, key, expiresIn);
	}

	async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
		return await this.minioClient.presignedGetObject(this.bucketName, key, expiresIn);
	}

	async getObject(key: string): Promise<{
		Body: NodeJS.ReadableStream | Buffer;
		ContentType?: string;
		ContentLength?: number;
	}> {
		const stream = await this.minioClient.getObject(this.bucketName, key);
		const stat = await this.minioClient.statObject(this.bucketName, key);

		return {
			Body: stream as NodeJS.ReadableStream,
			ContentType: stat.metaData?.['content-type'],
			ContentLength: stat.size,
		};
	}

	async deleteObject(key: string): Promise<void> {
		await this.minioClient.removeObject(this.bucketName, key);
	}

	async putObject(key: string, body: Buffer | NodeJS.ReadableStream, contentType?: string): Promise<void> {
		if (Buffer.isBuffer(body)) {
			const metadata: Minio.ItemBucketMetadata = {};
			if (contentType) {
				metadata['Content-Type'] = contentType;
			}
			await this.minioClient.putObject(this.bucketName, key, body, body.length, metadata);
		} else {
			// For streams, convert to Buffer or use a different approach
			const chunks: Buffer[] = [];
			for await (const chunk of body) {
				chunks.push(Buffer.from(chunk));
			}
			const buffer = Buffer.concat(chunks);
			const metadata: Minio.ItemBucketMetadata = {};
			if (contentType) {
				metadata['Content-Type'] = contentType;
			}
			await this.minioClient.putObject(this.bucketName, key, buffer, buffer.length, metadata);
		}
	}
}


