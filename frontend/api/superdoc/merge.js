const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
const {formidable} = require('formidable');
const fs = require('fs');
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function getLambdaUrl(endpoint) {
  const base = process.env.SUPERDOC_LAMBDA_URL || 'http://localhost:8000';
  return `${base}/${endpoint}`;
}

function buildS3Key(courseId, docName) {
  return `documents/${courseId || 'misc'}/${randomUUID()}-${docName || 'document.pdf'}`;
}

// Same logic as your /api/s3/presign route
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

// Simulates what the frontend would normally do: PUT bytes to the presigned url
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

async function callMergeLambda({ pdfUrl, courseId, docName }) {
  try {
    const response = await fetch(getLambdaUrl('merge_pdf'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfUrl: pdfUrl,
        courseId,
        documentName: docName,
      }),
    });
    return await response.json();
  } catch (e) {
    console.warn("Merge endpoint call failed, but upload succeeded.");
    return { status: "skipped" };
  }
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
    const file = files.pdf?.[0] || files.pdf; // adjust field name to match your form key

    if (!file) {
      return res.status(400).json({ error: "Missing pdf file field" });
    }

    const pdfBuffer = fs.readFileSync(file.filepath);
    const key = buildS3Key(courseId, docName);

    const uploadUrl = await generatePresignedPutUrl(key);
    await uploadBufferToPresignedUrl(uploadUrl, pdfBuffer);
    const pdfUrl = await generatePresignedGetUrl(key);

    const mergeResult = await callMergeLambda({ pdfUrl, courseId, docName });

    return res.status(200).json({ success: true, s3Key: key, pdfUrl, mergeResult });
  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({ error: "Internal Error", detail: error.message });
  }
}

