const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function addAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // شوف كل المستخدمين الموجودين
        const allUsers = await User.find();
        console.log('\n📋 All users in database:');
        if (allUsers.length === 0) {
            console.log('No users found');
        } else {
            allUsers.forEach(u => {
                console.log(`- ${u.email} (Admin: ${u.isAdmin})`);
            });
        }

        // شوف لو الأدمن موجود
        const existingAdmin = await User.findOne({ email: 'admin@pubg.com' });
        if (existingAdmin) {
            console.log('\n✅ Admin already exists:');
            console.log('Email:', existingAdmin.email);
            console.log('Password:', 'admin123');
            console.log('Is Admin:', existingAdmin.isAdmin);
            
            // لو مش Admin، خليه Admin
            if (!existingAdmin.isAdmin) {
                existingAdmin.isAdmin = true;
                await existingAdmin.save();
                console.log('✅ User updated to Admin');
            }
        } else {
            // لو مش موجود، أضيفه
            console.log('\n📝 Creating new admin...');
            const admin = new User({
                username: 'Admin',
                email: 'admin@pubg.com',
                password: 'admin123',
                isAdmin: true
            });
            await admin.save();
            console.log('✅ Admin created successfully');
        }

        // اعرض كل المستخدمين بعد التعديل
        const updatedUsers = await User.find();
        console.log('\n📋 Updated users list:');
        updatedUsers.forEach(u => {
            console.log(`- ${u.email} (Admin: ${u.isAdmin})`);
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

addAdmin();