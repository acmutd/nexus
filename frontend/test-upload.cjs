const fs = require('fs');
const path = require('path');

// CONFIGURATION
const ENDPOINT_URL = 'http://127.0.0.1:3000/api/discord/superdoc/merge'; 
const TEST_FILE_PATH = './basic-text.pdf'; 
async function testEndpoint() {
    try {
        console.log(`Connecting to ${ENDPOINT_URL}...`);
        if (!fs.existsSync(TEST_FILE_PATH)) {
            console.error(`Error: File not found at ${TEST_FILE_PATH}`);
            return;
        }

        console.log('Reading file...');
        const fileBuffer = fs.readFileSync(TEST_FILE_PATH);
        const base64Data = fileBuffer.toString('base64');
        //console.log("base64Data:",base64Data);
        const payload = {
            pdfName: "TestFile.pdf",
            courseId: "ENG-101",
            pdfBase64: base64Data
        };

        console.log('Sending request to endpoint...');
        const response = await fetch(ENDPOINT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Success!');
            console.log('Discord URL:', result.discordUrl);
        } else {
            console.log('Failed!');
            console.log('Error Detail:', result);
        }
    } catch (error) {
        console.error('Connection Error:', error.message);
    }
}

testEndpoint();