import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
  secure:      true,
});

/**
 * Upload a buffer (from multer memory storage) to Cloudinary.
 * Returns the secure HTTPS URL of the uploaded image.
 */
export async function uploadBuffer(
  buffer: Buffer,
  publicId: string,   // e.g. "car-images/byd-shark"
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        public_id:      publicId,
        folder:         'car-images',
        overwrite:      true,
        transformation: [
          { width: 1200, crop: 'limit' },   // cap at 1200px wide
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    ).end(buffer);
  });
}

export default cloudinary;
