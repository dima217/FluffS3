/**
 * Abstract S3 Service Interface
 * Defines the contract for all S3-compatible storage implementations
 */
export abstract class S3Service {
	/**
	 * Get a presigned URL for uploading a file
	 * @param key - Object key (path) in the bucket
	 * @param expiresIn - Expiration time in seconds (default: 3600)
	 * @returns Presigned URL string
	 */
	abstract getPresignedUrl(key: string, expiresIn?: number, useInternalHostname?: boolean): Promise<string>;

	/**
	 * Get a presigned URL for downloading a file
	 * @param key - Object key (path) in the bucket
	 * @param expiresIn - Expiration time in seconds (default: 3600)
	 * @returns Presigned URL string for GET operation
	 */
	abstract getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;

	/**
	 * Get an object from S3 storage
	 * @param key - Object key (path) in the bucket
	 * @returns Object data with stream, content type, and length
	 */
	abstract getObject(key: string): Promise<{
		Body: NodeJS.ReadableStream | Buffer;
		ContentType?: string;
		ContentLength?: number;
	}>;

	/**
	 * Upload an object to S3 storage
	 * @param key - Object key (path) in the bucket
	 * @param body - File content as Buffer or Stream
	 * @param contentType - MIME type of the file
	 */
	abstract putObject(key: string, body: Buffer | NodeJS.ReadableStream, contentType?: string): Promise<void>;

	/**
	 * Delete an object from S3 storage
	 * @param key - Object key (path) in the bucket
	 */
	abstract deleteObject(key: string): Promise<void>;

	/**
	 * Ensure the bucket exists, create if it doesn't
	 */
	abstract ensureBucketExists(): Promise<void>;
}

