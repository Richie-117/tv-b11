const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');

const envConfig = fs.readFileSync('.env.local', 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const endpoint = env.R2_ENDPOINT || ('https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com');
const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

async function run() {
  try {
    console.log('Testing R2 bucket:', env.R2_BUCKET_NAME);
    const testKey = 'test/r2-connectivity-check.json';
    const testContent = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    
    // Put
    const putRes = await s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'application/json'
    }));
    console.log('✅ PutObject succeeded! ETag:', putRes.ETag);

    // Head
    const headRes = await s3.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: testKey
    }));
    console.log('✅ HeadObject succeeded! ContentLength:', headRes.ContentLength, 'ETag:', headRes.ETag);

    // Get
    const getRes = await s3.send(new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: testKey
    }));
    const chunks = [];
    for await (const chunk of getRes.Body) {
      chunks.push(chunk);
    }
    const downloaded = Buffer.concat(chunks).toString('utf8');
    console.log('✅ GetObject succeeded! Downloaded:', downloaded);
  } catch (err) {
    console.error('❌ R2 error:', err.message);
  }
}
run();
