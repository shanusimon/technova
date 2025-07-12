module.exports = function sessionUserAlias(req,res,next){
    if(req.user && !req.session.user){
        req.session.user = req.user;
    }
    next();
}