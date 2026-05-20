import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'ads';
    if (req.originalUrl.includes('billboards')) folder = 'billboards';
    if (req.originalUrl.includes('submit-payment')) folder = 'payment-proofs';
    const uploadPath = path.join(__dirname, `../uploads/${folder}`);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  const extname = path.extname(file.originalname).toLowerCase();
  const isImage = allowedImageTypes.test(extname) && file.mimetype.startsWith('image/');
  const isVideo = allowedVideoTypes.test(extname) && file.mimetype.startsWith('video/');
  const isPaymentProofUpload = req.originalUrl.includes('submit-payment');
  if (isPaymentProofUpload) {
    if (isImage) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image screenshots (jpeg, jpg, png, gif, webp) are allowed for payment proof uploads.'));
    return;
  }
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png, gif, webp) or videos (mp4, mov, avi, mkv, webm) allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
  fileFilter
});

export default upload;
