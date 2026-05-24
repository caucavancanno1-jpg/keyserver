const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// MẬT KHẨU ADMIN (Nhớ đổi chuỗi này bảo mật hơn)
const ADMIN_PASSWORD = "cuongbypasslogin"; 

// Link kết nối MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://caucavancanno1_db_user:bypassff@cuong.20cjz2j.mongodb.net/?appName=Cuong
    ";

console.log("==================================================");
console.log("⏳ [HỆ THỐNG] Đang khởi động máy chủ...");
console.log("==================================================");

// Kết nối Cơ sở dữ liệu kèm Log chi tiết
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ [DATABASE] Kết nối MongoDB Atlas THÀNH CÔNG!");
    })
    .catch(err => {
        console.error("❌ [DATABASE] LỖI KẾT NỐI:", err.message);
        console.error("👉 Mẹo: Hãy kiểm tra IP 0.0.0.0/0 trên MongoDB Atlas.");
    });

// Cấu trúc lưu trữ Key
const KeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    expire_at: { type: Date, required: true }
});
const KeyModel = mongoose.model('Key', KeySchema);

// 1. LOG CHI TIẾT KHI KHÁCH HÀNG CHECK KEY
app.get('/check', async (req, res) => {
    const user_key = req.query.key;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    console.log(`\n🔔 [CHECK KEY] Có yêu cầu kiểm tra từ IP: ${ip}`);

    if (!user_key) {
        console.log("⚠️ [CHECK KEY] Thất bại: Người dùng gửi yêu cầu trống.");
        return res.send("Vui lòng nhập KEY!");
    }

    try {
        const findKey = await KeyModel.findOne({ key: user_key });
        
        if (!findKey) {
            console.log(`❌ [CHECK KEY] Từ chối: Key [${user_key}] không tồn tại.`);
            return res.send("KEY_NOT_FOUND");
        }

        const now = new Date();
        if (now > findKey.expire_at) {
            console.log(`🗑️ [CHECK KEY] Hết hạn: Đang xóa Key quá hạn [${user_key}] khỏi hệ thống.`);
            await KeyModel.deleteOne({ key: user_key });
            return res.send("KEY_EXPIRED");
        }

        // Tính thời gian còn lại (phút) để in ra log
        const minutesLeft = Math.round((findKey.expire_at - now) / 1000 / 60);
        console.log(`✅ [CHECK KEY] Thành công: Key [${user_key}] hợp lệ. Còn lại: ${minutesLeft} phút.`);
        return res.send("SUCCESS");

    } catch (error) {
        console.error("💥 [CHECK KEY] Lỗi xử lý hệ thống:", error.message);
        return res.send("SERVER_ERROR");
    }
});

// 2. LOG CHI TIẾT KHI ADMIN TẠO RANDOM KEY 1 NGÀY
app.get('/generate', async (req, res) => {
    const password = req.query.pwd;
    const custom_key = req.query.key;
    const expire_string = req.query.expire;

    console.log("\n🛠️ [ADMIN ACTION] Nhận lệnh yêu cầu tạo Key từ Script.");

    // Kiểm tra mật khẩu Admin
    if (!password || password !== ADMIN_PASSWORD) {
        console.log("🚨 [ADMIN ACTION] CẢNH BÁO: Có người nhập sai mật khẩu Admin hoặc cố tình hack cổng tạo!");
        return res.status(403).send("QUYEN_TRUY_CAP_BI_TU_CHOI");
    }

    if (!custom_key || !expire_string) {
        console.log("⚠️ [ADMIN ACTION] Thất bại: Thiếu tham số truyền lên dữ liệu.");
        return res.send("THIEU_THAM_SO");
    }

    try {
        const expireDate = new Date(parseInt(expire_string) * 1000);
        
        const newKey = new KeyModel({
            key: custom_key,
            expire_at: expireDate
        });
        await newKey.save();

        console.log(`✨ [ADMIN ACTION] Thành công: Đã tạo Key [${custom_key}]`);
        console.log(`⏳ Hạn dùng cụ thể: ${expireDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ VN)`);
        
        return res.send("SUCCESS_GENERATE");
    } catch (error) {
        console.error("💥 [ADMIN ACTION] Không thể lưu Key vào database:", error.message);
        return res.send("GENERATE_FAILED");
    }
});

// Kích hoạt cổng chạy kèm thông báo trực quan
app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`🚀 [HỆ THỐNG] MÁY CHỦ LIVE THÀNH CÔNG TẠI CỔNG: ${PORT}`);
    console.log("==================================================");
});
