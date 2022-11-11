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

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "Unauthorized Access" });
        }

        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        const menuCollection = client.db("snackbox").collection("menus");
        const reviewCollection = client.db("snackbox").collection("reviews");

        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, {
                expiresIn: "2h",
            });
            res.send({ token });
        });

        app.get("/top-rated-menus", async (req, res) => {
            const query = {};
            const cursor = menuCollection
                .find(query)
                .sort({ ratings: -1 })
                .limit(3);
            const menus = await cursor.toArray();
            res.send(menus);
            // console.log(menus)
        });

        app.get("/recently-added-menus", async (req, res) => {
            const query = {};
            const cursor = menuCollection
                .find(query)
                .sort({ createdAt: -1 })
                .limit(3);
            const menus = await cursor.toArray();
            res.send(menus);
        });

        app.get("/menus", async (req, res) => {
            const query = {};
            const cursor = menuCollection.find(query).sort({ createdAt: -1 });
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
        app.post("/add-menu", verifyJWT, async (req, res) => {
            const menu = req.body;
            const ratings = 0;
            const result = await menuCollection.insertOne({
                ...menu,
                ratings: ratings,
                ratingsCount: [0, 0, 0, 0, 0],
                totalRatingsCount: 0,
                createdAt: new Date(),
            });

            res.send(result);
        });

        app.post("/add-review", verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            const addedReview = await reviewCollection.findOne({
                _id: result.insertedId,
            });
            const menu = await menuCollection.findOne({
                _id: ObjectId(addedReview.menu.menuId),
            });

            menu.ratingsCount[addedReview.rating - 1] =
                menu.ratingsCount[addedReview.rating - 1] + 1;

            const newRatings =
                (menu.ratingsCount[0] * 1 +
                    menu.ratingsCount[1] * 2 +
                    menu.ratingsCount[2] * 3 +
                    menu.ratingsCount[3] * 4 +
                    menu.ratingsCount[4] * 5) /
                (menu.totalRatingsCount + 1);

            const updateMenu = await menuCollection.updateOne(
                {
                    _id: ObjectId(addedReview.menu.menuId),
                },
                {
                    $inc: {
                        totalRatingsCount: 1,
                        [`ratingsCount.${addedReview.rating - 1}`]: 1,
                    },
                    $set: {
                        ratings: newRatings,
                    },
                }
            );
            // console.log(updateMenu);
            res.send(result);
        });

        app.delete("/delete-review/:id", async (req, res) => {
            const id = req.params.id;

            const review = await reviewCollection.findOne({
                _id: ObjectId(id),
            });

            const menu = await menuCollection.findOne({
                _id: ObjectId(review.menu.menuId),
            });

            menu.ratingsCount[review.rating - 1] =
                menu.ratingsCount[review.rating - 1] - 1;

            const newRatings =
                (menu.ratingsCount[0] * 1 +
                    menu.ratingsCount[1] * 2 +
                    menu.ratingsCount[2] * 3 +
                    menu.ratingsCount[3] * 4 +
                    menu.ratingsCount[4] * 5) /
                (menu.totalRatingsCount - 1);

            const updateMenu = await menuCollection.updateOne(
                {
                    _id: ObjectId(review.menu.menuId),
                },
                {
                    $inc: {
                        totalRatingsCount: -1,
                        [`ratingsCount.${review.rating - 1}`]: -1,
                    },
                    $set: {
                        ratings: newRatings,
                    },
                }
            );

            const deleteReview = await reviewCollection.deleteOne({
                _id: ObjectId(id),
            });
            res.send(deleteReview);
        });

        app.get("/reviews-by-menu/:id", async (req, res) => {
            const id = req.params.id;
            const query = { "menu.menuId": id };
            const reviews = await reviewCollection.find(query).toArray();
            res.send(reviews);
        });

        app.get("/reviews-by-user/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const reviews = await reviewCollection
                .find({ "reviewBy.userId": id })
                .toArray();
            res.send(reviews);
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
