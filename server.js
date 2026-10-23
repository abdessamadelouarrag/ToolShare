require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Utilisateur = require("./src/models/Utilisateur");
const Installation = require("./src/models/Installation");
const authRouter = require("./src/routes/authRouter");
const profileRouter = require("./src/routes/profileRouter");
const installationRouter = require("./src/routes/installationRouter");
const {errorHandler} = require("./src/middlewares/errorHandler");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({message : "Welcome To ToolShare"});
});

app.get("/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
        status : connected ? "ok" : "unavailable",
        database : connected ? "connected" : "disconnected"
    });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/installation", installationRouter);
app.use(errorHandler);

async function startServer(){
    try{
        if(!process.env.JWT_SECRET){
            throw new Error("JWT_SECRET est obligatoire dans .env !");
        }
        await connectDB();
        await Promise.all([Utilisateur.init(), Installation.init()]);
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server start in port ${port}`);
        });
    }catch(error){
        console.error(error);
        process.exit(1);
    }
}

if(require.main === module){
    startServer();
}

module.exports = app;
