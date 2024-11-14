const mongoose = require("mongoose");
const { emit } = require("nodemon");
const {Schema} = mongoose;

const userSchema = new Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse: true 
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type: Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0,
    },
    wishList:[{
        type:Schema.Types.ObjectId,
        ref:"Whishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String
    },
    redeemed:{
        type:Boolean
    },
    redeemedcoupon:[{
        type:String
    }],
    searchHistory:[{
        category:{
            type: Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]

})

const User = mongoose.model("User",userSchema);

module.exports = User;