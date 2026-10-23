const Installation = require("../models/Installation");

async function installationStatus(req, res, next){
    try{
        const installation = await Installation.findById("installation");
        return res.status(200).json({installe : installation?.installe ?? false});
    }catch(error){
        next(error);
    }
}


module.exports = {installationStatus};
