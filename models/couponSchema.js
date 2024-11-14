const mongoose = require("mongoose");

const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    code:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    endOn:{
        type:Date,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    minimumAmount:{
        type:Number,
        required:true
    },
    maximumAmount:{
        type:Number,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
})

const Counpon = mongoose.model("Coupon",couponSchema);
module.exports = Counpon;