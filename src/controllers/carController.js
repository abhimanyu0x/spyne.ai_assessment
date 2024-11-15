import pkg from 'cloudinary';
const { v2: cloudinary } = pkg;
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import Car from "../models/model.car.js";
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Function to initialize Cloudinary
const initializeCloudinary = () => {
  // Configure Cloudinary
  const config = cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  console.log("Cloudinary Configuration:", {
    cloud_name: config.cloud_name,
    api_key: config.api_key !== undefined ? "API Key Set" : "API Key Missing",
    api_secret: config.api_secret !== undefined ? "Secret Set" : "Secret Missing"
  });

  return cloudinary;
};

// Initialize Cloudinary
const cloudinaryInstance = initializeCloudinary();

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinaryInstance,
  params: {
    folder: "cars",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }]
  }
});

// Configure multer with error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).array('images', 10);

// Modified addCar function with better error handling
export const addCar = async (req, res) => {
  console.log("→ Starting file upload process");
  
  upload(req, res, async (err) => {
    console.log("→ Upload callback started");
    
    if (err) {
      console.error("Upload Error:", err);
      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message
      });
    }

    try {
      console.log("→ Files received:", req.files?.length || 0);
      console.log("→ Request body:", req.body);

      const { title, description, tags } = req.body;
      
      if (!title || !description) {
        console.log("→ Missing required fields");
        return res.status(400).json({
          success: false,
          message: "Title and description are required"
        });
      }

      if (!req.files || req.files.length === 0) {
        console.log("→ No images uploaded");
        return res.status(400).json({
          success: false,
          message: "No images uploaded"
        });
      }

      const imageUrls = req.files.map(file => file.path);
      console.log("→ Image URLs:", imageUrls);

      const newCar = new Car({
        title,
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        images: imageUrls,
        userId: req.user._id
      });

      const savedCar = await newCar.save();
      console.log("→ Car saved successfully:", savedCar._id);

      const response = {
        success: true,
        message: "Car added successfully",
        car: {
          id: savedCar._id,
          title: savedCar.title,
          description: savedCar.description,
          images: savedCar.images,
          tags: savedCar.tags
        }
      };

      console.log("→ Sending response:", response);
      return res.status(201).json(response);

    } catch (error) {
      console.error("Error in addCar:", error);
      return res.status(500).json({
        success: false,
        message: "Error saving car",
        error: error.message
      });
    }
  });
};

// Get list of all cars for a user
export const getUserCars = async (req, res) => {
  try {
    const cars = await Car.find({ userId: req.user._id })
      .sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json({
      success: true,
      count: cars.length,
      cars
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching cars", 
      error: error.message 
    });
  }
};

// Global search for cars by title, description, or tags
export const searchCars = async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const searchQuery = {
      userId: req.user._id,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } }
      ]
    };

    const cars = await Car.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Car.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      count: cars.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      cars
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error searching cars", 
      error: error.message 
    });
  }
};

// Get details of a specific car
export const getCarDetails = async (req, res) => {
  try {
    const car = await Car.findOne({
      _id: req.params.carId,
      userId: req.user._id
    });

    if (!car) {
      return res.status(404).json({ 
        success: false, 
        message: "Car not found" 
      });
    }

    res.status(200).json({
      success: true,
      car
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching car details", 
      error: error.message 
    });
  }
};

// Update car details
export const updateCar = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ 
          success: false, 
          message: "Error uploading files", 
          error: err.message 
        });
      }

      const car = await Car.findOne({
        _id: req.params.carId,
        userId: req.user._id
      });

      if (!car) {
        return res.status(404).json({ 
          success: false, 
          message: "Car not found" 
        });
      }

      // Update images if new files are uploaded
      if (req.files && req.files.length > 0) {
        // Delete old images from Cloudinary
        for (const imageUrl of car.images) {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
        car.images = req.files.map(file => file.path);
      }

      // Update other fields
      if (req.body.title) car.title = req.body.title;
      if (req.body.description) car.description = req.body.description;
      if (req.body.tags) car.tags = req.body.tags.split(',').map(tag => tag.trim());

      await car.save();

      res.status(200).json({
        success: true,
        message: "Car updated successfully",
        car
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Error updating car", 
        error: error.message 
      });
    }
  });
};

// Delete a car
export const deleteCar = async (req, res) => {
  try {
    const car = await Car.findOne({
      _id: req.params.carId,
      userId: req.user._id
    });

    if (!car) {
      return res.status(404).json({ 
        success: false, 
        message: "Car not found" 
      });
    }

    // Delete images from Cloudinary
    for (const imageUrl of car.images) {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Car.findByIdAndDelete(req.params.carId);

    res.status(200).json({
      success: true,
      message: "Car deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error deleting car", 
      error: error.message 
    });
  }
};