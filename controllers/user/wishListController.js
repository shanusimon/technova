const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const { response } = require("express");
const StatusCodes = require("../../constants/statuscode");

const getWishlist = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("User not logged in, redirecting to login");
      return res.redirect("/login");
    }

    const userId = req.session.user._id;
    const wishlist = await Wishlist.findOne({ userId: userId }).populate(
      "products.productId"
    );

    const data = wishlist ? wishlist.products : [];

    res.render("wish-list", {
      data: data,
      wishlistId: wishlist ? wishlist._id : null,
    });
  } catch (error) {
    console.log("Error in loading wishList page");
    res.redirect("/pagenotFound");
  }
};

const addProductToWishlist = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized: Please login first" });
    }
    const { productId } = req.body;
    const userId = req.session.user._id;

    const wishData = await Wishlist.findOne({ userId: userId });

    if (wishData) {
      const productExists = wishData.products.some(
        (item) => item.productId.toString() === productId
      );
      console.log(`Product Exists: ${productExists}`);
      if (!productExists) {
        wishData.products.push({ productId, addedOn: new Date() });
        await wishData.save();
        return res.status(StatusCodes.OK).json({ message: "Product added to wishlist" });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Product already in wishlist" });
      }
    } else {
      const newWishlist = new Wishlist({
        userId: userId,
        products: [{ productId, addedOn: new Date() }],
      });
      await newWishlist.save();
      return res
        .status(StatusCodes.CREATED)
        .json({ message: "New wishlist created and product added" });
    }
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { productId, wishlistId } = req.body;
    console.log(`productId:-${productId},wishlist${wishlistId}`);

    if (!userId) {
      return res.redirect("/login");
    }

    if (!productId || !wishlistId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid request data" });
    }

    const result = await Wishlist.findOneAndUpdate(
      { _id: wishlistId, userId: userId },
      { $pull: { products: { productId: productId } } },
      { new: true }
    );

    if (result) {
      res.status(StatusCodes.OK).json({ message: "Product removed from wishlist" });
    } else {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Wishlist not found or unauthorized access" });
    }
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
};

const saveToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.query.id || req.body.productId;

    if (!userId) {
      return res.redirect("/login");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).send("Product not found");
    }

    const quantity = parseInt(req.body.quantity) || 1;
    const totalPrice = quantity * product.salePrice;

    let cartDoc = await Cart.findOne({ userId });

    if (cartDoc) {
      const existingItemIndex = cartDoc.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex >= 0) {
        cartDoc.items[existingItemIndex].quantity += quantity;
        cartDoc.items[existingItemIndex].totalPrice += totalPrice;
      } else {
        cartDoc.items.push({
          productId,
          quantity,
          price: product.salePrice,
          totalPrice,
        });
      }
      await cartDoc.save();
    } else {
      const newCart = new Cart({
        userId,
        items: [{ productId, quantity, price: product.salePrice, totalPrice }],
      });
      await newCart.save();
    }
    return res.redirect("/cart");
  } catch (error) {
    console.error("Error adding product to cart from wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

module.exports = {
  getWishlist,
  addProductToWishlist,
  saveToCartFromWishlist,
  removeFromWishlist,
};