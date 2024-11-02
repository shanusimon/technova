const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");


const getCart = async (req,res) => {
    try {
        const user= req.session.user;
        if(!user){
            return res.redirect('/login')
        }
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        if(!cart){
            return res.render('cart',{cart:null,product:[],totalAmount:0});
        }
        const totalAmount = cart.items.reduce((sum,item)=> sum + item.totalPrice,0);

        res.render('cart',{cart:cart,products:cart.items,totalAmount});

    } catch (error) {
        console.log("Error on getting cart");
    }
    
}

const saveToCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.query.id;

        if (!userId) {
            return res.redirect('/login');
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send("Product not found");
        }

        const quantity = parseInt(req.body.quantity);
        const totalPrice = quantity * product.salePrice;

        const cartDoc = await Cart.findOne({ userId: userId });

        if (cartDoc) {
            const existingItemIndex = cartDoc.items.findIndex(item => item.productId.toString() === productId);

            if (existingItemIndex >= 0) {
                cartDoc.items[existingItemIndex].quantity += quantity;
                cartDoc.items[existingItemIndex].totalPrice += totalPrice;
            } else {
                cartDoc.items.push({ productId, quantity, price: product.salePrice, totalPrice });
            }
            await cartDoc.save();
        } else {
            const newCart = new Cart({
                userId: userId,
                items: [{ productId, quantity, price: product.salePrice, totalPrice }]
            });
            await newCart.save();
        }
        console.log("Redirecting to cart");
        return res.redirect('/cart');

    } catch (error) {
        console.error("Error saving to cart:", error);
        res.status(500).send("Internal Server Error");
    }
}

const updateQuantity = async (req, res) => {
    try {
        const { productId, change } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        const newQuantity = cart.items[itemIndex].quantity + change;
        if (newQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
        }

        cart.items[itemIndex].quantity = newQuantity;

        const product = await Product.findById(productId);
        if (product) {
            cart.items[itemIndex].totalPrice = newQuantity * product.salePrice;
        }

        await cart.save();

    
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        const newSubtotal = cart.items[itemIndex].totalPrice;


        return res.json({ 
            success: true, 
            newQuantity, 
            newSubtotal: newSubtotal, 
            totalPrice 
        });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const removeFromCart = async (req, res) => {
 try {
    const userId = req.session.user;
    const { productId } = req.body;

    await Cart.findOneAndUpdate(
        { userId: userId },
        { $pull: { items: { productId: productId } } }
    );
    res.redirect("/cart");
    }
 catch (error) {
    console.error("Error removing item from cart:", error);
    res.redirect("/page-not-found");    
 }
};



module.exports ={
    getCart,
    saveToCart,
    updateQuantity,
    removeFromCart
}