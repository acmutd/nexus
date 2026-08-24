// /api/merge.js
//
// Assumes the upload + job-record steps have already happened elsewhere
// (S3 upload done, jobId + pdfUrl already generated). This route's only
// job is to kick off the actual merge — enqueuing the SQS message that
// the merge worker picks up.
//
// POST /api/merge
//   body: { jobId, documentId, pdfUrl, courseId }
//   -> { success: true, jobId }

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SQS_QUEUE_URL = process.env.SUPERDOC_SQS_QUEUE_URL;

async function enqueueMergeJob({ jobId, documentId, pdfUrl, courseId }) {
  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify({
      action: 'merge_pdf',
      payload: { jobId, pdfUrl, courseId },
    }),
    MessageGroupId: documentId, // Preserves FIFO per-document sequencing
  });
  return sqs.send(command);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { jobId, documentId, pdfUrl, courseId } = req.body || {};

    if (!jobId || !documentId || !pdfUrl) {
      return res.status(400).json({ error: 'Missing jobId, documentId, or pdfUrl' });
    }

    await enqueueMergeJob({ jobId, documentId, pdfUrl, courseId });

    return res.status(200).json({ success: true, jobId });
  } catch (error) {
    console.error('merge.js error:', error.message);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}