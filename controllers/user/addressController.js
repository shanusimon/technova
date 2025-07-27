const Address = require("../../models/addressSchema");

const getAddAddress = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      res.render("login");
    } else {
      res.render("add-address", { user });
    }
  } catch (error) {}
};

const saveUserData = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.query.id;
    await User.findOneAndUpdate(
      { _id: userId },
      { username: name, phone: phone },
      { new: true }
    );
    res.redirect(`/userprofile?id=${userId}&success=true`);
  } catch (error) {
    console.error("Error saving user data:", error);
    res.status(500).send("Server error");
  }
};

const saveEditAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.body;
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    const updatedAddress = {
      addressType,
      name,
      state,
      city,
      landMark,
      pincode,
      phone,
      altPhone,
    };

    let addressDoc = await Address.findOne({ userId: userId });

    if (addressDoc) {
      if (addressId) {
        const addressIndex = addressDoc.addresses.findIndex(
          (addr) => addr._id.toString() === addressId
        );
        if (addressIndex !== -1) {
          addressDoc.addresses[addressIndex] = {
            ...addressDoc.addresses[addressIndex],
            ...updatedAddress,
          };
        } else {
          return res.status(404).json({ message: "Address not found" });
        }
      } else {
        addressDoc.addresses.push(updatedAddress);
      }
      await addressDoc.save();
      res
        .status(200)
        .json({ message: "Address saved successfully", address: addressDoc });
    } else {
      addressDoc = new Address({
        userId: userId,
        addresses: [updatedAddress],
      });
      await addressDoc.save();
      res
        .status(201)
        .json({ message: "Address saved successfully", address: addressDoc });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving address" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.query.id;

    if (!addressId) {
      console.error("No address ID provided in request");
      return res.status(400).send("Address ID is required");
    }

    const updatedAddress = await Address.findOneAndUpdate(
      { userId: userId },
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!updatedAddress) {
      console.error("Address not found or already deleted");
      return res.status(404).send("Address not found");
    }
    res.redirect("/userprofile");
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).send("Error deleting address");
  }
};

const getEditAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user._id;
    if (!userId) {
      res.redirect("/login");
    }
    const addressDoc = await Address.findOne({ userId: userId });
    if (addressDoc) {
      const address = addressDoc.addresses.find(
        (addr) => addr._id.toString() === addressId
      );
      if (address) {
        res.render("edit-address", {
          address,
        });
      } else {
        res.status(404).send("Address Not Found");
      }
    } else {
      res.status(404).send("Address Not Found");
    }
  } catch (error) {
    console.log("Error rendering on Edit address page", error);
    res.redirect("/pagenotFound");
  }
};

const saveAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    const newAddress = {
      addressType,
      name,
      state,
      city,
      landMark,
      pincode,
      phone,
      altPhone,
    };
    let addressDoc = await Address.findOne({ userId: userId });

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
      await addressDoc.save();
    } else {
      addressDoc = new Address({
        userId: userId,
        addresses: [newAddress],
      });
      await addressDoc.save();
    }
    res.redirect("/userprofile");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving address" });
  }
};

module.exports ={
    getAddAddress,
    getEditAddress,
    deleteAddress,
    saveEditAddress,
    saveUserData,
    saveAddress
}