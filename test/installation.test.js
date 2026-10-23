const {test} = require("node:test");
const assert = require("node:assert/strict");
const {randomUUID} = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../server");
const Utilisateur = require("../src/models/Utilisateur");
const Installation = require("../src/models/Installation");

test("installation endpoints and transaction rollback", {skip : !process.env.TEST_MONGO_URI}, async (t) => {
    const databaseName = "toolshare_install_test_" + randomUUID().replaceAll("-", "");
    let server;
    t.after(async () => {
        if(server) await new Promise(resolve => server.close(resolve));
        if(mongoose.connection.name === databaseName && databaseName.startsWith("toolshare_install_test_")){
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    });

    await mongoose.connect(process.env.TEST_MONGO_URI, {dbName : databaseName, serverSelectionTimeoutMS : 5000});
    const hello = await mongoose.connection.db.admin().command({hello : 1});
    assert.ok(hello.setName, "The installation test requires a MongoDB replica set.");
    await Promise.all([Utilisateur.init(), Installation.init()]);
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port;

    async function request(method, path, body){
        const response = await fetch(base + path, {
            method,
            headers : {"Content-Type" : "application/json"},
            ...(body === undefined ? {} : {body : JSON.stringify(body)})
        });
        return {status : response.status, data : await response.json()};
    }
    const account = (email) => ({nom : "Amrani", prenom : "Sara", email, motDePasse : "Test-password-123"});
    let admin;

    await t.test("status is public and invalid input leaves the database untouched", async () => {
        assert.deepEqual((await request("GET", "/api/installation/status")).data, {installe : false});
        for(const body of [{}, account("invalid-email"), {...account("short@example.com"), motDePasse : "short"}]){
            assert.equal((await request("POST", "/api/installation", body)).status, 400);
        }
        assert.equal(await Utilisateur.countDocuments(), 0);
        assert.equal(await Installation.countDocuments(), 0);
    });

    await t.test("a failure after both writes rolls back both the Admin and installation state", async () => {
        const originalSave = Utilisateur.prototype.save;
        const saveMock = t.mock.method(Utilisateur.prototype, "save", async function(options){
            await originalSave.call(this, options);
            throw new Error("Simulated failure after saving the Admin");
        });
        const logMock = t.mock.method(console, "error", () => {});
        let result;
        try{
            result = await request("POST", "/api/installation", account("rollback@example.com"));
        }finally{
            saveMock.mock.restore();
            logMock.mock.restore();
        }
        assert.equal(result.status, 500);
        assert.equal(saveMock.mock.callCount(), 1);
        assert.equal(await Utilisateur.countDocuments(), 0);
        assert.equal(await Installation.countDocuments(), 0);
        assert.equal((await request("GET", "/api/installation/status")).data.installe, false);
    });

    await t.test("a database constraint failure restores the existing uninstalled state", async () => {
        const existing = await Utilisateur.create({
            nom : "Existing", prenom : "User", email : "taken@example.com",
            motDePasseHash : await bcrypt.hash("Test-password-123", 10)
        });
        await Installation.create({installe : false});
        assert.equal((await request("POST", "/api/installation", account("taken@example.com"))).status, 409);
        const state = await Installation.findById("installation");
        assert.equal(state.installe, false);
        assert.equal(state.installeLe, null);
        assert.equal(await Utilisateur.countDocuments(), 1);
        assert.equal(await Utilisateur.countDocuments({role : "ADMIN"}), 0);
        await Utilisateur.deleteOne({_id : existing._id});
    });

    await t.test("simultaneous requests create exactly one Admin and persist installation", async () => {
        const results = await Promise.all([
            request("POST", "/api/installation", account("admin-a@example.com")),
            request("POST", "/api/installation", account("admin-b@example.com"))
        ]);
        assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
        admin = results.find(result => result.status === 201).data.user;
        assert.equal(admin.role, "ADMIN");
        assert.equal(admin.motDePasseHash, undefined);
        assert.equal(admin.tokenVersion, undefined);
        assert.equal(await Utilisateur.countDocuments(), 1);
        const state = await Installation.findById("installation");
        assert.equal(state.installe, true);
        assert.ok(state.installeLe instanceof Date);
        assert.equal(await Installation.countDocuments(), 1);
        assert.deepEqual((await request("GET", "/api/installation/status")).data, {installe : true});
    });

    await t.test("the first Admin password is hashed and usable for login", async () => {
        const stored = await Utilisateur.findById(admin._id).select("+motDePasseHash");
        assert.notEqual(stored.motDePasseHash, "Test-password-123");
        assert.equal(await bcrypt.compare("Test-password-123", stored.motDePasseHash), true);
        const result = await request("POST", "/api/auth/login", {email : admin.email, motDePasse : "Test-password-123"});
        assert.equal(result.status, 200);
        assert.ok(result.data.token);
        assert.equal(result.data.user.motDePasseHash, undefined);
    });

    await t.test("persisted installation rejects repeats and the old default route is removed", async () => {
        await Utilisateur.updateOne({_id : admin._id}, {$set : {actif : false}});
        assert.equal((await request("POST", "/api/installation", account("again@example.com"))).status, 409);
        assert.equal(await Utilisateur.countDocuments(), 1);
        assert.equal((await request("GET", "/api/installation/status")).data.installe, true);
        const oldRoute = await fetch(base + "/api/auth/default", {
            method : "POST", headers : {"Content-Type" : "application/json"},
            body : JSON.stringify({motDePasse : "Test-password-123"})
        });
        assert.equal(oldRoute.status, 404);
    });
});
