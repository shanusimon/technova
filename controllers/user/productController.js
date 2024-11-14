const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


const getSuccesspage = async (req,res)=>{
  try {
    const orderId = req.query.id;
    console.log(orderId)
    return res.render('order-placed',{orderId})
  } catch (error) {
    console.log("error in loading successpage")
  }
  
}

const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.query.id;
    const order = await Order.findById(orderId)
      .populate('user')
      .populate('orderedItems.product');

    if (!order) {
      return res.status(404).send("Order not Found");
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${orderId}.pdf`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const pageWidth = 595.28;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    

    const logoPath = path.join(__dirname, '..', '..', 'public', 'evara-frontend', 'assets', 'imgs', 'theme', 'logo.png');
    doc.image(logoPath, margin, margin, { width: 100 });

    doc.fontSize(20).text("TechNova", pageWidth - 200, margin, { width: 150, align: 'right' });
    doc.fontSize(10)
       .text("Near Burj Khalifa Dubai, UAE\nPhone: 7592934128\nEmail: technova@company.com", 
             pageWidth - 200, margin + 30, 
             { width: 150, align: 'right' });

    doc.fontSize(24)
       .text("INVOICE", margin, margin + 120, { align: 'center', width: contentWidth });
    
    const detailsY = margin + 160;
    doc.fontSize(10)
       .text("BILL TO:", margin, detailsY)
       .font('Helvetica-Bold')
       .text(order.user.username, margin, detailsY + 20)
       .font('Helvetica')
       .text(order.user.address, margin, detailsY + 35, { width: 200 });

    doc.fontSize(10)
       .text("Invoice No:", pageWidth - 200, detailsY)
       .text(order._id, pageWidth - 150, detailsY)
       .text("Date:", pageWidth - 200, detailsY + 20)
       .text(new Date().toLocaleDateString(), pageWidth - 150, detailsY + 20);


    const tableTop = detailsY + 100;
    doc.font('Helvetica-Bold')
       .fontSize(10);

    doc.rect(margin, tableTop, contentWidth, 20)
       .fillColor('#f0f0f0')
       .fill();

    doc.fillColor('#000000')
       .text("Product Name", margin + 10, tableTop + 5, { width: 200 })
       .text("Unit Price", margin + 220, tableTop + 5, { width: 100, align: 'right' })
       .text("Quantity", margin + 320, tableTop + 5, { width: 100, align: 'right' })
       .text("Total", margin + 420, tableTop + 5, { width: 75, align: 'right' });

    let tableY = tableTop + 30;
    doc.font('Helvetica');

    order.orderedItems.forEach((item) => {
      const price = item.price || 0;
      const total = price * item.quantity;

      if ((tableY - tableTop - 30) / 25 % 2 === 0) {
        doc.rect(margin, tableY - 5, contentWidth, 25)
           .fillColor('#f9f9f9')
           .fill();
      }

      doc.fillColor('#000000')
         .text(item.product.productName, margin + 10, tableY, { width: 200 })
         .text(`$${price.toFixed(2)}`, margin + 220, tableY, { width: 100, align: 'right' })
         .text(item.quantity.toString(), margin + 320, tableY, { width: 100, align: 'right' })
         .text(`$${total.toFixed(2)}`, margin + 420, tableY, { width: 75, align: 'right' });

      tableY += 25;
    });

    const totalY = tableY + 20;
    doc.rect(margin, totalY, contentWidth, 2)
       .fillColor('#000000')
       .fill();

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total Amount:', margin + 320, totalY + 10)
       .text(`$${order.finalAmount.toFixed(2)}`, margin + 420, totalY + 10, { width: 75, align: 'right' });

    const footerY = totalY + 50;
    doc.fontSize(10)
       .font('Helvetica')
       .text("Thank you for your business!", margin, footerY, { align: 'center', width: contentWidth })
       .text("For any inquiries, please contact us at support@company.com", margin, footerY + 15, { align: 'center', width: contentWidth });

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
        return res.redirect('/login');
      }

      const addressDoc = await Address.findOne({ userId: user });
      const addresses = addressDoc ? addressDoc.addresses : [];

      const coupons = await Coupon.find();
      const userData = await User.findById(user);

      const redeemedCoupons = userData.redeemedcoupon; 
      const Notusedcoupon = coupons.filter(coupon => !redeemedCoupons.includes(coupon.code)); 

      let totalPrice = 0;
  
      if (req.query.id) {
        const product = await Product.findById(req.query.id);
        if (!product) {
          return res.redirect('/page-not-found');
        }
        totalPrice = product.salePrice;
        return res.render('checkout', { cart: null, product, address: addresses, totalPrice,Notusedcoupon });
      } else {
        const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
        if (!cartItems) {
          return res.render('checkout', { cart: null, products: [], address: addresses, totalPrice, product: null,Notusedcoupon });
        }
        totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
        return res.render('checkout', { cart: cartItems, products: cartItems.items, address: addresses, totalPrice, product: null,Notusedcoupon });
      }
    } catch (error) {
      console.error("Error loading checkout page:", error);
      res.redirect('/page-not-found');
    }
  };

  

  const placeOrder = async (req, res) => {
    try {
        let { cart, totalPrice,couponCode,payment_option,discount,addressId, singleProduct } = req.body;
        const userId = req.session.user;
        console.log(`total Price ${totalPrice}, Discount ${discount},Coupon Code ${couponCode}`);
        let orderedItems = [];

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
        const couponApplied = Boolean(couponCode && couponCode.trim() !== "");
     
        const parsedTotalPrice = Number(totalPrice) || 0;
        const parsedDiscount = Number(discount) || 0;

        let fullAmount = parsedTotalPrice + parsedDiscount;
        let convTotal = Number(fullAmount);
        let finAmount = parsedTotalPrice - parsedDiscount;
        let convfin = Number(finAmount);

        if(discount==0){
          couponCode = undefined;
        }

        const orderData = {
            orderedItems,
            totalPrice:convTotal.toFixed(2),
            finalAmount:convfin.toFixed(2),
            couponCode,
            discount,
            couponApplied,
            user: userId,
            address: addressId,
            paymentMethod: payment_option,
        };

        if (payment_option === 'COD') {
            orderData.status = 'Pending';
            orderData.paymentStatus = 'Not Applicable';
        } else if (payment_option === 'Online') {
            orderData.status = 'Shipped';
            orderData.paymentStatus = 'Completed';
        }

        if (discount !== 0) {
          await User.findByIdAndUpdate(
              userId,
              { $push: { redeemedcoupon: couponCode } }
          );
      }

        const newOrder = new Order(orderData);
        await newOrder.save();
        
        if (payment_option === 'COD') {
            res.redirect(`/payment-successful?id=${newOrder._id}`);
        } else {
            res.json({ orderId: newOrder._id });
        }

    } catch (error) {
        console.error("Error in placing order:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = { 
  getCheckOutPage,
  placeOrder,
  getSuccesspage,
  invoiceDownload
};
