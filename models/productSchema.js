const mongoose = require("mongoose");
const {Schema} = mongoose;

const productSchema = new Schema({
    productName:{
        type:String,
        required:true,
    },
    description:{
        typr:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        typr:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:true
    },
    color:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required: true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discountinued"],
        required:true,
        default:"Available"
    }
},{timestamp:true});

const Product = mongoose.model("Product",productSchema);

module.exports = Product;