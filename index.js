const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cors());
dotenv.config();

const uri = `mongodb+srv://${process.env.Police_DB}:${process.env.Police_Pass}@cluster0.haqk7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const usersInfo = client.db("PoliceData").collection("users");
  try {
    //create user
    app.post("/users", async (req, res) => {
      const data = req.body;
      const result = await usersInfo.insertOne(data);
      res.send(result);
    });

    //update user by Email
    app.put("/users/:email", async (req, res) => {
      const { image, aboutData, experienceData, educationInfo } = req.body;
      const email = req.params.email;
      const updateDoc = { $set: {} };

      // For single fields
      if (image) updateDoc.$set.profilePic = image;
      if (aboutData) updateDoc.$set.aboutInfo = aboutData;
      // For experience data (array)
      if (experienceData) {
        updateDoc.$push = {
          experienceData: {
            $each: [experienceData],
            $position: 0, // Adds at beginning of array
          },
        };
      }
      if (educationInfo) {
        updateDoc.$push = {
          educationInfo: {
            $each: [educationInfo],
            $position: 0, // Adds at beginning of array
          },
        };
      }
      try {
        const result = await usersInfo.updateOne({ email }, updateDoc, {
          upsert: true,
        });
        res.status(200).json({
          success: true,
          updatedFields: Object.keys(updateDoc.$set || {}).concat(
            Object.keys(updateDoc.$push || {})
          ),
        });
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({
          success: false,
          error: "Update failed",
          details: error.message,
        });
      }
    });

    //single experience added
    app.put("/users/experience/:email", async (req, res) => {
      const email = req.params.email;
      const { experienceIndex, updatedExperience } = req.body;

      const query = { email };
      const user = await usersInfo.findOne(query);

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      const updateField = `experienceData.${experienceIndex}`;

      const updateDoc = {
        $set: {
          [updateField]: updatedExperience,
        },
      };

      try {
        const result = await usersInfo.updateOne(query, updateDoc);
        res.send(result);
      } catch (err) {
        console.error("Update failed:", err);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    //single experience deleted
    app.delete("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const index = parseInt(req.query.index); // get index from query string
      console.log(userId, index);

      try {
        const user = await usersInfo.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        const updatedExperience = user.experienceData || [];
        updatedExperience.splice(index, 1); // remove item at index

        const result = await usersInfo.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { experienceData: updatedExperience } }
        );

        res.send({ success: true, message: "Experience removed", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Delete failed" });
      }
    });

    // get a single user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersInfo.findOne({ email });
      res.send(result);
    });

    app.get("/users/modal/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersInfo.findOne({ email });
      res.send(result);
    });

    //get all users for info
    // app.get('/users/update/:email', async(req, res)=>{
    //   const email = req.params.email;
    //   const result = await usersInfo.findOne({email});
    //   res.send(result)
    // })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The Police server is Running now!");
});

app.listen(port, () => {
  console.log(`The police server is Running on port ${port}`);
});
