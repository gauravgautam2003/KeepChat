import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs';

const uploadOnCloudinary = async (filePath) => {
    const hasCloudinaryConfig =
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET;

    if (!filePath) {
        return "";
    }

    if (!hasCloudinaryConfig) {
        return filePath;
    }

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    try {
         const isBase64File = filePath.startsWith("data:");
         const isLocalFile = !isBase64File && fs.existsSync(filePath);
         const uploadResult = await cloudinary.uploader.upload(filePath, {
             resource_type: "image",
             timeout: 60000,
         });
         if (isLocalFile) {
             fs.unlinkSync(filePath)
         }
         return uploadResult.secure_url
    } catch (error) {
         try {
             if (filePath && !filePath.startsWith("data:") && fs.existsSync(filePath)) {
                 fs.unlinkSync(filePath)
             }
         } catch (e) {
             // ignore unlink errors
         }
         console.error("Cloudinary Error:", error);
         return filePath.startsWith("data:") ? filePath : null;
    }
}
export default uploadOnCloudinary
