/**
 * Script to download face-api.js models to public/models
 * Run: node scripts/download-models.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../frontend/public/models');
const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
];

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

console.log('📥 Downloading AI models to:', modelsDir);

models.forEach(model => {
  const file = fs.createWriteStream(path.join(modelsDir, model));
  https.get(baseUrl + model, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✅ Downloaded: ${model}`);
    });
  }).on('error', err => {
    fs.unlink(path.join(modelsDir, model), () => {});
    console.error(`❌ Failed: ${model}`, err.message);
  });
});
