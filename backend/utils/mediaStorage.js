import fs from 'node:fs';
import mongoose from 'mongoose';

const BUCKET_NAME = 'mediaUploads';

const getBucket = () => {
  if (!mongoose.connection?.db) {
    throw new Error('MongoDB connection is not ready for media storage.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });
};

export const getUploadUrl = (file, folder) => {
  if (!file?.filename || !folder) return '';
  return `/uploads/${folder}/${file.filename}`;
};

export const persistUploadedFile = async (file, folder) => {
  if (!file?.path || !file?.filename || !folder) return '';

  const bucket = getBucket();
  const uploadUrl = getUploadUrl(file, folder);

  const existingFiles = await bucket.find({ filename: file.filename, 'metadata.folder': folder }).toArray();
  await Promise.all(existingFiles.map((existingFile) => bucket.delete(existingFile._id).catch(() => undefined)));

  const uploadStream = bucket.openUploadStream(file.filename, {
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      folder,
      path: uploadUrl,
      originalName: file.originalname || file.filename,
      size: file.size || 0,
    },
  });

  await new Promise((resolve, reject) => {
    fs.createReadStream(file.path)
      .on('error', reject)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', resolve);
  });

  return uploadUrl;
};

export const persistRequestUpload = (folder) => async (req, res, next) => {
  try {
    if (req.file) {
      req.file.storageUrl = await persistUploadedFile(req.file, folder);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const streamStoredMedia = async (req, res, next) => {
  try {
    const folder = String(req.params.folder || '').trim();
    const filename = String(req.params.filename || '').trim();

    if (!folder || !filename) return next();

    const bucket = getBucket();
    const files = await bucket
      .find({ filename, 'metadata.folder': folder })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    const file = files[0];
    if (!file) return next();

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', file.length);

    if (req.method === 'HEAD') {
      return res.end();
    }

    return bucket.openDownloadStream(file._id).on('error', next).pipe(res);
  } catch (error) {
    return next(error);
  }
};
