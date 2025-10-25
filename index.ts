import express from "express"
import dotenv from "dotenv"
import countryRoute from "./routes/countries.routes"
import { initializeDB } from "./config/initDB"
dotenv.config()


const app = express()

await initializeDB()


// Middleware
app.use(express.json())
app.use("/",countryRoute)




app.listen(process.env.PORT,()=>{
    console.log(`Server is running on ${process.env.PORT}`)
})