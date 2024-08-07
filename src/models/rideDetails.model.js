import { Schema } from "mongoose";

const rideDetailsSchema = new Schema({
    driver:{
        type:Schema.Types.ObjectId,
        ref:'Driver',
    },
  curent_location:{
    type:Schema.Types.current_location,
    ref:'Driver',
  },
  isCancelled:{
    type:Boolean,
    default:false
  },
  pickup_location:{
    type:String
  },
  drop_location:{
    type:String,
  },
  total_km:{
    type:Number,
  },
  pickup_otp:{
    type:Number,
  },
  drop_otp:{
    type:Number,
  },
  total_amount:{
    type:Number,
    default:0,
  },
  payment_mode:{
    type:String,
  },
  isPayment_done:{
    type:Boolean,
    default:false
  },
  isRide_stared:{
    type:Boolean,
    default:false
  },
  started_time:{
    type:String,
  },
  riderld:{
    // from rider schema
  },
  isRide_ended:{
    type:Boolean,
    default:false
  },
  drop_time:{
    type:String,
  },
  total_duration:{
    type:String
  }
})

export const RideDetails = mongoose.model("RideDetails", rideDetailsSchema);