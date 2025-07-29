const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || '';


        const filter = {
            isAdmin: false,
            $or: [
                { username: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } },
            ],
        };

        const userData = await User.find(filter)
            .skip(skip)
            .limit(limit);

        const totalDocuments = await User.countDocuments(filter);

        const totalPages = Math.ceil(totalDocuments / limit);

        res.render("customers", {
            data: userData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            search: searchQuery,
        });
    } catch (error) {
        console.log(error);
        res.redirect("/pageerror");
    }
};

const customerBlocked = async (req, res) => {
    try {
        const id = req.params.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ success: true, status: "blocked" });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

const customerUnblocked = async (req, res) => {
    try {
        const id = req.params.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ success: true, status: "unblocked" });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}