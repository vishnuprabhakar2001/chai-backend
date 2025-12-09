import multer from "multer";

const storage = multer.diskStorage({         // multer.diskStorage() is a function provided by multer (a Node.js file-upload middleware).
    destination: function (req, file, cb) {  // This defines the folder (path) where files will be saved. destination receives 3 parameters:
        cb(null, "./public/temp")            // req → request object, file → contains information about uploaded file (e.g name, type, size), cb → callback function to tell multer where to save the file
    },                                       // cb takes (error, location) format. null means no error. null is used to indicate no error.

    filename: function(req, file, cb) {      // This decides what name the file will be saved as on your system.
                                            // file.originalname → the original file name uploaded by the user.
        cb(null, file.originalname)         // null → means no error ,  file.originalname → means we are sending filename as the successful result
    }                                        // null means No error happened, “Everything is fine, continue and use this filename.”
})                                         

export const upload = multer({storage});