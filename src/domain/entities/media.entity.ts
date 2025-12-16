export class Media {
	constructor(
		public readonly id: string,
		public userId: string,
		public url: string,
		public metadata: Record<string, any>,
		public filename: string,
		public size: number,
		public readonly createdAt: Date,
		public loading: Date | null,
	) { }

	public static create(props: {
		userId: string;
		url: string;
		metadata?: Record<string, any>;
		filename: string;
		size: number;
		loading?: Date | null;
	}): Media {
		const now = new Date();
		return new Media(
			crypto.randomUUID(),
			props.userId,
			props.url,
			props.metadata || {},
			props.filename,
			props.size,
			now,
			props.loading || null,
		);
	}

	public static restore(props: {
		id: string;
		userId: string;
		url: string;
		metadata: Record<string, any>;
		filename: string;
		size: number;
		createdAt: Date;
		loading: Date | null;
	}): Media {
		return new Media(
			props.id,
			props.userId,
			props.url,
			props.metadata,
			props.filename,
			props.size,
			props.createdAt,
			props.loading,
		);
	}

	public markAsLoaded(): void {
		this.loading = new Date();
	}
}





















