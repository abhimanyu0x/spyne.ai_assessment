import express from "express";
import * as carController from "../controllers/carController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

// Remove '/cars' from routes since we're already using '/api/cars' in app.js
router.post('/', authMiddleware, carController.addCar);
router.get('/', authMiddleware, carController.getUserCars);
router.get('/search', authMiddleware, carController.searchCars);
router.get('/:carId', authMiddleware, carController.getCarDetails);
router.put('/:carId', authMiddleware, carController.updateCar);
router.delete('/:carId', authMiddleware, carController.deleteCar);

export default router;