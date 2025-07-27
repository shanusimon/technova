const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const getSuccesspage = async (req, res) => {
  try {
    const orderId = req.query.id;
    console.log(orderId);
    return res.render("order-placed", { orderId });
  } catch (error) {
    console.log("error in loading successpage");
  }
};

const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.query.id;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("orderedItems.product");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${orderId}.pdf`
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Producer: "TechNova",
        Creator: "TechNova Invoice System",
      },
    });

    doc.pipe(res);

    const logoPath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "evara-frontend",
      "assets",
      "imgs",
      "theme",
      "logo.png"
    );

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    }
    const formatCurrency = (amount) => {
      return `Rs. ${amount.toFixed(2)}`;
    };

    const pageWidth = 595.28;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    const ship = order.address;

    const billX = margin;

    doc
      .fontSize(20)
      .text("TechNova", pageWidth - 200, 50, { width: 150, align: "right" });
    doc
      .fontSize(10)
      .text(
        "Near Burj Khalifa Dubai, UAE\nPhone: 7592934128\nEmail: technova@company.com",
        pageWidth - 200,
        80,
        { width: 150, align: "right" }
      );

    doc
      .fontSize(24)
      .text("INVOICE", margin, 150, { align: "center", width: contentWidth });

    const detailsY = 200;
    doc
      .fontSize(10)
      .text("BILL TO:", margin, detailsY)
      .text(order.user.username, margin, detailsY + 20)
      .text(order.user.email || "", margin, detailsY + 35, { width: 200 });

  const shipX = 250;
let shipY = detailsY;

doc.fontSize(10).text("SHIP TO:", shipX, shipY);

shipY += 15;
if (ship?.name) {
  doc.text(ship.name, shipX, shipY);
  shipY += 15;
}

const addressLine = [ship?.landMark, ship?.city, ship?.state]
  .filter(Boolean)
  .join(", ");
if (addressLine) {
  doc.text(addressLine, shipX, shipY, { width: 200 });
  shipY += 15;
}

if (ship?.pincode) {
  doc.text(`Pincode: ${ship.pincode}`, shipX, shipY);
  shipY += 15;
}

if (ship?.phone) {
  doc.text(`Phone: ${ship.phone}`, shipX, shipY);
  shipY += 15;
}


    doc
      .fontSize(10)
      .text("Invoice No:", pageWidth - 200, detailsY)
      .text(order._id, pageWidth - 150, detailsY)
      .text("Date:", pageWidth - 200, detailsY + 20)
      .text(new Date().toLocaleDateString(), pageWidth - 150, detailsY + 20);

    const tableTop = detailsY + 80;
    doc.fontSize(10);
    doc.rect(margin, tableTop, contentWidth, 20).fillColor("#f0f0f0").fill();
    doc
      .fillColor("#000000")
      .text("Product Name", margin + 10, tableTop + 5, { width: 200 })
      .text("Unit Price", margin + 220, tableTop + 5, {
        width: 100,
        align: "right",
      })
      .text("Quantity", margin + 320, tableTop + 5, {
        width: 100,
        align: "right",
      })
      .text("Total", margin + 420, tableTop + 5, { width: 75, align: "right" });

    let tableY = tableTop + 30;
    order.orderedItems.forEach((item) => {
      const price = item.price || 0;
      const total = price * item.quantity;

      if (((tableY - tableTop - 30) / 25) % 2 === 0) {
        doc
          .rect(margin, tableY - 5, contentWidth, 25)
          .fillColor("#f9f9f9")
          .fill();
      }

      doc
        .fillColor("#000000")
        .text(item.product.productName, margin + 10, tableY, { width: 200 })
        .text(formatCurrency(price), margin + 220, tableY, {
          width: 100,
          align: "right",
        })
        .text(item.quantity.toString(), margin + 320, tableY, {
          width: 100,
          align: "right",
        })
        .text(formatCurrency(total), margin + 420, tableY, {
          width: 75,
          align: "right",
        });

      tableY += 25;
    });

    const subtotalBeforeDiscount = order.totalPrice;
    const discount = order.discount || 0;
    const deliveryCharge = 40;
    const subtotalAfterDiscount = subtotalBeforeDiscount - discount;
    const finalTotal = order.finalAmount;

    const totalY = tableY + 20;
    doc.rect(margin, totalY, contentWidth, 2).fillColor("#000000").fill();

    let currentY = totalY + 10;

    doc
      .fontSize(11)
      .text("Subtotal:", margin + 320, currentY)
      .text(formatCurrency(subtotalBeforeDiscount), margin + 420, currentY, {
        width: 75,
        align: "right",
      });

    if (discount !== 0) {
      currentY += 20;
      doc
        .text("Discount:", margin + 320, currentY)
        .text(`${formatCurrency(discount)}`, margin + 420, currentY, {
          width: 75,
          align: "right",
        });
    }

    currentY += 20;
    doc
      .text("Delivery Charge:", margin + 320, currentY)
      .text(formatCurrency(deliveryCharge), margin + 420, currentY, {
        width: 75,
        align: "right",
      });

    currentY += 20;
    doc
      .rect(margin + 320, currentY, contentWidth - 320, 1)
      .fillColor("#000000")
      .fill();

    currentY += 10;
    doc
      .fontSize(12)
      .text("Total Amount:", margin + 320, currentY)
      .text(formatCurrency(Math.abs(finalTotal)), margin + 420, currentY, {
        width: 75,
        align: "right",
      });

    const footerY = currentY + 40;
    doc
      .fontSize(10)
      .text("Thank you for your business!", margin, footerY, {
        align: "center",
        width: contentWidth,
      })
      .text(
        "For any inquiries, please contact us at support@company.com",
        margin,
        footerY + 15,
        { align: "center", width: contentWidth }
      );

    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Error generating invoice");
  }
};

const getCheckOutPage = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const addressDoc = await Address.findOne({ userId: user });
    const addresses = addressDoc ? addressDoc.addresses : [];

    if (req.query.reload === "true") {
      return res.redirect("/checkout");
    }

    let totalPrice = 0;

    if (req.query.id) {
      const quantity = req.query.quantity;
      const product = await Product.findById(req.query.id);

      if (!product) {
        return res.redirect("/page-not-found");
      }

      totalPrice = product.salePrice * quantity;

      return res.render("checkout", {
        cart: null,
        product,
        address: addresses,
        totalPrice,
        quantity,
      });
    } else {
      const cartItems = await Cart.findOne({ userId: user }).populate(
        "items.productId"
      );

      if (!cartItems) {
        return res.render("checkout", {
          cart: null,
          products: [],
          address: addresses,
          totalPrice,
          product: null,
        });
      }

      totalPrice = cartItems.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      return res.render("checkout", {
        cart: cartItems,
        products: cartItems.items,
        address: addresses,
        totalPrice,
        product: null,
      });
    }
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.redirect("/page-not-found");
  }
};

const paymentFailedPage = async (req, res) => {
  try {
    res.render("order-failed");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getCheckOutPage,
  getSuccesspage,
  invoiceDownload,
  paymentFailedPage,
};
