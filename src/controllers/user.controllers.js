import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}



    } catch (error) {
        throw new ApiError(500, "Something went wrong while refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from user
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password} = req.body
    // console.log("fullName: ", fullName)
    // console.log("email: ", email)
    // console.log("username: ", username)
    // console.log("password: ", password)

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
       throw new ApiError(400, "all fields are required") 
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {  // This is older version which doesn't work. Below is newer version.
    //     coverImageLocalPath = req.files.coverImage[0].path;  
    // }

    let coverImageLocalPath = "";

if (
    req.files &&
    req.files.coverImage &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
) {
    coverImageLocalPath = req.files.coverImage[0].path;
}



    if (!avatarLocalPath) {   
        throw new ApiError(400, "Avatar file is required, not uploaded from user")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is not uploaded on Cloudinary")  
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")  // - (negative or minus) means I dont require passsword and refreshToken

    if (!createdUser) {
        throw new ApiError(500, "Something Went Wrong While regestering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler( async(req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie


    const {email, username, password} = req.body;
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400,"username or email is required" )
    }
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials, password incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
       httpOnly: true,
       secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate( 
    req.user._id,               // Here I got req.user available because in auth.middleware in verifyJWT we added req.user = user; at the end.
    {
        $set: {
            refreshToken: undefined
        }   
    },
    {
        new: true    // this will give the new value having refreshToken is undefined.
    }
)
const options = {
       httpOnly: true,
       secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
}

try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    const user = await User.findById(decodedToken?._id)
    
    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }
    
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")  
    }
    
    const options = {
        httpOnly: true,  // Prevents JavaScript (document.cookie) from accessing the cookie. Even if an attacker injects JavaScript into your site, they cannot read or steal the token.
        secure: true  // Cookie is sent only over HTTPS, never HTTP. Prevents tokens from being intercepted during network transmission (Man-in-the-Middle attacks).
    }
    
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed"
        )
    )
    
} catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token')
}

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "user fetched Successfully"
    ))

})

const updateAccountDetails = asyncHandler(async(req, res) => {
const {fullName, email} = req.body

if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
}

const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            fullName,
            email: email    // here we can also write just email instead of email: email
        }
    },
    {new: true}
).select("-password")

return res
.status(200)
.json(new ApiResponse(200, user, "Accout details updated successfully"))

})

const updateUserAvatar = asyncHandler( async(req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading Avatar on Cloudinary.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            },
        },
        {new: true}
    ).select("-password")
    
    return res 
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar Image Upadated Successfully."  )
    )

})

const updateUserCoverImage = asyncHandler( async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing.")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image on Cloudinary.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            },
        },
        {new: true}
    ).select("-password")

    return res 
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image Upadated Successfully."  )
    )

})

const getUserChannelProfile = asyncHandler( async(req, res) => {
const {username} = req.params

if (!username?.trim()) {     // This check catches all invalid username cases if username is null, undefined, empty string ("") or contains only spaces " ".
    throw new ApiError(400, "username is missing.")
}   

const channel = await User.aggregate([
    {
        $match: {
            username: username?.toLowerCase()
        }
    },
    {
           $lookup: {
                  from: "subscriptions",    // Here, the model names saved in lower case plural in data base.
                  localField: "_id",         // Here, it will select all that documents from subscription model where channel field match with my _id, 
                  foreignField: "channel",   // and that selected documents will be the all where channel will be mine but sibscribed by different user i.e. different _id
                  as: "subscribers"          // and sum of all that selected documetns will be the total no. of subscriber.
           } 
        },
        {
           $lookup: {
                  from: "subscriptions",    
                  localField: "_id",          // Here, it will select all the documents from the subscription model where subscriber field match with my _id, 
                  foreignField: "subscriber",  // and that selected documents will be all where I would have subscribed to all different chennel and if we 
                  as: "subscribedTo"           // sum all that selected documents, it will be the total no. of channels that I have subscribed.
           } 
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber" ]},  // Here, it goes into the new field subscribers i.e.into all the documents of subscribers and checks wether there is req.user?._id available or not. 
                        then: true,                                              // if   req.user?._id i.e. you are available in that documents, it means you have subscribed otherwise you have not subscribed. This is how you come to see wether you have subscribed or not when you open any youtube channel. 
                        else: false
                    }
                }
            }
        },
       {
        $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
       } 
])

if (!channel?.length) {    // Channel not found ->undefined / null->Error thrown;  if Channel exists but empty->[]->Error thrown
    throw new ApiError(404, "channel does not exists")
}

return res
.status(200)
.json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
)

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}