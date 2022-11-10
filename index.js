const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
// middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.36vzmly.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

// JWT Token Verify
const jwtVerify = (req, res, next) => {};

app.post("/jwt", (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, {
        expiresIn: "2h",
    });
    res.send({ token });
});

async function run() {
    try {
        const menuCollection = client.db("snackbox").collection("menus");

        app.get("/top-rated-menus", async (req, res) => {
            const query = {};
            const cursor = menuCollection
                .find(query)
                .sort({ ratings: -1 })
                .limit(3);
            const menus = await cursor.toArray();
            res.send(menus);
        });

        app.get("/menus", async (req, res) => {
            const query = {};
            const cursor = menuCollection.find(query);
            const menus = await cursor.toArray();
            res.send(menus);
        });
        app.get("/menus/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const menu = await menuCollection.findOne(query);
            res.send(menu);
        });
        // post api
        app.post("/add-menu", async (req, res) => {
            const menu = req.body;
            const ratings = 0;
            const result = await menuCollection.insertOne({
                ...menu,
                ratings: ratings,
            });

            res.send(result);
        });
    } finally {
    }
}
run().catch((error) => {
    console.error(error);
});

app.get("/", (req, res) => {
    res.send("Hello World! is running");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
