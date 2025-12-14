import mongoose, {Schema} from "mongoose";

const subsciptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // One who is subscribing, i.e subscriber
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing.
        ref: "User"
    }
}, {timestamps: true})



export const Subsciption = mongoose.model("Subsciption", subsciptionSchema)