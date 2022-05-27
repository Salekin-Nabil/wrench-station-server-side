const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0dn1k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        const productCollection = client.db('wrench-station').collection('product');
        const orderCollection = client.db('wrench-station').collection('order');
        const userCollection = client.db('wrench-station').collection('user');
        const reviewCollection = client.db('wrench-station').collection('review');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.admin === true) {
              next();
            }
            else {
              res.status(403).send({ message: 'forbidden' });
            }
          }


        //JWT
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        });
        //Products GET API All Items
        app.get('/products', async (req, res)=>{
            const cursor = productCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });
        //Products GET API All orders
        app.get('/orders', async (req, res)=>{
            const cursor = orderCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        });
        //Products GET API latest 6 Items
        app.get('/products_6', async (req, res)=>{
            const cursor = productCollection.find({}).sort({_id:-1}).limit(6);
            const products = await cursor.toArray();
            res.send(products);
        });
        //Reviews GET API latest 6 reviews
        app.get('/reviews_6', async (req, res)=>{
            const cursor = reviewCollection.find({}).sort({_id:-1}).limit(6);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        //Single user info GET API
        app.get('/user/:email', verifyJWT, async (req, res)=>{
            const decodedEmail = req.decoded.email;
            const email = req.params.email;
            if (email === decodedEmail)
            {
                const query = {email: email};
                const cursor = userCollection.find(query);
                const user = await cursor.toArray();
                res.send(user);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }
        });
        //All user info GET API
        app.get('/userAll/:email', verifyJWT, async (req, res)=>{
            const decodedEmail = req.decoded.email;
            const email = req.params.email;
            if (email === decodedEmail)
            {
                const query = {};
                const cursor = userCollection.find(query);
                const user = await cursor.toArray();
                res.send(user);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }
        });

        //Single Product GET API
        app.get('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        });
        //Orders GET API My Orders
        app.get('/myOrders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const buyer = req.query.buyer;
            if (buyer === decodedEmail) {
                const query = { buyerEmail: buyer };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }
        });
        //Single order GET API
        app.get('/orders/:id', verifyJWT, async(req, res) =>{
          const id = req.params.id;
          const query = {_id: ObjectId(id)};
          const order = await orderCollection.findOne(query);
          res.send(order);
        });
        //Check admin GET API
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.admin;
            res.send({ admin: isAdmin });
          });
        //Products POST API
        app.post('/products', async (req, res)=>{
            const newProduct = req.body;
            const product = await productCollection.insertOne(newProduct);
            res.send(product);
        });
        //Orders POST API
        app.post('/orders', async (req, res)=>{
            const newOrder = req.body;
            const order = await orderCollection.insertOne(newOrder);
            res.send(order);
        });
        //Reviews PUT API
        app.put('/reviews/:email', async (req, res) => {
            const email = req.params.email;
            const newReview = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: newReview,
            };
            const result = await reviewCollection.updateOne(filter, updateDoc, options);
            res.send({ result });
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
        //Update user info PUT API
        app.put('/userUpdate/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send({ result });
          });
        //Make admin PUT API
        app.put('/userAdmin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: {admin: user.admin},
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send({ result });
          });
        //UPdate Order Status PUT API
        app.put('/orders/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updateStatus = req.body;
            const query = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: updateStatus.status
                }
            };
            const result = await orderCollection.updateOne(query, updatedDoc, options);
            res.send(result);
          });
        //Store users PUT API
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
          });
        //Products DELETE API
        app.delete('/products/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const products = await productCollection.deleteOne(query);
            res.send(products);
        })
        //Orders DELETE API
        app.delete('/orders/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const orders = await orderCollection.deleteOne(query);
            res.send(orders);
        })
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