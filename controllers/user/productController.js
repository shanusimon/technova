const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema")

const getCheckOutPage = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.redirect('/login');
      }

      const addressDoc = await Address.findOne({ userId: user });
      const addresses = addressDoc ? addressDoc.addresses : [];
  
      let totalPrice = 0;
  
      if (req.query.id) {
        const product = await Product.findById(req.query.id);
        if (!product) {
          return res.redirect('/page-not-found');
        }
        totalPrice = product.salePrice;
        return res.render('checkout', { cart: null, product, address: addresses, totalPrice });
      } else {
        const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
        if (!cartItems) {
          return res.render('checkout', { cart: null, products: [], address: addresses, totalPrice, product: null });
        }
        totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
        return res.render('checkout', { cart: cartItems, products: cartItems.items, address: addresses, totalPrice, product: null });
      }
    } catch (error) {
      console.error("Error loading checkout page:", error);
      res.redirect('/page-not-found');
    }
  };


const placeOrder = async (req, res) => {
    try {
        const { cart, totalPrice, addressId, singleProduct } = req.body;
        const userId = req.session.user;
        let orderedItems = [];
        
        console.log("Request Body:", req.body);
        console.log("Address ID:", addressId);
        console.log("User ID from session:", userId);
        
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: product.salePrice,
            });
        } else {
            const cartItems = JSON.parse(cart);
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.totalPrice / item.quantity,
            }));
        }

        const discount = 0; 
        const finalAmount = totalPrice - discount;

        const newOrder = new Order({
            orderedItems,
            totalPrice,
            finalAmount,
            user: userId,
            address: addressId,
            status: 'Pending',
        });

        await newOrder.save();
        res.render('order-placed');
    } catch (error) {
        if (error.name === 'ValidationError') {
            console.error("Validation Error:", error.message);
        } else {
            console.error("Error saving order:", error);
        }
        res.redirect('/order-confirm');
    }
}


module.exports = { 
  getCheckOutPage,
  placeOrder
};
