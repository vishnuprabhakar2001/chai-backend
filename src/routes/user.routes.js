import {Router} from "express";
import { registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middleware.js";


const router = Router();

router.route("/register").post(                
    upload.fields([                // it's a middleware which I want to be run before registerUser
        {
            name: "avatar",
            maxCount: 1   
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);


export default router;