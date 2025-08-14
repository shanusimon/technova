const Wallet = require('../../models/walletSchema');
const StatusCodes = require("../../constants/statuscode");

const getWalletInfo = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;
        const walletData = await Wallet.findOne({ userId }).populate('transactions.orderId');

        if (!walletData) {
            return res.render('wallet', { walletData: { balance: 0, transactions: [] } });
        }

        res.render('wallet', { walletData });
    } catch (error) {
        console.error("Error fetching wallet data:", error);
        res.redirect('/pagenotFound');
    }
};

module.exports = {
    getWalletInfo
};
