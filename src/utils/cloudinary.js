import {v2 as cloudinary} from "cloudinary";
// Imports Cloudinary's v2 SDK and renames it to cloudinary. This gives you access to Cloudinary functions like cloudinary.uploader.upload(...).
import fs from "fs";   // Imports Node’s built-in file system module. You use fs here to remove temporary local files (fs.unlinkSync).


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
       if (!localFilePath) return null
       // Upload the file on Cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto"
       })
       // file has been uploaded successfully
       console.log("file is uploaded on cloudinary ", response.url);
       return response;
  } catch (error) {
      fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed.
      return null
  }
}

export {uploadOnCloudinary}