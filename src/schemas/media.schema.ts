import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true, collection: 'media' })
export class Media {
	@Prop({ required: true })
	userId: string;

	@Prop({ required: true, unique: true })
	url: string;

	@Prop({ type: Object, default: {} })
	metadata: Record<string, any>;

	@Prop({ required: true })
	filename: string;

	@Prop({ required: true })
	size: number;

	@Prop({ type: Date, default: null })
	loading: Date | null;
}

export const MediaSchema = SchemaFactory.createForClass(Media);





















