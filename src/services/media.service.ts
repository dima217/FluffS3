import { Injectable, Logger, NotFoundException, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import type { Cache } from "cache-manager";
import type { Model } from "mongoose";
import { Media, MediaDocument } from "../schemas/media.schema";
import { S3Service } from "./s3.abstract";
import type { S3RedirectConfig, MinioConfig } from "../config";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    private s3Service: S3Service,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService
  ) {}

  async createMedia(
    userId: string,
    filename: string,
    size: number,
    metadata?: Record<string, any>
  ): Promise<{ mediaId: string; url: string; uploadUrl: string }> {
    const fileExtension = filename.split(".").pop() || "";
    const generatedFilename = `${uuidv4()}.${fileExtension}`;
    const url = `/${userId}/${generatedFilename}`;

    const media = new this.mediaModel({
      userId,
      url,
      metadata: metadata || {},
      filename,
      size,
      loading: null,
    });

    const saved = await media.save();

    // Cache the newly created media
    const cacheKey = `media:url:${url}`;
    await this.cacheManager.set(cacheKey, saved, 900);

    // Generate presigned URL for direct upload to S3
    const uploadUrl = await this.getUploadRedirectUrl(
      saved._id.toString(),
      false
    );

    return {
      mediaId: saved._id.toString(),
      url,
      uploadUrl,
    };
  }

  async markAsLoaded(mediaId: string): Promise<void> {
    const media = await this.mediaModel
      .findByIdAndUpdate(mediaId, { loading: new Date() }, { new: true })
      .exec();

    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    // Update cache with the updated media
    const cacheKey = `media:url:${media.url}`;
    await this.cacheManager.set(cacheKey, media, 900);
  }

  async getMediaById(mediaId: string): Promise<MediaDocument> {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }
    return media;
  }

  async uploadFileToS3(
    key: string,
    body: Buffer,
    contentType?: string
  ): Promise<void> {
    await this.s3Service.putObject(key, body, contentType);
  }

  async getMediaByUrl(url: string): Promise<MediaDocument> {
    const cacheKey = `media:url:${url}`;

    // Try to get from cache first
    const cachedMedia = await this.cacheManager.get<MediaDocument>(cacheKey);
    if (cachedMedia) {
      this.logger.debug(`Cache hit for media URL: ${url}`);
      return cachedMedia;
    }

    // If not in cache, get from database
    this.logger.debug(
      `Cache miss for media URL: ${url}, fetching from database`
    );
    const media = await this.mediaModel.findOne({ url }).exec();
    if (!media) {
      throw new NotFoundException(`Media with URL ${url} not found`);
    }

    // Store in cache for 15 minutes (900 seconds)
    await this.cacheManager.set(cacheKey, media, 900);
    this.logger.debug(`Cached media for URL: ${url}`);

    return media;
  }

  async downloadFile(url: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    const media = await this.getMediaByUrl(url);
    const object = await this.s3Service.getObject(media.url);

    return {
      stream: object.Body as NodeJS.ReadableStream,
      contentType: object.ContentType,
      contentLength: object.ContentLength,
    };
  }

  async getUploadRedirectUrl(
    mediaId: string,
    useInternalHostname = false
  ): Promise<string> {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    // Get presigned URL with appropriate hostname
    const presignedUrl = await this.s3Service.getPresignedUrl(
      media.url,
      3600,
      useInternalHostname
    );

    // Fix double slashes in URL path if any
    return presignedUrl.replace(/([^:]\/)\/+/g, "$1");
  }
}
