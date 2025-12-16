import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMediaDto {
	@ApiProperty({ description: 'Original filename' })
	@IsString()
	filename: string;

	@ApiProperty({ description: 'File size in bytes' })
	@IsNumber()
	size: number;

	@ApiPropertyOptional({ description: 'Additional metadata' })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>;
}

export class CreateMediaResponseDto {
	@ApiProperty({ description: 'Media ID' })
	mediaId: string;

	@ApiProperty({ description: 'Presigned URL' })
	url: string;
}

