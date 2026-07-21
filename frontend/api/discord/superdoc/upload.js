import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(req) {
  const { docName, courseId, contentType } = await req.json();

  const key = `documents/${courseId || 'misc'}/${randomUUID()}-${docName || 'document.pdf'}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/pdf',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min to actually upload

  return Response.json({ uploadUrl, key });
}