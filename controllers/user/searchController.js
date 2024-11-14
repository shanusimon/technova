const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const searchControl = async (req, res) => {
    try {
        const searchQuery = req.query.query;

        const products = await Product.find({
            productName: { $regex: searchQuery, $options: 'i' }
        }).populate('category');
        
        res.render('searchResults', { products, searchQuery });
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send("An error occurred while searching for products.");
    }
};

const filterCategory = async (req, res) => {
    try {
        const filter = req.query.category;
        let products;

        if (filter === 'all-categories') {
            products = await Product.find({});
        } else {
            const category = await Category.findOne({ name: filter }); 
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }

            products = await Product.find({ category: category._id });
        }

        res.json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching products' });
    }
};


module.exports = {
    searchControl,
    filterCategory
};