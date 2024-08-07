import { Schema } from "mongoose";

const driverSchema = new Schema(
{
     userId : {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    phone:{
        type:String,
        required: [true, 'Phone number Required'],
        trim:true,
        unique:true
    },
    login_time: {
        type:String,
    },
    logout_time: {
        type:String,
    },
    isActive: {
        type:Boolean,
        default:false
    },
    online_wallet:{
        type:Number,
        default:0,
    },
    cash_wallet:{
        type:Number,
        default:0,
    },
    due_wallet:{
        type:Number,
        default:0,
    },
    total_earning:{
        type:Number,
        default:0,
    },
    name:{
        type:String,
        required:[true, 'Name Required'],
        trim:true
    },
    email:{
        type:String,
        required:[true, 'Email Required'],
        trim:true
    },
    village:{
        type:String,
    },
    police_station:{
        type:String
    },
    landmark:{
        type:String
    },
    post_office:{
        type:String
    },
    district:{
        type:String,
    },
    pin_code:{
        type:String,
    },
    aadhar_number:{
        type:String,
        required:[true, 'Aadhar number numberRequired'],
        trim:true,
        validate: {
            validator: function(v) {
                return /^\d{4}-\d{4}-\d{4}$/.test(v);
            },
    }
},
  driver_photo:{
    type:String    //url
  },
  car_photo:{
    type:[String]
  },
  lisense_number:{
    type:String,
    required: [true , 'Lisense Number Required'],
    trim:true,
  },
 ride_ids:[{
    type:Schema.Types.ObjectId,
    ref:'RideDetails',
 }],
  aadhar_photo:{
    type:String,
  },
  current_location:{
    type:String,
  },
  total_complete_rides:{
     type:Number,
    default:0,
  },
  is_on_ride:{
    type:Boolean,
    default:false,
  },
  current_ride_id:{
    type:String
  }
  
}
)
export const Driver = mongoose.model("Driver", driverSchema);
