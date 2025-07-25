const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

const getBrandPage = async (req, res) => {
  try {
    const brandData = await Brand.find({}).sort({ createdAt: -1 });

    const reverseBrand = brandData.reverse();

    res.render("brand", {
      data: reverseBrand,
    });
  } catch (error) {
    console.error("Error fetching brand page:", error);
    res.redirect("/pageerror");
  }
};

const addBrands = async (req, res) => {
  try {
    const brand = req.body.brandName;
    const findBrand = await Brand.findOne({ brandName: brand });

    if (!findBrand) {
      if (req.file && req.file.path) {
        const image = req.file.path;
        const newBrand = new Brand({
          brandName: brand,
          brandImage: image,
        });

        await newBrand.save();
        res.redirect("/admin/brands");
      } else {
        res.status(400).send("Image upload failed.");
      }
    }
  } catch (error) {
    console.error("Error in addBrands:", error);
    res.redirect("/pageerror");
  }
};

const blockBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    await Brand.updateOne({ _id: brandId }, { $set: { isBlocked: true } });
    res.json({ success: true, status: "blocked" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Block failed" });
  }
};

const unBlockbrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    await Brand.updateOne({ _id: brandId }, { $set: { isBlocked: false } });
    res.json({ success: true, status: "unblocked" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Unblock failed" });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const brandId = req.query.id;
    if (!brandId) {
      return res.status(400).redirect("/pageerror");
    }
    await Brand.deleteOne({ _id: brandId });
    res.redirect("/admin/brands");
  } catch (error) {
    console.error("Erro deleting brand", error);
    res.status(500).redirect("/pageerror");
  }
};

module.exports = {
  getBrandPage,
  addBrands,
  blockBrand,
  unBlockbrand,
  deleteBrand,
};
