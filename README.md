# Constructor Mini

Media storage service with MiniIO S3 and MongoDB.

## Features

- ✅ NestJS framework
- ✅ MongoDB database with Mongoose
- ✅ MiniIO S3 for file storage
- ✅ JWT authentication
- ✅ Docker Compose for infrastructure
- ✅ Swagger API documentation

## Project setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create `.env` file in the root directory:

```env
PORT=3001
NODE_ENV=development

MONGODB_URI=mongodb://admin:admin123@localhost:27017/constructor_mini?authSource=admin

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=media

JWT_SECRET=your-secret-key
```

3. Start infrastructure with Docker Compose:

```bash
docker-compose up -d
```

4. Run the application:

```bash
# development mode (watch mode)
npm run start:dev

# production mode
npm run start:prod
```

## API Endpoints

### POST /media/create
Create media and get presigned URL for upload.

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`

**Body:**
```json
{
  "filename": "image.jpg",
  "size": 1024,
  "metadata": {}
}
```

**Response:**
```json
{
  "url": "https://minio...",
  "mediaId": "uuid"
}
```

### POST /media/:mediaId/loading-end
Mark media as loaded.

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`

**Response:**
```json
{
  "success": true
}
```

### GET /download?url={url}
Download file by URL.

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`

**Query:**
- `url`: URL stored in media (format: /{userId}/{filename})

## Swagger Documentation

After starting the application, Swagger documentation is available at:
- http://localhost:3001/api

