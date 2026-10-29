import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID, randomBytes} from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Utilisateur from "../src/models/Utilisateur.js";
import Magasin from "../src/models/Magasin.js";
import * as authService from "../src/services/authService.js";
import * as profileService from "../src/services/profileService.js";

test("account and profile services enforce business rules without HTTP objects", {skip : !process.env.TEST_MONGO_URI}, async (t) => {
    const databaseName = "toolshare_services_test_" + randomUUID().replaceAll("-", "");
    process.env.JWT_SECRET ||= randomBytes(48).toString("hex");
    t.after(async () => {
        if(mongoose.connection.name === databaseName && databaseName.startsWith("toolshare_services_test_")){
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    });
    await mongoose.connect(process.env.TEST_MONGO_URI, {dbName : databaseName, serverSelectionTimeoutMS : 5000});
    await Promise.all([Utilisateur.init(), Magasin.init()]);
    const magasin = await Magasin.create({nom : "Central", site : "Safi", adresse : "Site A"});
    const closed = await Magasin.create({nom : "Ferme", site : "Safi", adresse : "Site B", actif : false});
    const admin = await Utilisateur.create({nom : "Admin", prenom : "Test", email : "admin@example.com", motDePasseHash : "fixture-hash", role : "ADMIN"});
    const account = {nom : "User", prenom : "Test", email : "USER@example.com", motDePasse : "Test-password-123"};
    let user, manager, initialToken, currentPassword;

    await t.test("registration hashes passwords and enforces creator roles and store assignment", async () => {
        user = await authService.register(account, admin);
        assert.equal(user.email, "user@example.com");
        assert.equal(user.creePar.toString(), admin._id.toString());
        assert.equal(user.toJSON().motDePasseHash, undefined);
        const stored = await Utilisateur.findById(user._id).select("+motDePasseHash");
        assert.ok(await bcrypt.compare(account.motDePasse, stored.motDePasseHash));
        await assert.rejects(authService.register({...account, email : "forbidden@example.com"}, user), {statusCode : 403});
        await assert.rejects(authService.register(account, admin), {statusCode : 409});
        const managerData = {...account, email : "manager@example.com", role : "GESTIONNAIRE", magasinId : magasin._id};
        manager = await authService.register(managerData, admin);
        await assert.rejects(authService.register({...managerData, email : "other-manager@example.com"}, manager), {statusCode : 403});
        await assert.rejects(authService.register({...managerData, email : "closed@example.com", magasinId : closed._id}, admin), {statusCode : 404});
        const created = await authService.register({...account, email : "by-manager@example.com"}, manager);
        assert.equal(created.role, "UTILISATEUR");
        assert.equal(created.magasinId, null);
    });

    await t.test("login validates the password, account activation and token version", async () => {
        const login = await authService.login({email : account.email, motDePasse : account.motDePasse});
        initialToken = jwt.verify(login.token, process.env.JWT_SECRET, {algorithms : ["HS256"]});
        assert.equal(initialToken.sub, user._id.toString());
        assert.equal(initialToken.tokenVersion, 0);
        await assert.rejects(authService.login({email : account.email, motDePasse : "wrong-password"}), {statusCode : 401});
        await Utilisateur.updateOne({_id : user._id}, {$set : {actif : false}});
        await assert.rejects(authService.login({email : account.email, motDePasse : account.motDePasse}), {statusCode : 401});
        await Utilisateur.updateOne({_id : user._id}, {$set : {actif : true}});
    });

    await t.test("profile changes whitelist fields and reject duplicate emails", async () => {
        const updated = await profileService.updateUser(user._id, {nom : "Updated", role : "ADMIN", actif : false});
        assert.equal(updated.nom, "Updated");
        assert.equal(updated.role, "UTILISATEUR");
        assert.equal(updated.actif, true);
        await assert.rejects(profileService.updateUser(user._id, {email : admin.email}), {statusCode : 409});
        await assert.rejects(profileService.updateUser(user._id, {}), {statusCode : 400});
    });

    await t.test("concurrent password changes keep one winner and revoke previous tokens", async () => {
        const passwords = ["First-password-123", "Second-password-123"];
        const results = await Promise.allSettled(passwords.map(nouveauMotDePasse => profileService.updatePassword(user._id, {
            motDePasseActuel : account.motDePasse, nouveauMotDePasse
        })));
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        const rejected = results.find(result => result.status === "rejected");
        assert.ok([401, 409].includes(rejected.reason.statusCode));
        currentPassword = passwords[results.findIndex(result => result.status === "fulfilled")];
        const stored = await Utilisateur.findById(user._id).select("+motDePasseHash +tokenVersion");
        assert.ok(await bcrypt.compare(currentPassword, stored.motDePasseHash));
        assert.equal(stored.tokenVersion, initialToken.tokenVersion + 1);
        await assert.rejects(authService.login({email : account.email, motDePasse : account.motDePasse}), {statusCode : 401});
    });

    await t.test("logout increments the persisted token version", async () => {
        const login = await authService.login({email : account.email, motDePasse : currentPassword});
        const payload = jwt.verify(login.token, process.env.JWT_SECRET, {algorithms : ["HS256"]});
        await authService.logout(user._id);
        const stored = await Utilisateur.findById(user._id).select("+tokenVersion");
        assert.equal(stored.tokenVersion, payload.tokenVersion + 1);
    });
});
