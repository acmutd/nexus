import axios from 'axios'

// Drive allows unauthenticated reads of their metadata with just a restricted API key since docs are shared for anyone w link
// Fetches names for a batch of doc ids in parallel 
export async function fetchDocNames(docIds) {
  console.time('fetchDocNames') // TEMP: remove after timing test
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
  const results = await Promise.all(docIds.map(async (docId) => {
    try {
      const { data } = await axios.get(`https://www.googleapis.com/drive/v3/files/${docId}`, {
        params: { fields: 'name', key: apiKey },
      })
      return [docId, data.name || docId]
    } catch (error) {
      console.error(`failed to fetch name for ${docId}:`, error)
      return [docId, docId]
    }
  }))
  return new Map(results)
}