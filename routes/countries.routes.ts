import express from "express"
import { getAllCountries, refreshData,getAllCountryByName, deleteCountryByName, getStatus } from "../controllers/countries.controller"

const router = express.Router()

router.get("/countries", getAllCountries)
router.post("/countries/refresh", refreshData)

router.get("/countries/status", getStatus)
// router.get("/countries/image")


router.get("/countries/:name", getAllCountryByName)
router.delete("/countries/:name", deleteCountryByName)

export default router