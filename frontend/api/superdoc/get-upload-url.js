import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import axios from 'axios';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SUPERDOC_LAMBDA_URL = process.env.SUPERDOC_LAMBDA_URL || 'http://localhost:8000';

function buildS3Key(courseId, docName) {
  return `documents/${courseId || 'misc'}/${randomUUID()}-${docName || 'document.pdf'}`;
}

async function resolveDocumentId(courseId, docName, providedDocId) {
  if (providedDocId) return providedDocId;
  try {
    const url = `${SUPERDOC_LAMBDA_URL}/documents/${courseId}`;
    const response = await axios.get(url);
    const docMap = response.data?.documentIds || response.data || {};
    if (docName && docMap[docName]) return docMap[docName];
  } catch (err) {
    console.warn(`Could not resolve documentId for course ${courseId}:`, err.message);
  }
  return randomUUID();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { docName, courseId, documentId: providedDocId, contentType } = req.body;

    const documentId = await resolveDocumentId(courseId, docName, providedDocId);
    const key = buildS3Key(courseId, docName);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'application/pdf',
    });

    // Give this more headroom than 60s — large files on slow connections
    // need real time to finish the PUT.
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return res.status(200).json({ uploadUrl, key, documentId });
  } catch (error) {
    console.error('get-upload-url error:', error.message);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}