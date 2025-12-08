import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
       username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true   
       },
       email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true  
       },
       fullName: {
        type: String,
        required: true,
        trim: true,
        index: true   
       },
       avatar: {
        type: String,   //  Cloudinary url
        required: true
       },
       coverImage: {
        type: String,  //  Cloudinary url
       },
       watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
       ],
       password: {
        type: String,
        required: [true, 'password is required']
       },
       refreshToken: {
        type: String
       }
    }, 
    {
        timestamps: true
    }    
);

userSchema.pre("save", async function (next) {    // next is the function passed by Mongoose to our middleware as a parameter,
 if(!this.isModified("password"))   return next();  // and calling next() tells Mongoose to continue to the next middleware or the saving process.

    this.password = bcrypt.hash(this.password, 10)  // The 10 is the salt rounds. Salt rounds tell bcrypt how many times to process (hash) the password.
    next()    
});


userSchema.methods.isPasswordCorrect = async function   
(password){                                             // This is the password entered by the user during login. Here password is the input parameter.
    return await bcrypt.compare(password, this.password)  // this.password is Password stored in database (hashed).
}                                                // bcrypt.compare() takes user typed plain text password, hashes it internally, compares it with stored hash (this.password), returns true if both matches otherwise false.
    



userSchema.methods.generateAccessToken = function(){    // We are adding a new function to the User schema. It is mainly used for Authorization
    return jwt.sign(                                  // This means every user object will be able to call user.generateAccessToken().
        {                                   // jwt.sign() is used to create a JWT token, You return it so the function gives the token back.
            _id: this._id,                 // You return it so the function gives the token back.
            email: this.email,             // 'this' refers to the current logged-in user document.
            username: this.username,        // This payload can be decoded later to identify the user.
            fullName: this.fullName       // ⚠️ Password is NOT included — for security reasons.  
        },
        process.env.ACCESS_TOKEN_SECRET,     // This is a secret string/key stored in .env
        {                                    // Used to sign the token so nobody can generate tokens without it.
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY  // This sets how long the Access Token is valid
        }
)
}

userSchema.methods.generateRefreshToken = function(){   //Add a new method to generate refresh tokens. The refresh token itself is used later to create a new access token
    return jwt.sign(        // Creates token
        {                                 // contains only _id
            _id: this._id
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
)
}
 
/*
user logs in → backend generates JWT using jwt.sign()
           → sends to browser
browser stores token (cookie/localstorage)
next request → sends token back
backend verifies → allows access
*/
// When the browser sends a token: it has HEADER . PAYLOAD . SIGNATURE.
// The server takes the HEADER and PAYLOAD from the user and Then the server uses its secret key to regenerate a new signature.
// If generated signature matches with the signature come from the access token, it is valid.
// Refresh Token is used to get a new Access Token without logging in again.
export const User = mongoose.model("User", userSchema);

