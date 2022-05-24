const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0dn1k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        const productCollection = client.db('wrench-station').collection('product');

        //Products GET API 6 Items
        app.get('/products_6', async (req, res)=>{
            const cursor = productCollection.find({}).sort({_id:-1}).limit(6);
            const products = await cursor.toArray();
            res.send(products);
        });
        //Single Product GET API
        app.get('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        });
        //Update Quantity PUT API
        app.put('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const updateProduct = req.body;
            const query = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updateProduct.quantity
                }
            };
            const result = await productCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });
    }
    finally{

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is running swiftly.");
});

app.listen(port, ()=>{
    console.log("Port no: ", port);
});