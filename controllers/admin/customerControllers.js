const User = require("../../models/userSchema");


const customerInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        // Capture the search query from the request
        const searchQuery = req.query.search || '';

        // Create a filter object for the search
        const filter = {
            isAdmin: false, // Only non-admin users
            $or: [
                { username: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } },
            ],
        };

        // Fetch filtered and paginated user data
        const userData = await User.find(filter)
            .skip(skip)
            .limit(limit);

        // Count total documents matching the search query
        const totalDocuments = await User.countDocuments(filter);

        // Calculate total pages
        const totalPages = Math.ceil(totalDocuments / limit);

        // Render the results
        res.render("customers", {
            data: userData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            search: searchQuery, // Pass the search query to the template
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