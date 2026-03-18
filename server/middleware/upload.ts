import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  console.log("[upload] File filter check:", file.mimetype);
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WebP images are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

export const uploadImage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("[upload] Middleware hit");
  const singleUpload = upload.single("image");
  singleUpload(req, res, (err) => {
    if (err) {
      console.error("[upload] Multer error:", err.message);
      return res.status(400).json({
        success: false,
        error: `Upload error: ${err.message}`,
      });
    }
    console.log("[upload] Multer complete, file:", !!(req as any).file);
    next();
  });
};
