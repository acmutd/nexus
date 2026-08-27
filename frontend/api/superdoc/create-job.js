import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}});
const sqs = new SQSClient({ region: process.env.AWS_REGION, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}}));

const SQS_QUEUE_URL = process.env.SUPERDOC_SQS_QUEUE_URL;
const JOBS_TABLE = process.env.SUPERDOC_JOBS_TABLE || 'superdoc-jobs';
const JOB_TTL_SECONDS = parseInt(process.env.JOB_TTL_SECONDS || '604800', 10);

async function createJob({ jobId, documentId, courseId, action }) {
  const now = Math.floor(Date.now() / 1000);
  const item = {
    jobId, status: 'queued', action, courseId, documentId,
    progress: null, error: null, createdAt: now, updatedAt: now,
    ttl: now + JOB_TTL_SECONDS,
  };
  await ddb.send(new PutCommand({ TableName: JOBS_TABLE, Item: item }));
  return item;
}

async function enqueueMergeJob({ jobId, documentId, pdfUrl, courseId }) {
  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify({ action: 'merge_pdf', payload: { jobId, pdfUrl, courseId, documentId } }),
    MessageGroupId: documentId,
  });
  return sqs.send(command);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { key, documentId, courseId } = req.body;
    if (!key || !documentId) {
      return res.status(400).json({ error: 'Missing key or documentId' });
    }

    const pdfUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    }), { expiresIn: 3600 });

    const jobId = randomUUID();
    await createJob({ jobId, documentId, courseId, action: 'merge_pdf' });
    await enqueueMergeJob({ jobId, documentId, pdfUrl, courseId });

    return res.status(200).json({ success: true, jobId, documentId, s3Key: key, pdfUrl });
  } catch (error) {
    console.error('create-job error:', error.message);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}