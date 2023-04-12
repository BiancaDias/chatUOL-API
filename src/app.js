import express from "express"
import cors from "cors";
import dotenv from "dotenv"
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';

const app = express();
app.listen(5000, console.log("servidor iniciado na porta 5000"))
app.use(cors());
app.use(express.json());
dotenv.config();

let db;
const mongoCilent = new MongoClient(process.env.DATABASE_URL);

mongoCilent.connect()
    .then(() => db = mongoCilent.db())
    .catch(err => console.log(err.message));

app.post("/participants", (req, res) => {
    db.collection("participants").find().toArray()
        .then((participant) => {
            if (participant.map(p => p.name).includes(req.body.name)) {
                return res.sendStatus(409);
            } else {
                const participant = { name: req.body.name, lastStatus: Date.now() };
                db.collection("participants").insertOne(participant)
                    .then(() => {
                        res.sendStatus(201) //este é da inserção nos nomes de participantes
                        db.collection("messages").insertOne({from: req.body.name, to: "Todos", text: "entra na sala...", type: 'status', time: dayjs().format('HH:mm:ss')})
                            .then(()=>res.sendStatus(201) ) //este é da mensagem
                            .catch(err => res.status(500).send(err.message));
                    })
                    .catch(err => res.status(500).send(err.message));
            }
        }).catch(err => {
            return res.status(500).send(err.message)
        });


})