import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Thông tin bảo mật lấy từ Environment Variables (.env)
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
// Public URL của bucket trên Cloudflare (VD: https://pub-c1a2b3...r2.dev)
const publicUrl = process.env.R2_PUBLIC_URL;

// Khởi tạo R2 Client theo chuẩn AWS S3 V3
const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 luôn dùng 'auto'
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

/**
 * Upload Audio file (Buffer) lên Cloudflare R2
 * 
 * @param buffer Dữ liệu file Audio dạng Buffer
 * @param fileName Tên file duy nhất (VD: `conversations/conv-123/user-audio-456.webm`)
 * @param contentType Định dạng mime type (Mặc định: audio/webm)
 * @returns Đường dẫn Public URL của file Audio đó
 */
export async function uploadAudioToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'audio/webm'
): Promise<string> {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Cloudflare R2 Credentials missing in environment variables.');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await r2Client.send(command);
    
    // Nếu có setting Public URL thì trả về Full URL, ngược lại trả về filepath.
    if (publicUrl) {
      const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      return `${baseUrl}/${fileName}`;
    }

    return fileName;
  } catch (error) {
    console.error('Error uploading to Cloudflare R2:', error);
    throw new Error('Failed to upload audio to storage.');
  }
}
