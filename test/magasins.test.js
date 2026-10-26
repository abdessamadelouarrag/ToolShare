import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID, randomBytes} from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../server.js";
import {Utilisateur, Magasin, Materiel, Reservation, Mouvement} from "../src/models/index.js";

test("Admin store management and global views", {skip : !process.env.TEST_MONGO_URI}, async (t) => {
    const databaseName = "toolshare_magasins_test_" + randomUUID().replaceAll("-", "");
    process.env.JWT_SECRET ||= randomBytes(48).toString("hex");
    let server;
    t.after(async () => {
        if(server) await new Promise(resolve => server.close(resolve));
        if(mongoose.connection.name === databaseName && databaseName.startsWith("toolshare_magasins_test_")){
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    });

    await mongoose.connect(process.env.TEST_MONGO_URI, {dbName : databaseName, serverSelectionTimeoutMS : 5000});
    await Promise.all([Utilisateur, Magasin, Materiel, Reservation, Mouvement].map(model => model.init()));
    const hash = await bcrypt.hash("Test-password-123", 4);
    const admin = await Utilisateur.create({nom : "Admin", prenom : "Test", email : "admin@example.com", motDePasseHash : hash, role : "ADMIN"});
    const store = await Magasin.create({nom : "Central", site : "Safi", adresse : "Site A"});
    const otherStore = await Magasin.create({nom : "Secondaire", site : "Autre site", adresse : "Site B", actif : false});
    const manager = await Utilisateur.create({nom : "Manager", prenom : "Test", email : "manager@example.com", motDePasseHash : hash, role : "GESTIONNAIRE", magasinId : store._id});
    const user = await Utilisateur.create({nom : "User", prenom : "Test", email : "user@example.com", motDePasseHash : hash});
    const tool = await Materiel.create({reference : "PER-001", nom : "Perceuse", categorie : "Percage", magasinId : store._id});
    const otherTool = await Materiel.create({reference : "MEU-002", nom : "Meuleuse", categorie : "Decoupe", magasinId : otherStore._id, actif : false, disponible : false});
    const loan = await Reservation.create({
        utilisateurId : user._id, magasinId : store._id, materielId : tool._id,
        dateDebut : new Date(Date.now() + 3600000), dureeHeures : 2,
        statut : "EN_COURS", dateSortieReelle : new Date()
    });
    const cancelled = await Reservation.create({
        utilisateurId : manager._id, magasinId : otherStore._id, materielId : otherTool._id,
        dateDebut : new Date(Date.now() + 7200000), dureeHeures : 1, statut : "ANNULEE"
    });
    const movement = await Mouvement.create({reservationId : loan._id, magasinId : store._id, type : "SORTIE", effectuePar : manager._id});
    const token = (account, extra = {}) => jwt.sign({sub : account._id.toString(), tokenVersion : 0, ...extra}, process.env.JWT_SECRET, {expiresIn : "1h", algorithm : "HS256"});
    const adminToken = token(admin);
    const managerToken = token(manager);
    const userToken = token(user);
    const validStore = {nom : " Nouveau magasin ", site : " Safi ", adresse : " Zone industrielle "};
    let created;

    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    async function request(method, path, body, accessToken = adminToken){
        const response = await fetch(base + path, {
            method,
            headers : {"Content-Type" : "application/json", ...(accessToken ? {Authorization : "Bearer " + accessToken} : {})},
            ...(body === undefined ? {} : {body : JSON.stringify(body)})
        });
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
        return {status : response.status, data};
    }

    await t.test("all store and global routes reject unauthenticated and non-Admin callers", async () => {
        const routes = [
            ["POST", "/api/magasins", validStore],
            ["GET", "/api/magasins"],
            ["GET", "/api/magasins/" + store._id],
            ["PATCH", "/api/magasins/" + store._id, {nom : "Denied"}],
            ["PATCH", "/api/magasins/" + store._id + "/desactiver"],
            ["DELETE", "/api/magasins/" + store._id],
            ["GET", "/api/admin/magasins"],
            ["GET", "/api/admin/materiels"],
            ["GET", "/api/admin/reservations"]
        ];
        for(const [method, path, body] of routes){
            for(const [accessToken, status] of [[null, 401], [managerToken, 403], [userToken, 403]]){
                assert.equal((await request(method, path, body, accessToken)).status, status, method + " " + path);
            }
        }
        assert.equal((await Magasin.findById(store._id)).actif, true);
        assert.equal(await Magasin.countDocuments(), 2);
    });

    await t.test("TOOL-23 Admin creates, lists, reads and updates stores", async () => {
        const result = await request("POST", "/api/magasins", {...validStore, actif : false});
        assert.equal(result.status, 201);
        created = result.data.magasin;
        assert.equal(created.nom, "Nouveau magasin");
        assert.equal(created.site, "Safi");
        assert.equal(created.actif, true);
        const list = await request("GET", "/api/magasins");
        assert.equal(list.status, 200);
        assert.equal(list.data.magasins.length, 3);
        const detail = await request("GET", "/api/magasins/" + created._id);
        assert.equal(detail.status, 200);
        assert.equal(detail.data.magasin._id, created._id);
        const updated = await request("PATCH", "/api/magasins/" + created._id, {nom : " Updated ", actif : false, $set : {site : "Injected"}});
        assert.equal(updated.status, 200);
        assert.equal(updated.data.magasin.nom, "Updated");
        assert.equal(updated.data.magasin.site, "Safi");
        assert.equal(updated.data.magasin.actif, true);
    });

    await t.test("TOOL-23 invalid data and IDs are rejected without changing records", async () => {
        for(const body of [{}, [], {...validStore, nom : "   "}, {...validStore, site : 5}, {...validStore, adresse : {value : "invalid"}}]){
            assert.equal((await request("POST", "/api/magasins", body)).status, 400);
        }
        for(const body of [{}, {actif : false}, {nom : "   "}, {site : false}, {adresse : []}]){
            assert.equal((await request("PATCH", "/api/magasins/" + store._id, body)).status, 400);
        }
        for(const [id, status] of [["invalid-id", 400], [new mongoose.Types.ObjectId().toString(), 404]]){
            assert.equal((await request("GET", "/api/magasins/" + id)).status, status);
            assert.equal((await request("PATCH", "/api/magasins/" + id, {nom : "Test"})).status, status);
            assert.equal((await request("PATCH", "/api/magasins/" + id + "/desactiver")).status, status);
            assert.equal((await request("DELETE", "/api/magasins/" + id)).status, status);
        }
        assert.equal(await Magasin.countDocuments(), 3);
    });

    await t.test("TOOL-25 Admin sees all stores, tools and reservations without exposing password data", async () => {
        const stores = await request("GET", "/api/admin/magasins");
        assert.equal(stores.status, 200);
        assert.equal(stores.data.magasins.length, 3);
        assert.equal(stores.data.magasins.find(item => item._id === otherStore._id.toString()).actif, false);
        const tools = await request("GET", "/api/admin/materiels");
        assert.equal(tools.status, 200);
        assert.equal(tools.data.materiels.length, 2);
        const inactiveTool = tools.data.materiels.find(item => item._id === otherTool._id.toString());
        assert.equal(inactiveTool.actif, false);
        assert.equal(inactiveTool.magasinId._id, otherStore._id.toString());
        const reservations = await request("GET", "/api/admin/reservations");
        assert.equal(reservations.status, 200);
        assert.equal(reservations.data.reservations.length, 2);
        assert.deepEqual(reservations.data.reservations.map(item => item._id).sort(), [loan._id.toString(), cancelled._id.toString()].sort());
        for(const booking of reservations.data.reservations){
            assert.ok(booking.magasinId.nom);
            assert.ok(booking.materielId.reference);
            assert.ok(booking.utilisateurId.email);
        }
        assert.equal(JSON.stringify(reservations.data).includes("motDePasseHash"), false);
        assert.equal(JSON.stringify(reservations.data).includes("tokenVersion"), false);
        assert.equal(JSON.stringify(reservations.data).includes(hash), false);
    });

    await t.test("TOOL-24 deactivation and DELETE preserve stores, assignments, equipment, loans and movements", async () => {
        const beforeTool = await Materiel.findById(tool._id).lean();
        const beforeLoan = await Reservation.findById(loan._id).lean();
        const beforeMovement = await Mouvement.findById(movement._id).lean();
        const beforeManager = await Utilisateur.findById(manager._id).lean();
        const deactivated = await request("PATCH", "/api/magasins/" + store._id + "/desactiver");
        assert.equal(deactivated.status, 200);
        assert.equal(deactivated.data.magasin.actif, false);
        assert.equal((await request("PATCH", "/api/magasins/" + store._id + "/desactiver")).status, 200);
        assert.equal((await request("GET", "/api/magasins/" + store._id)).data.magasin.actif, false);
        assert.deepEqual(await Materiel.findById(tool._id).lean(), beforeTool);
        assert.deepEqual(await Reservation.findById(loan._id).lean(), beforeLoan);
        assert.deepEqual(await Mouvement.findById(movement._id).lean(), beforeMovement);
        assert.deepEqual(await Utilisateur.findById(manager._id).lean(), beforeManager);
        assert.equal(await Materiel.countDocuments(), 2);
        assert.equal(await Reservation.countDocuments(), 2);
        assert.equal(await Mouvement.countDocuments(), 1);
        const history = await request("GET", "/api/admin/reservations");
        const outstanding = history.data.reservations.find(item => item._id === loan._id.toString());
        assert.equal(outstanding.statut, "EN_COURS");
        assert.equal(outstanding.magasinId.actif, false);
        assert.equal((await request("DELETE", "/api/magasins/" + created._id)).status, 200);
        assert.equal((await Magasin.findById(created._id)).actif, false);
        assert.equal(await Magasin.countDocuments(), 3);
    });

    await t.test("current database roles and account activation control Admin access", async () => {
        assert.equal((await request("GET", "/api/admin/reservations", undefined, token(user, {role : "ADMIN"}))).status, 403);
        await Utilisateur.updateOne({_id : admin._id}, {$set : {role : "UTILISATEUR"}});
        assert.equal((await request("GET", "/api/magasins")).status, 403);
        await Utilisateur.updateOne({_id : admin._id}, {$set : {role : "ADMIN", actif : false}});
        assert.equal((await request("GET", "/api/admin/magasins")).status, 401);
    });
});
