import mongoose, { Schema } from "mongoose";

const ETOCardSchema = new Schema({
  driverId: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
  },
  id_details: {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    village: {
      type: String,
    },
    police_station: {
      type: String,
    },
    landmark: {
      type: String,
    },
    post_office: {
      type: String,
    },
    district: {
      type: String,
    },
    pin_code: {
      type: String,
    },
    adhar_number: {
      type: String,
    },
    driver_photo: {
      type: String,
    },
    car_photo: [
      {
        type: String,
        // required: true,
      },
    ],
  },
  eto_id_num: {
    type: String,
    default: "Sk Aktar ke phone korun bole debe",
  },
  helpLine_num: {
    type: String,
    default: "100",
  },
});

export const ETOCard = mongoose.model("ETOCard", ETOCardSchema);
