const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const getBotUrl = (endpoint) => {
  const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
  return `${base}/api/superdoc/${endpoint}`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { s3Key, docName, courseId } = req.body;

    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key field" });
    }

    // Generate a presigned GET url so the merge bot can fetch the file
    const pdfUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: s3Key }),
      { expiresIn: 3600 } // 1 hour, adjust as needed
    );

    // calling merge now that we have an accessible pdf_url
    let mergeResult = { status: "skipped" };
    try {
      const mergeResponse = await fetch(getBotUrl('merge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfAttachment: pdfUrl,
          courseId: courseId,
          documentName: docName
        }),
      });
      mergeResult = await mergeResponse.json();
    } catch (e) {
      console.warn("Merge endpoint call failed, but upload succeeded.");
    }

    return res.status(200).json({
      success: true,
      s3Key,
      pdfUrl,
      mergeResult
    });

  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({ error: "Internal Error", detail: error.message });
  }
}