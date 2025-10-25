import dotevn from "dotenv"
import {Pool} from "pg"

dotevn.config()

const pool  = new Pool({
    connectionString:process.env.DATABSE_URL,
    ssl:{
        rejectUnauthorized:false
    }
})

pool.connect()
  .then(() => console.log(" Database connected successfully"))
  .catch((err) => console.error(" Database connection error:", err));


export default pool