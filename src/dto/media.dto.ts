import { IsString, IsNumber, IsOptional, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMediaDto {
  @ApiProperty({
    description: "Original filename",
    example: "my-image.jpg",
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: "File size in bytes",
    example: 1024000,
  })
  @IsNumber()
  size: number;

  @ApiPropertyOptional({
    description: "Additional metadata (optional)",
    example: { width: 1920, height: 1080, format: "jpeg" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateMediaResponseDto {
  @ApiProperty({
    description: "Media ID",
    example: "507f1f77bcf86cd799439011",
  })
  mediaId: string;

  @ApiProperty({
    description: "S3 object path (internal URL)",
    example: "/user123/550e8400-e29b-41d4-a716-446655440000.jpg",
  })
  url: string;

  @ApiProperty({
    description:
      "Presigned URL for direct upload to S3. Use this URL with PUT request to upload file directly to MinIO/S3 storage.",
    example:
      "https://minio.example.com/media/user123/550e8400-e29b-41d4-a716-446655440000.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  })
  uploadUrl: string;
}
