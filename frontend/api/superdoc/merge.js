const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const { formidable } = require('formidable');
const fs = require('fs');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sqs = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}));

const SQS_QUEUE_URL = process.env.SUPERDOC_SQS_QUEUE_URL;
const JOBS_TABLE = process.env.SUPERDOC_JOBS_TABLE || 'superdoc-jobs';
const JOB_TTL_SECONDS = parseInt(process.env.JOB_TTL_SECONDS || '604800', 10); // 7 days default

function buildS3Key(courseId, docName) {
  return `documents/${courseId || 'misc'}/${randomUUID()}-${docName || 'document.pdf'}`;
}

async function generatePresignedPutUrl(key, contentType = 'application/pdf') {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 });
}

async function generatePresignedGetUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

async function uploadBufferToPresignedUrl(uploadUrl, buffer, contentType = 'application/pdf') {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
  }
}

// Mirrors the Lambda's create_job() — writes the initial "queued" record
// before the message is enqueued, so the frontend can poll immediately.
async function createJob({ jobId, documentId, courseId, action }) {
  const now = Math.floor(Date.now() / 1000);
  const item = {
    jobId,
    status: 'queued',
    action,
    courseId,
    documentId,
    progress: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    ttl: now + JOB_TTL_SECONDS,
  };
  await ddb.send(new PutCommand({ TableName: JOBS_TABLE, Item: item }));
  return item;
}

// Pushes the job onto the FIFO queue. MessageGroupId = documentId so that
// merges/edits against the same document are processed strictly in order,
// while different documents can process in parallel.
async function enqueueMergeJob({ jobId, documentId, pdfUrl, courseId }) {
  const body = {
    action: 'merge_pdf',
    payload: { jobId, pdfUrl, courseId },
  };

  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify(body),
    MessageGroupId: documentId,
    // ContentBasedDeduplication is enabled on the queue, so no
    // MessageDeduplicationId needed here.
  });

  return sqs.send(command);
}

export const config = {
  api: {
    bodyParser: false, // required for multipart
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10mb
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { fields, files } = await parseForm(req);
    const docName = fields.docName?.[0] || fields.docName;
    const courseId = fields.courseId?.[0] || fields.courseId;
    const documentId = fields.documentId?.[0] || fields.documentId;
    const file = files.pdf?.[0] || files.pdf;

    if (!file) {
      return res.status(400).json({ error: 'Missing pdf file field' });
    }
    if (!documentId) {
      return res.status(400).json({ error: 'Missing documentId field' });
    }

    const pdfBuffer = fs.readFileSync(file.filepath);
    const key = buildS3Key(courseId, docName);

    const uploadUrl = await generatePresignedPutUrl(key);
    await uploadBufferToPresignedUrl(uploadUrl, pdfBuffer);
    const pdfUrl = await generatePresignedGetUrl(key);

    const jobId = randomUUID();

    await createJob({ jobId, documentId, courseId, action: 'merge_pdf' });
    await enqueueMergeJob({ jobId, documentId, pdfUrl, courseId });

    return res.status(200).json({ success: true, jobId, s3Key: key, pdfUrl });
  } catch (error) {
    console.error('Handler Error:', error.message);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}