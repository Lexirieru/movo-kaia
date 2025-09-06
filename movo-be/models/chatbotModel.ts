import mongoose, { Schema } from "mongoose";

// model untuk bentuk data informasi terkait company
const ChatbotDataSchema = new Schema(
  {
    companyId: {
      type: String,
      required: false,
      default : "unregistered", // default value for unregistered companies
    },
    companyName: {
        type: String,
        required: false,
        default : "unregistered", // default value for unregistered companies
    },
    question : {
        type  : String,
        required : true,
    },
    response : {
        type  : String,
        required : true,
    }
    
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export const ChatbotDataModel = mongoose.model(
  "ChatbotData",
  ChatbotDataSchema
);
