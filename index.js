const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// ========== Models ==========
// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Product Schema (باقات الشحن)
const productSchema = new mongoose.Schema({
    name: String,
    amount: Number,
    price: Number,
    image: String,
    isActive: { type: Boolean, default: true }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    playerId: String,
    amount: Number,
    price: Number,
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Order = mongoose.model("Order", orderSchema);

// ========== Routes ==========

// Test Route
app.get("/", (req, res) => {
    res.send("🚀 PUBG Store API Running");
});

// ===== Product Routes =====
// جلب كل المنتجات
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة منتج جديد (Admin)
app.post("/api/products", async (req, res) => {
    try {
        const { name, amount, price, image } = req.body;
        const product = new Product({ name, amount, price, image });
        await product.save();
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تعديل منتج (Admin)
app.put("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف منتج (Admin)
app.delete("/api/products/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== User Routes =====
// تسجيل مستخدم جديد
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "الإيميل موجود بالفعل" });
        }

        const user = new User({ username, email, password });
        await user.save();
        res.json({ success: true, message: "تم التسجيل بنجاح", user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.json({ success: false, message: "بيانات غير صحيحة" });
        }

        res.json({ success: true, message: "تم تسجيل الدخول", user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== Order Routes =====
// إنشاء طلب جديد
app.post("/api/orders", async (req, res) => {
    try {
        const { userId, productId, playerId, amount, price } = req.body;
        const order = new Order({ userId, productId, playerId, amount, price });
        await order.save();
        res.json({ success: true, message: "تم إنشاء الطلب", order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلبات المستخدم
app.get("/api/orders/:userId", async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId })
            .populate('productId');
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== Admin Routes =====
// جلب كل المستخدمين (Admin)
app.get("/api/admin/users", async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب كل الطلبات (للمسؤول)
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'username email')
            .populate('productId', 'name amount price')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث حالة الطلب (مكتمل/ملغي)
app.put("/api/admin/orders/:orderId", async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { status },
            { new: true }
        );
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب
app.delete("/api/admin/orders/:orderId", async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.orderId);
        res.json({ success: true, message: "تم حذف الطلب" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إحصائيات Dashboard
app.get("/api/admin/stats", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const completedOrders = await Order.countDocuments({ status: 'completed' });
        
        const orders = await Order.find({ status: 'completed' });
        const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== إضافة بعض المنتجات الافتراضية =====
async function addDefaultProducts() {
    const count = await Product.countDocuments();
    if (count === 0) {
        const defaultProducts = [
            { name: "64 شدة", amount: 64, price: 45, image: "uc.jpg" },
            { name: "32 شدة", amount: 32, price: 25, image: "uc.jpg" },
            { name: "340 شدة", amount: 340, price: 220, image: "uc.jpg" },
            { name: "690 شدة", amount: 690, price: 430, image: "uc.jpg" },
            { name: "1900 شدة", amount: 1900, price: 1070, image: "uc.jpg" }
        ];
        await Product.insertMany(defaultProducts);
        console.log("✅ Default products added");
        
        const adminExists = await User.findOne({ email: "admin@pubg.com" });
        if (!adminExists) {
            await new User({
                username: "Admin",
                email: "admin@pubg.com",
                password: "admin123",
                isAdmin: true
            }).save();
            console.log("✅ Admin user created (admin@pubg.com / admin123)");
        }
    }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await addDefaultProducts();
});