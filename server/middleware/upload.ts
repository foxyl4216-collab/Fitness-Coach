import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/webp") {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WebP images are allowed"));
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("image");
