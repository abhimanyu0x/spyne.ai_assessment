import User from "../models/model.user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // Changed to bcryptjs

export const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = new User({ name, email, password });
        await user.save();

        // Generate token after registration
        const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: "1h" });
        
        res.status(201).json({ message: "User registered successfully", token });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: "Error logging in", error: err.message });
    }
};