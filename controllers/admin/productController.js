const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].path);
        }
      }

      const categoryId = await Category.findOne({ name: products.category });

      if (!categoryId) {
        return res.status(400).json("Invalid category name");
      }

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdAt: new Date(),
        quantity: products.quantity,
        size: products.size,
        color: products.color,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      return res.redirect("/admin/addProduct");
    } else {
      return res
        .status(400)
        .json("Product already exists, please try with another name");
    }
  } catch (error) {
    console.error("Error adding product", error);
    res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
          ],
        }
      : {};

    const productData = await Product.find(filter)
      .populate("category")
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        cat: category,
        brand: brand,
        currentPage: page,
        totalPages: totalPages,
        search: search,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });

    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "This product's category already has a better category offer",
      });
    }
    if (findProduct.productOffer) {
      findProduct.salePrice = findProduct.regularPrice;
    }
    findProduct.salePrice -= Math.floor(
      findProduct.regularPrice * (percentage / 100)
    );
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();

    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const productId = req.body.productID;
    console.log("Product ID received: ", productId);

    const findProduct = await Product.findById(productId);
    if (!findProduct) {
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    const percentage = findProduct.productOffer;

    if (
      typeof findProduct.salePrice === "number" &&
      typeof findProduct.regularPrice === "number"
    ) {
      findProduct.salePrice =
        findProduct.salePrice +
        Math.floor(findProduct.regularPrice * (percentage / 100));
      findProduct.productOffer = 0;

      await findProduct.save();
      res.json({ status: true, message: "Product offer removed successfully" });
    } else {
      res
        .status(400)
        .json({ status: false, message: "Invalid product price data" });
    }
  } catch (error) {
    console.error("Error in removeProductOffer: ", error);
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};
const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const geteditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});
    const brand = await Brand.find({});

    res.render("edit-product", {
      message: "",
      product: product,
      productCategory: product.category.name,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      res.status(400).json({
        error:
          "Product with this name already exists. Please try with another name",
      });
    }

    const images = [];

    const category = await Category.findOne({ name: data.category });

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.path);
      });
    }

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: category._id,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
    };

    if (req.files.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    res.redirect("/admin/pageerror");
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    console.log(imageNameToServer, productIdToServer);
    const productTest = await Product.findById(productIdToServer);

    const product = await Product.findByIdAndUpdate(
      productIdToServer,
      { $pull: { productImage: imageNameToServer } },
      { new: true }
    );
    console.log("this is the product", product);
    const imagePath = path.join(
      "public",
      "uploads",
      "product-images",
      imageNameToServer
    );
    console.log("Image Path: ", imagePath);
    if (fs.existsSync(imagePath)) {
      await fs.promises.unlink(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully.`);
    } else {
      console.log("Image not found.");
    }

    res.send({ status: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  geteditProduct,
  editProduct,
  deleteSingleImage,
};
