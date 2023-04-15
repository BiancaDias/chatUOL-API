import express from "express"
import cors from "cors";
import dotenv from "dotenv"
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';
import joi from 'joi';

const app = express();
app.listen(5000, console.log("servidor iniciado na porta 5000"))
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoCilent = new MongoClient(process.env.DATABASE_URL);
try {
    await mongoCilent.connect()
} catch (err) {
    console.log(err.message);
}
const db = mongoCilent.db()

app.post("/participants", async (req, res) => {
    const name = req.body;
    const userSchema = joi.object({ name: joi.string().min(1).required() });
    const validation = userSchema.validate(name, { abortEarly: false });

    if (validation.error) { //verificando se a string é vazia
        return res.sendStatus(422);
    }
    const nameOutObject = req.body.name
    try {
        const exitentParticipant = await db.collection("participants").findOne({ name: nameOutObject })
        if (exitentParticipant) {
            return res.sendStatus(409) //se o nome ja existe
        } else {
            const participant = { name: nameOutObject, lastStatus: Date.now() };
            await db.collection("participants").insertOne(participant)
            await db.collection("messages").insertOne({ from: nameOutObject, to: "Todos", text: "entra na sala...", type: 'status', time: dayjs().format('HH:mm:ss') })
            return res.sendStatus(201)
        }
    } catch (err) {
        res.status(500).send(err.message);
    }

})
app.get("/participants", async (req, res) => {
    try {
        const participant = await db.collection("participants").find().toArray()
        res.send(participant)
    }
    catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/messages", async (req, res) => {
    const from = req.headers.user;
    const message = req.body;
    const userSchema = joi.object({
        to:joi.string().min(1).required(),
        text: joi.string().min(1).required(),
        type: joi.string().min(1).valid('message', 'private_message').required()
    })
    const validation = userSchema.validate(message, { abortEarly: false })
    const { to, text, type } = req.body //validar ainda com joi
    
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
      }
    try {
        const participant = await db.collection("participants").findOne({ name: from })
        if (participant) {
            await db.collection("messages").insertOne({ from, to, text, type, time: dayjs().format('HH:mm:ss') })
            return res.sendStatus(201);
        }
        else {
            return res.sendStatus(422)
        }
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const limit = req.query.limit;
    const quant = limit ? Number(limit) : null;
    console.log(user)
    console.log(limit)
    console.log(quant)

    if(quant <= 0){
        return res.sendStatus(422);
    }
    if (isNaN(Number(limit))) {
        return res.sendStatus(422);
      }

    try {
        const messagesCursor =  db.collection("messages").find({
            $or: [
                { to: "Todos" },
                {to: user  },
                {from: user}
              ]
        })
        let messages = await messagesCursor.toArray();
        if (quant !== null) {
            const last100messages = messages.slice(-1 * quant)
            return res.send(last100messages)
        }else{
            return res.send(messages)
        }
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/status", async (req, res) => {
    const name = req.headers.user;
    if(!name){
        console.log("caiu aqui")
        return res.sendStatus(404)
    }
    const lastStatus = Date.now();
    const updateUser = {name, lastStatus}
    try{
        const findUser = await db.collection("participants").updateOne(
            {name: req.headers.user},
            {$set: updateUser}
        )
        if(findUser.matchedCount === 0){
            return res.sendStatus(404)
        }
        res.sendStatus(200)
    }catch(error){
        res.sendStatus(500)
    }
})


setInterval(async () => {
    try{
        const users = await db.collection("participants").find().toArray();

        const inactiveUsers = users.filter((user) => {
            const time = Date.now();
            const calc = time - 10000;
            return user.lastStatus < new Date(calc);
        });

        for (const user of inactiveUsers) {
            await db.collection("messages").insertOne({ from: user.name, to: "Todos", text:"sai da sala...", type:"status", time: dayjs().format('HH:mm:ss') })
            await db.collection("participants").deleteOne({ _id: user._id });
        }
    }catch(err){
        console.log(err)
    }
}, 15000)