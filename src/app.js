// Server initialization
const port = 6969
const path = require("path")
const axios = require("axios")
const moment = require("moment")
const express = require("express");
const cors = require("cors");

const app = express();

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "./views"))
app.use(express.json())
app.use(cors())
// UNITEC (Odoo) Config Initialization
var odoo = {
    host: "https://unitec.pucesd.edu.ec/jsonrpc",
    username: "bot_tecnico",
    db: "pucesd",
    password: "bot_tecnico"
}
const url = odoo.host

async function json_rpc(url, method, params) {
    const data = {
        jsonrpc: "2.0",
        method,
        params,
        id: Math.floor(Math.random() * 1000000)
    }

    const res = await axios.post(url, data, { "Content-Type": "application/json" })
    return res.data.result
}

async function call(url, service, method, ...args) {
    return await json_rpc(url, "call", { service, method, args })
}

async function login() {
    const uid = await call(url, "common", "login", odoo.db, odoo.username, odoo.password);
    return uid;
}

async function getTime(id) {
    const uid = await login()
    const result = await call(url, "object", "execute", odoo.db, uid, odoo.password, "racetime.detalle_marcacion", "search_read", [['id_marcacion', '=', id]], ["fecha_hora", "emp_code", "empleado_id"])
    return result;
}

async function updateTime(id, date) {
    const uid = await login()
    const result = await call(url, "object", "execute", odoo.db, uid, odoo.password, "racetime.detalle_marcacion", "write", [id], { fecha_hora: date })
    console.log(date);
    return result;
}

// Calculate times
async function calculateTime(id, date) {
    const uid = await login()
    const result = await call(url, "object", "execute", odoo.db, uid, odoo.password, "racetime.detalle_marcacion", "write", [id], { fecha_hora: date })
    
    return result;
}

// Main Route
app.get("/", (req, res) => {
    res.render("index")
});


// Database Conn Initialization

const { Sequelize, QueryTypes } = require("sequelize");
const sequelize = new Sequelize({
    dialect: "mssql",
    host: "192.168.170.250",
    database: "BIOTIME",
    username: "Bio",
    password: "BioTime@"
})

app.post("/get_times", async (req, res) => {

    const data = req.body;
    try {

        const records = await sequelize.query(`SELECT id, punch_time, emp_code FROM iclock_transaction WHERE emp_code = ${data.emp_code} AND punch_time >= '${data.date} 00:00:00' AND punch_time <= '${data.date} 23:59:59';`, { type: QueryTypes.SELECT });
        res.send(records)
    } catch (error) {
        console.log(error);
    }
});

app.post("/update_times", async (req, res) => {
    const data = req.body;
    try {
        const [result, metadata] = await sequelize.query(`UPDATE iclock_transaction SET punch_time = '${data.date}' where id = ${data.record_id}; `);

        // Update Odoo
        const rec_id = await getTime(data.record_id, data.date)
        const response = await updateTime(rec_id[0].id, moment(data.date).add(5, "hours").format("Y-MM-DD HH:mm:ss"));

        if (response) {
            res.send({ rows: metadata })
        }else{
            res.send({msg:"Pasó algo mi bro"})
        }

    } catch (error) {
        console.log(error)
    }
})

app.listen(6969, () => {
    console.log("Server Listening at", port);
});