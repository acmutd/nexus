// /api/get-job.js
//
// Read-only lookup of a single job row, for frontend polling while a
// merge is in progress.
//
// GET /api/get-job?jobId=abc123
//   -> { jobId, status, action, courseId, documentId, progress, error,
//        createdAt, updatedAt }
//
// Poll this on an interval from the frontend until `status` is a
// terminal value (e.g. 'completed' / 'failed') as set by your merge
// worker when it updates the row.

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}));

const JOBS_TABLE = process.env.SUPERDOC_JOBS_TABLE || 'superdoc-jobs';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  try {
    const jobId = req.query.jobId;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId query param' });
    }

    const result = await ddb.send(new GetCommand({
      TableName: JOBS_TABLE,
      Key: { jobId },
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(result.Item);
  } catch (error) {
    console.error('get-job error:', error.message);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}