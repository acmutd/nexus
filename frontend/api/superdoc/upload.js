import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  const { docName, courseId, contentType } = await req.json();

  const key = `documents/${courseId || 'misc'}/${randomUUID()}-${docName || 'document.pdf'}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/pdf',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  return Response.json({ uploadUrl, key });
}