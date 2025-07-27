const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const getCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }
    let cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.render("cart", { cart: null, product: [], totalAmount: 0 });
    }
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    res.render("cart", { cart: cart, products: cart.items, totalAmount });
  } catch (error) {
    console.log("Error on getting cart");
  }
};

const saveToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;
    const productId = req.query.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const requestedQty = parseInt(req.body.quantity);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      return res.status(400).send("Invalid quantity");
    }

    const cartDoc = await Cart.findOne({ userId });

    if (cartDoc) {
      const existingIndex = cartDoc.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingIndex >= 0) {
        const existingItem = cartDoc.items[existingIndex];
        const currentQty = existingItem.quantity;

        // New quantity capped at 5 and available stock
        const allowedQty = Math.min(5, product.quantity);
        const newQty = Math.min(currentQty + requestedQty, allowedQty);

        existingItem.quantity = newQty;
        existingItem.totalPrice = newQty * product.salePrice;
      } else {
        const initialQty = Math.min(requestedQty, 5, product.quantity);
        cartDoc.items.push({
          productId,
          quantity: initialQty,
          price: product.salePrice,
          totalPrice: initialQty * product.salePrice,
        });
      }

      await cartDoc.save();
    } else {
      const qtyToAdd = Math.min(requestedQty, 5, product.quantity);
      const newCart = new Cart({
        userId,
        items: [
          {
            productId,
            quantity: qtyToAdd,
            price: product.salePrice,
            totalPrice: qtyToAdd * product.salePrice,
          },
        ],
      });

      await newCart.save();
    }

    return res.redirect("/cart");
  } catch (error) {
    console.error("Error saving to cart:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { productId, change } = req.body;
    const user = req.session.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const cart = await Cart.findOne({ userId: user._id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    const newQuantity = cart.items[itemIndex].quantity + change;
    if (newQuantity < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity cannot be negative" });
    }

    cart.items[itemIndex].quantity = newQuantity;

    const product = await Product.findById(productId);
    if (product) {
      cart.items[itemIndex].totalPrice = newQuantity * product.salePrice;
    }

    await cart.save();

    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const newSubtotal = cart.items[itemIndex].totalPrice;

    return res.json({
      success: true,
      newQuantity,
      newSubtotal: newSubtotal,
      totalPrice,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
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
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.redirect("/page-not-found");
  }
};

module.exports = {
  getCart,
  saveToCart,
  updateQuantity,
  removeFromCart,
};
