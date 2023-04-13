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
try{
    await mongoCilent.connect()
}catch(err){
    console.log(err.message);
}
const db = mongoCilent.db()

app.post("/participants", async(req, res) => {
    const name = req.body;
    const userSchema = joi.object({name: joi.string().min(1).required()});
    const validation = userSchema.validate(name, { abortEarly: false });

    if(validation.error){ //verificando se a string é vazia
        return res.sendStatus(422);
    }
    const nameOutObject = req.body.name
    try{
        const exitentParticipant = await db.collection("participants").findOne({name: nameOutObject})
        if(exitentParticipant){
            return res.sendStatus(409) //se o nome ja existe
        }else{
            const participant = { name: nameOutObject, lastStatus: Date.now() };
            await db.collection("participants").insertOne(participant)
            await db.collection("messages").insertOne({from: nameOutObject, to: "Todos", text: "entra na sala...", type: 'status', time: dayjs().format('HH:mm:ss')})
            return res.sendStatus(201)
        }
    }catch (err){
        res.status(500).send(err.message);
    }
        
})
app.get("/participants", async(req, res) =>{
    try{
        const participant = await db.collection("participants").find().toArray()
        res.send(participant)
    }
    catch(err) {
        res.status(500).send(err.message)
    }
})

// app.post("/messages", (req, res) =>{
//     const from = req.header.user;
//     const {to, text, type} = req.body //validar ainda com joi

//     db.collection("participants").find().toArray()
//         .then((participant) => {
//             if (participant.map(p => p.name).includes(from)) {
//                 db.collection("messages").insertOne({from, to, text, type,time: dayjs().format('HH:mm:ss')})
//                     .then(()=>res.sendStatus(201) ) //este é da mensagem
//                     .catch(err => res.status(500).send(err.message));
//                 return res.sendStatus(201);//este é da validação
//             }
//             else{
//                 return res.sendStatus(422)
//             }
//         })
//         .catch(err => res.status(500).send(err.message));
// })

// app.get("/messages", (req, res) => {
//     const user = req.header.user;
//     const limit = req.query;
//     const quant =Number(limit);
//     if(limit){
//         if(/^\d+$/.test(limit)){
//             if(quant === 0 || quant < 0) return res.send(422)
//         }else{
//             res.send(422)
//         }
//     }
//     db.collection("messages").find({
//         $and: [
//           { $or: [{ from: user }, { to: user }] },
//           { to: "Todos" }
//         ]
//       })
//       .then((messages) =>{
//         if(limit){
//             const last100messages = messages.slice(-1 * quant)
//             return res.send(last100messages)
//         }
//         return res.send(messages)
//       })
//       .catch(err => res.status(500).send(err.message));
// })