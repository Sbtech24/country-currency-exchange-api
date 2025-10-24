import express from "express"
import dotenv from "dotenv"

dotenv.config()


const app = express()

// await initializeDatabase()


// Middleware
app.use(express.json())

app.listen(process.env.PORT,()=>{
    console.log(`Server is running on ${process.env.PORT}`)
})