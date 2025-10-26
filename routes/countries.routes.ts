import express from "express"
import { getAllCountries, refreshData,getAllCountryByName, deleteCountryByName, getStatus,generateSummaryImage } from "../controllers/countries.controller"

const router = express.Router()


router.get("/countries", getAllCountries)
router.post("/countries/refresh", refreshData)

router.get("/status", getStatus)
router.get("/countries/image",generateSummaryImage)


router.get("/countries/:name", getAllCountryByName)
router.delete("/countries/:name", deleteCountryByName)

export default router