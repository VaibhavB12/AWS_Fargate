require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    userId: mongoose.Schema.Types.ObjectId
});
const Product = mongoose.model('Product', productSchema);

// Register
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.json({ message: "User registered" });
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware to verify token
const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access denied" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(400).json({ error: "Invalid token" });
    }
};

// Add Product
app.post('/products', auth, async (req, res) => {
    const product = new Product({ ...req.body, userId: req.user.userId });
    await product.save();
    res.json({ message: "Product added" });
});

// List All Products
app.get('/products', auth, async (req, res) => {
    try {
        const products = await Product.find({ userId: req.user.userId });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Delete Product
app.delete('/products/:id', auth, async (req, res) => {
    await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: "Product deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
