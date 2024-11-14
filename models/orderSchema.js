const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const Product = require("./productSchema");

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: [
            "Payment Pending",
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Request",
            "Returned",
            "Paid"
        ]
    },
    paymentStatus: {
        type: String,
        enum: [
            "Pending",
            "Completed",
            "Failed",
            "Refunded",
            "Not Applicable"  
        ],
        default: "Pending"
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponCode:{
        type:String,
        required:false,
        default:null
    }
    ,
    paymentMethod: {
        type: String,
        enum: ["COD", "Online"],
        required: true
    }
});

// Add index for faster queries
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ user: 1, createdOn: -1 });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;