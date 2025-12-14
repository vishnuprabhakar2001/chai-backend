import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";



export const  verifyJWT = asyncHandler(async(req, _, next) => {    // if here res is empty then we can write _ instead of res
try {
    const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")     // Authorization: Bearer <token>, But I need only token, not Bearer <token>
    
    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }
    
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)  // jwt.verify() checks whether the token is valid, untampered, and not expired, and then extracts the user data stored inside it. process.env.ACCESS_TOKEN_SECRET :-This is the secret key used when the token was created.
    // Now, Yes, anyone can technically change a JWT token stringin the browser or Postman — but they cannot make a changed token valid. That is the key security guarantee.
    
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if (!user) {
        throw new ApiError(401, "Invalid Access Token")
    }
    
    req.user = user;    // This adds the user information with req.
    next()
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
}


})