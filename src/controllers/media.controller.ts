import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import type { Response, Request } from "express";
import { MediaService } from "../services/media.service";
import { CreateMediaDto, CreateMediaResponseDto } from "../dto/media.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/user.decorator";
import { Public } from "../decorators/public.decorator";

@ApiTags("media")
@Controller("media")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("create")
  @ApiOperation({
    summary: "Create media and get presigned URL for upload",
    description:
      "Creates a media record in the database and returns a presigned URL for direct upload to S3. Use the uploadUrl to upload the file directly to MinIO/S3 storage.",
  })
  @ApiResponse({
    status: 201,
    description: "Media created successfully with presigned upload URL",
    type: CreateMediaResponseDto,
    schema: {
      example: {
        mediaId: "507f1f77bcf86cd799439011",
        url: "/user123/550e8400-e29b-41d4-a716-446655440000.jpg",
        uploadUrl:
          "https://minio.example.com/bucket/user123/550e8400-e29b-41d4-a716-446655440000.jpg?X-Amz-Algorithm=...",
      },
    },
  })
  async createMedia(
    @CurrentUser() user: { userId: string },
    @Body() createMediaDto: CreateMediaDto
  ): Promise<CreateMediaResponseDto> {
    return this.mediaService.createMedia(
      user.userId,
      createMediaDto.filename,
      createMediaDto.size,
      createMediaDto.metadata
    );
  }

  @Post(":mediaId/loading-end")
  @ApiOperation({ summary: "Mark media as loaded" })
  @ApiResponse({
    status: 200,
    description: "Media marked as loaded",
  })
  async markAsLoaded(
    @Param("mediaId") mediaId: string
  ): Promise<{ success: boolean }> {
    await this.mediaService.markAsLoaded(mediaId);
    return { success: true };
  }

  @Get("download")
  @Public()
  @ApiOperation({ summary: "Download file by URL" })
  @ApiResponse({
    status: 200,
    description: "File downloaded successfully",
  })
  async downloadFile(
    @Query("url") url: string,
    @Res() res: Response
  ): Promise<void> {
    const { stream, contentType, contentLength } =
      await this.mediaService.downloadFile(url);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    stream.pipe(res);
  }

  @Put("upload-redirect/:mediaId")
  @Public()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload file and proxy to S3",
    description:
      "Accepts file upload, processes it (streaming, no full memory load), and uploads to S3. This allows for future processing like compression, resizing, etc.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "File uploaded successfully",
  })
  async uploadFileRedirect(
    @Param("mediaId") mediaId: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response
  ): Promise<void> {
    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    try {
      // Get media to get the S3 key
      const media = await this.mediaService.getMediaById(mediaId);

      // Upload file directly to S3 using S3Service (no presigned URL needed for server-side upload)
      // TODO: Add compression/resizing logic here before uploading
      await this.mediaService.uploadFileToS3(
        media.url,
        file.buffer,
        file.mimetype
      );

      // Mark media as loaded
      await this.mediaService.markAsLoaded(mediaId);
      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}
