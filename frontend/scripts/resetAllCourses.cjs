// Deletes all course from Firestore fields for every user
// Removes Discord course channel access for users with linked Discord
// Deletes all grade documents
// firestore can only do 500 writes per batch, so we batch in groups of 500

// to run: node + file path of resetAllCourses.cjs

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { admin, db } = require('../api/config/firebaseAdmin.js');
const axios = require('axios');

const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL;
const BOT_AUTH_TOKEN = process.env.BOT_AUTH_TOKEN;

async function resetAllUserCourses() {
  const snapshot = await db.collection('users').get();
  let count = 0;
  let batch = db.batch();

  console.log(`${snapshot.size} total user documents.`);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!Array.isArray(data.courses) || data.courses.length === 0) continue;

    // Clear course-related Firestore fields
    batch.update(docSnap.ref, {
      courses: admin.firestore.FieldValue.delete(),
      lastTranscriptUpload: admin.firestore.FieldValue.delete(),
      netId: admin.firestore.FieldValue.delete(),
      accountLinkingSkipped: admin.firestore.FieldValue.delete(),
    });
    count++;

    // Firestore batches max at 500 writes
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`${count} Firestore updates`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Reset courses for ${count} users.`);

  // Delete all courseGrades docs
  const gradesSnap = await db.collection('courseGrades').get();
  let gradesBatch = db.batch();
  let gCount = 0;
  for (const gDoc of gradesSnap.docs) {
    gradesBatch.delete(gDoc.ref);
    gCount++;
    if (gCount % 500 === 0) {
      await gradesBatch.commit();
      gradesBatch = db.batch();
    }
  }
  if (gCount % 500 !== 0) {
    await gradesBatch.commit();
  }
  //console.log(`Deleted ${gCount} courseGrades docs.`);
}

resetAllUserCourses().catch(console.error);