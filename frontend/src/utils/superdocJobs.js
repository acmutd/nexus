import axios from 'axios'

// Creates a new, correctly-named Google Doc for a course. merge_pdf only ever
// merges into an existing documentId — it never creates or names one — so a
// brand-new upload has to go through this first to get a real documentId.
export async function createDocument(courseId, documentName) {
  console.log(`[superdoc] creating document "${documentName}" for course ${courseId}`)
  const { data } = await axios.post('/api/superdoc/create-doc', { courseId, documentName })
  console.log(`[superdoc] created document, documentId=${data.document}`)
  return data.document
}

export async function uploadPdfAndCreateJob(file, { docName, courseId, documentId }, onProgress) {
  console.log(`[superdoc] requesting upload URL for "${file.name}" (${file.size} bytes)`)
  const { data: { uploadUrl, key, documentId: resolvedDocId } } = await axios.post('/api/superdoc/get-upload-url', {
    docName, courseId, documentId, contentType: file.type || 'application/pdf',
  })
  console.log(`[superdoc] got upload URL, key=${key}, documentId=${resolvedDocId}`)

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(`[superdoc] "${file.name}" uploaded to S3`)
        resolve()
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('S3 upload network error'))
    xhr.send(file)
  })

  const { data } = await axios.post('/api/superdoc/create-job', { key, documentId: resolvedDocId, courseId })
  console.log(`[superdoc] merge job created, jobId=${data.jobId}`)
  return data // { success, jobId, documentId, s3Key, pdfUrl }
}

export function pollJob(jobId, { intervalMs = 2000 } = {}) {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      const { data: job } = await axios.get(`/api/superdoc/get-jobid?jobId=${jobId}`)
      console.log(`[superdoc] job ${jobId} status: ${job.status}`)
      if (job.status === 'completed') return resolve(job)
      if (job.status === 'failed') return reject(new Error(job.error || 'Merge job failed'))
      setTimeout(tick, intervalMs)
    }
    tick()
  })
}
