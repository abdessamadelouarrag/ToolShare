import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import {pathToFileURL} from "node:url";
import connectDB from "./src/config/db.js";
import Utilisateur from "./src/models/Utilisateur.js";
import Installation from "./src/models/Installation.js";
import Materiel from "./src/models/Materiel.js";
import authRouter from "./src/routes/authRouter.js";
import profileRouter from "./src/routes/profileRouter.js";
import installationRouter from "./src/routes/installationRouter.js";
import magasinRouter from "./src/routes/magasinRouter.js";
import adminRouter from "./src/routes/adminRouter.js";
import {errorHandler} from "./src/middlewares/errorHandler.js";

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
app.use("/api/magasins", magasinRouter);
app.use("/api/admin", adminRouter);
app.use(errorHandler);

async function startServer(){
    try{
        if(!process.env.JWT_SECRET){
            throw new Error("JWT_SECRET est obligatoire dans .env !");
        }
        await connectDB();
        await Promise.all([Utilisateur.init(), Installation.init(), Materiel.init()]);
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server start in port ${port}`);
        });
    }catch(error){
        console.error(error);
        process.exit(1);
    }
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
    startServer();
}

export default app;
