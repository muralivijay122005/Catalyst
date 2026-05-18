//src\BACKEND\models\Channel.cjs

const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    isDM: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", ChannelSchema);
