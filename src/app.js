import express from "express"
import cors from "cors";

const app = express();
app.listen(5000, console.log("servidor iniciado na porta 5000"))
app.use(cors());
app.use(express.json());