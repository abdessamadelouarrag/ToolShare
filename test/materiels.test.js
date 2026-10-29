import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID, randomBytes} from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../server.js";
import {Utilisateur, Magasin, Materiel, Reservation, Mouvement} from "../src/models/index.js";

test("manager equipment management and user catalogue", {skip : !process.env.TEST_MONGO_URI}, async (t) => {
    const databaseName = "toolshare_materiels_test_" + randomUUID().replaceAll("-", "");
    process.env.JWT_SECRET ||= randomBytes(48).toString("hex");
    let server;
    t.after(async () => {
        if(server) await new Promise(resolve => server.close(resolve));
        if(mongoose.connection.name === databaseName && databaseName.startsWith("toolshare_materiels_test_")){
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    });
    await mongoose.connect(process.env.TEST_MONGO_URI, {dbName : databaseName, serverSelectionTimeoutMS : 5000});
    await Promise.all([Utilisateur, Magasin, Materiel, Reservation, Mouvement].map(model => model.init()));
    const storeA = await Magasin.create({nom : "Magasin A", site : "Safi", adresse : "Site A"});
    const storeB = await Magasin.create({nom : "Magasin B", site : "Safi", adresse : "Site B"});
    const storeC = await Magasin.create({nom : "Magasin ferme", site : "Safi", adresse : "Site C", actif : false});
    async function account(email, role, magasinId){
        return Utilisateur.create({nom : "Test", prenom : "Test", email, motDePasseHash : "fixture-hash-not-used-for-login", role, magasinId});
    }
    const managerA = await account("manager-a@example.com", "GESTIONNAIRE", storeA._id);
    const managerA2 = await account("manager-a2@example.com", "GESTIONNAIRE", storeA._id);
    const managerB = await account("manager-b@example.com", "GESTIONNAIRE", storeB._id);
    const admin = await account("admin@example.com", "ADMIN");
    const user = await account("user@example.com", "UTILISATEUR");
    const token = (person, extra = {}) => jwt.sign({sub : person._id.toString(), tokenVersion : 0, ...extra}, process.env.JWT_SECRET, {algorithm : "HS256", expiresIn : "1h"});
    const managerToken = token(managerA);
    const userToken = token(user);
    const adminToken = token(admin);
    const toolA = await Materiel.create({reference : "A-001", nom : "Perceuse", categorie : "Percage", magasinId : storeA._id});
    const toolB = await Materiel.create({reference : "B-001", nom : "Meuleuse", categorie : "Decoupe", magasinId : storeB._id});
    const unavailable = await Materiel.create({reference : "A-002", nom : "Indisponible", categorie : "Mesure", magasinId : storeA._id, disponible : false});
    const inactive = await Materiel.create({reference : "A-003", nom : "Archive", categorie : "Mesure", magasinId : storeA._id, actif : false});
    await Materiel.create({reference : "C-001", nom : "Autre outil", categorie : "Mesure", magasinId : storeC._id});
    const booking = await Reservation.create({
        utilisateurId : user._id, magasinId : storeA._id, materielId : toolA._id,
        dateDebut : new Date(Date.now() + 3600000), dureeHeures : 2,
        statut : "EN_COURS", dateSortieReelle : new Date()
    });
    const movement = await Mouvement.create({reservationId : booking._id, magasinId : storeA._id, type : "SORTIE", effectuePar : managerA._id});
    const validTool = {reference : " NEW-001 ", nom : " Nouvel outil ", categorie : " Mesure ", description : " Description "};
    let created;

    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    async function request(method, path, body, accessToken = managerToken){
        const response = await fetch(base + path, {
            method,
            headers : {"Content-Type" : "application/json", ...(accessToken ? {Authorization : "Bearer " + accessToken} : {})},
            ...(body === undefined ? {} : {body : JSON.stringify(body)})
        });
        return {status : response.status, data : await response.json()};
    }

    await t.test("roles protect every management route, the own-store endpoint and catalogue", async () => {
        const routes = [
            ["GET", "/api/materiels"], ["POST", "/api/materiels", validTool],
            ["GET", "/api/materiels/" + toolA._id], ["PATCH", "/api/materiels/" + toolA._id, {nom : "Denied"}],
            ["PATCH", "/api/materiels/" + toolA._id + "/disponibilite", {disponible : false}],
            ["PATCH", "/api/materiels/" + toolA._id + "/desactiver"], ["DELETE", "/api/materiels/" + toolA._id],
            ["GET", "/api/gestionnaire/magasin"]
        ];
        for(const [method, path, body] of routes){
            for(const [accessToken, status] of [[null, 401], [userToken, 403], [adminToken, 403]]){
                assert.equal((await request(method, path, body, accessToken)).status, status, method + " " + path);
            }
        }
        for(const path of ["/api/catalogue/magasins", "/api/catalogue/magasins/" + storeA._id + "/materiels"]){
            assert.equal((await request("GET", path, undefined, null)).status, 401);
            assert.equal((await request("GET", path)).status, 403);
            assert.equal((await request("GET", path, undefined, adminToken)).status, 403);
        }
    });

    await t.test("TOOL-30 references are unique across stores, including concurrent creation", async () => {
        const result = await request("POST", "/api/materiels", validTool);
        assert.equal(result.status, 201);
        created = result.data.materiel;
        assert.equal(created.reference, "NEW-001");
        assert.equal(created.magasinId, storeA._id.toString());
        assert.equal(created.actif, true);
        assert.equal(created.disponible, true);
        assert.equal((await request("POST", "/api/materiels", validTool)).status, 409);
        assert.equal((await request("POST", "/api/materiels", validTool, token(managerB))).status, 409);
        const simultaneous = await Promise.all([1, 2].map(() => request("POST", "/api/materiels", {...validTool, reference : "RACE-001"})));
        assert.deepEqual(simultaneous.map(result => result.status).sort(), [201, 409]);
        assert.equal(await Materiel.countDocuments({reference : "RACE-001"}), 1);
        assert.equal((await request("POST", "/api/materiels", {...validTool, reference : "FOREIGN-001", magasinId : storeB._id.toString()})).status, 403);
    });

    await t.test("TOOL-31 managers read and edit only equipment belonging to their current store", async () => {
        const list = await request("GET", "/api/materiels");
        assert.equal(list.status, 200);
        assert.ok(list.data.materiels.every(item => item.magasinId === storeA._id.toString()));
        assert.equal(list.data.materiels.some(item => item._id === toolB._id.toString()), false);
        assert.equal((await request("GET", "/api/materiels/" + created._id)).status, 200);
        const updated = await request("PATCH", "/api/materiels/" + created._id, {nom : " Updated ", description : "", actif : false});
        assert.equal(updated.status, 200);
        assert.equal(updated.data.materiel.nom, "Updated");
        assert.equal(updated.data.materiel.description, "");
        assert.equal(updated.data.materiel.actif, true);
        assert.equal((await request("GET", "/api/materiels/" + toolA._id, undefined, token(managerA2))).status, 200);
        const before = await Materiel.findById(toolB._id).lean();
        for(const [method, suffix, body] of [["GET", ""], ["PATCH", "", {nom : "Denied"}], ["PATCH", "/disponibilite", {disponible : false}], ["PATCH", "/desactiver"], ["DELETE", ""]]){
            assert.equal((await request(method, "/api/materiels/" + toolB._id + suffix, body)).status, 404);
        }
        assert.deepEqual(await Materiel.findById(toolB._id).lean(), before);
        assert.equal((await request("PATCH", "/api/materiels/" + created._id, {nom : "Transfer", magasinId : storeB._id.toString()})).status, 400);
        assert.equal((await Materiel.findById(created._id)).magasinId.toString(), storeA._id.toString());
    });

    await t.test("invalid metadata, identifiers and availability values are rejected", async () => {
        for(const body of [{}, {...validTool, reference : "   "}, {...validTool, categorie : 5}, {...validTool, description : {value : "invalid"}}]){
            assert.equal((await request("POST", "/api/materiels", body)).status, 400);
        }
        for(const body of [{}, {nom : " "}, {reference : false}, {disponible : true}, {description : []}]){
            assert.equal((await request("PATCH", "/api/materiels/" + created._id, body)).status, 400);
        }
        assert.equal((await request("PATCH", "/api/materiels/" + created._id, {reference : toolB.reference})).status, 409);
        for(const disponible of ["false", 1, null, []]){
            assert.equal((await request("PATCH", "/api/materiels/" + created._id + "/disponibilite", {disponible})).status, 400);
        }
        for(const [id, status] of [["invalid-id", 400], [new mongoose.Types.ObjectId().toString(), 404]]){
            assert.equal((await request("GET", "/api/materiels/" + id)).status, status);
            assert.equal((await request("PATCH", "/api/materiels/" + id, {nom : "Test"})).status, status);
            assert.equal((await request("PATCH", "/api/materiels/" + id + "/disponibilite", {disponible : false})).status, status);
            assert.equal((await request("DELETE", "/api/materiels/" + id)).status, status);
        }
    });

    await t.test("TOOL-32 availability can be disabled and restored without reactivating archived equipment", async () => {
        const disabled = await request("PATCH", "/api/materiels/" + created._id + "/disponibilite", {disponible : false});
        assert.equal(disabled.status, 200);
        assert.equal(disabled.data.materiel.disponible, false);
        await request("PATCH", "/api/materiels/" + created._id, {nom : "Still unavailable", disponible : true});
        assert.equal((await Materiel.findById(created._id)).disponible, false);
        const restored = await request("PATCH", "/api/materiels/" + created._id + "/disponibilite", {disponible : true});
        assert.equal(restored.status, 200);
        assert.equal(restored.data.materiel.disponible, true);
        assert.equal((await request("PATCH", "/api/materiels/" + inactive._id + "/disponibilite", {disponible : true})).status, 409);
    });

    await t.test("TOOL-33 store information and scope follow database assignments, not JWT claims", async () => {
        const own = await request("GET", "/api/gestionnaire/magasin?magasinId=" + storeB._id);
        assert.equal(own.status, 200);
        assert.equal(own.data.magasin._id, storeA._id.toString());
        await Utilisateur.updateOne({_id : managerA._id}, {$set : {magasinId : storeB._id}});
        const reassignedToken = token(managerA, {magasinId : storeA._id.toString()});
        const reassigned = await request("GET", "/api/gestionnaire/magasin", undefined, reassignedToken);
        assert.equal(reassigned.data.magasin._id, storeB._id.toString());
        assert.equal((await request("GET", "/api/materiels/" + toolA._id)).status, 404);
        assert.equal((await request("GET", "/api/materiels/" + toolB._id)).status, 200);
        await Utilisateur.updateOne({_id : managerA._id}, {$set : {magasinId : null}});
        assert.equal((await request("GET", "/api/gestionnaire/magasin")).status, 403);
        await Utilisateur.updateOne({_id : managerA._id}, {$set : {magasinId : new mongoose.Types.ObjectId()}});
        assert.equal((await request("GET", "/api/gestionnaire/magasin")).status, 404);
        await Utilisateur.updateOne({_id : managerA._id}, {$set : {magasinId : storeA._id}});
    });

    await t.test("TOOL-34 users see active stores and active equipment across stores, including unavailability", async () => {
        const list = await request("GET", "/api/catalogue/magasins?actif=false", undefined, userToken);
        assert.equal(list.status, 200);
        assert.deepEqual(list.data.magasins.map(item => item._id).sort(), [storeA._id.toString(), storeB._id.toString()].sort());
        const inventory = await request("GET", "/api/catalogue/magasins/" + storeA._id + "/materiels?actif=false", undefined, userToken);
        assert.equal(inventory.status, 200);
        assert.ok(inventory.data.materiels.every(item => item.actif && item.magasinId === storeA._id.toString()));
        assert.equal(inventory.data.materiels.some(item => item._id === inactive._id.toString()), false);
        assert.equal(inventory.data.materiels.find(item => item._id === unavailable._id.toString()).disponible, false);
        assert.equal((await request("GET", "/api/catalogue/magasins/" + storeB._id + "/materiels", undefined, userToken)).data.materiels.length, 1);
        assert.equal((await request("GET", "/api/catalogue/magasins/" + storeC._id + "/materiels", undefined, userToken)).status, 404);
        assert.equal((await request("GET", "/api/catalogue/magasins/invalid/materiels", undefined, userToken)).status, 400);
    });

    await t.test("soft deletion preserves equipment, reservations and movements while hiding it from the catalogue", async () => {
        const beforeBooking = await Reservation.findById(booking._id).lean();
        const beforeMovement = await Mouvement.findById(movement._id).lean();
        assert.equal((await request("DELETE", "/api/materiels/" + toolA._id)).status, 200);
        assert.equal((await Materiel.findById(toolA._id)).actif, false);
        assert.equal((await request("GET", "/api/materiels/" + toolA._id)).status, 200);
        assert.deepEqual(await Reservation.findById(booking._id).lean(), beforeBooking);
        assert.deepEqual(await Mouvement.findById(movement._id).lean(), beforeMovement);
        const catalogue = await request("GET", "/api/catalogue/magasins/" + storeA._id + "/materiels", undefined, userToken);
        assert.equal(catalogue.data.materiels.some(item => item._id === toolA._id.toString()), false);
        assert.equal((await request("PATCH", "/api/materiels/" + created._id + "/desactiver")).status, 200);
        assert.equal((await request("POST", "/api/materiels", validTool)).status, 409);
    });

    await t.test("closed stores retain manager read access but reject inventory writes and catalogue access", async () => {
        await Magasin.updateOne({_id : storeA._id}, {$set : {actif : false}});
        assert.equal((await request("GET", "/api/gestionnaire/magasin")).data.magasin.actif, false);
        assert.equal((await request("GET", "/api/materiels")).status, 200);
        for(const [method, suffix, body] of [["POST", "", validTool], ["PATCH", "/" + unavailable._id, {nom : "Denied"}], ["PATCH", "/" + unavailable._id + "/disponibilite", {disponible : true}], ["DELETE", "/" + unavailable._id]]){
            assert.equal((await request(method, "/api/materiels" + suffix, body)).status, 409);
        }
        assert.equal((await request("GET", "/api/catalogue/magasins/" + storeA._id + "/materiels", undefined, userToken)).status, 404);
        assert.equal((await request("GET", "/api/catalogue/magasins", undefined, userToken)).data.magasins.length, 1);
        await Utilisateur.updateOne({_id : managerA._id}, {$set : {actif : false}});
        assert.equal((await request("GET", "/api/materiels")).status, 401);
    });
});
