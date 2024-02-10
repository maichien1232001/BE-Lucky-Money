const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

// Import các model từ các file tương ứng
const System = require('./db');
const User = require('./user');
const Result = require('./result');
const ClickedUser = require('./clicker');

const app = express();
const PORT = 8080;

// Kết nối tới MongoDB
mongoose.connect('mongodb://localhost:27017/lucky', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function () {
  console.log("Connected to MongoDB");

  // Kiểm tra xem hệ thống đã tồn tại chưa, nếu chưa thì tạo mới
  const existingSystem = await System.findOne({});
  if (!existingSystem) {
    const newSystem = new System({
      totalMoney: 700,
      totalUsers: 24,
      zeroCount: 2,
      isFinished: false // Thêm trường isFinished để kiểm tra xem quá trình đã kết thúc chưa
    });

    await newSystem.save();
    console.log("Initial system data created");
  } else {
    console.log("System data already exists");
  }
});

// Áp dụng middleware CORS và bodyParser
app.use(cors());
app.use(bodyParser.json());

// API để lấy giá trị totalMoney
app.get('/total-money', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    res.json({ totalMoney: systemInfo.totalMoney });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API để lấy giá trị totalUser
app.get('/total-users', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    res.json({ totalUsers: systemInfo.totalUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API để lấy thông tin của tất cả người dùng
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Hàm để cập nhật thông tin hệ thống sau mỗi lần random
// Hàm để cập nhật thông tin hệ thống sau mỗi lần random
async function updateSystemInfo(newRandomAmount) {
  try {
    const systemInfo = await System.findOne({});
    let { totalMoney, totalUsers, zeroCount, isFinished } = systemInfo;

    if (isFinished || totalUsers === 0 || totalMoney <= 0) {
      throw new Error("Quá trình random đã kết thúc.");
    }

    let zeroCountIncrement = 0; // Biến để đếm số lượng người nhận 0

    // Nếu random được số tiền 1000 và vẫn còn người nhận tiền
    if (newRandomAmount === 1000 && totalUsers > 0) {
      totalUsers--;
    } else if (newRandomAmount === 0) { // Nếu random được số tiền 0
      if (zeroCount < 2) {
        zeroCount++;
        zeroCountIncrement++;
      }
    } else {
      // Chia số tiền còn lại cho các người dùng
      const amountPerUser = totalMoney / (totalUsers - 3); // Trừ đi 3 vì đã cố định 2 người nhận 0 và 1 người nhận 1000
      await User.updateMany({}, { $inc: { "denomination": amountPerUser } });
    }

    // Cập nhật số tiền cho người nhận 0 và 1000
    await User.updateMany({ "denomination": 0 }, { $inc: { "denomination": 0 } }, { multi: true });
    await User.updateOne({ "denomination": 0 }, { $inc: { "denomination": 1000 } });

    // Cập nhật số tiền cho người nhận 1000
    await User.updateOne({ "denomination": 1000 }, { $inc: { "denomination": newRandomAmount - 1000 } });

    // Giảm số người dùng đi 1
    totalUsers--;
    if(totalUsers === 18){
      newRandomAmount = 0
    }
    // Cập nhật thông tin hệ thống
    totalMoney -= (newRandomAmount - 1000);
    if (totalMoney <= 0 || totalUsers === 0) {
      isFinished = true;
    }
    await System.updateOne({}, { totalMoney, totalUsers, zeroCount, isFinished });

    return newRandomAmount;
  } catch (error) {
    throw error;
  }
}

// API endpoint để lưu thông tin người dùng và kết quả random vào cơ sở dữ liệu
// API endpoint để lưu thông tin người dùng và kết quả random vào cơ sở dữ liệu
app.post('/save-user-result', async (req, res) => {
  try {
    const { name } = req.body;

    // Kiểm tra xem người dùng đã click trước đó chưa
    const existingUser = await ClickedUser.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ message: "You have already clicked before." });
    }

    // Lưu thông tin người dùng vào cơ sở dữ liệu
    const newUser = new ClickedUser({ name });
    await newUser.save();

    // Tiếp tục xử lý và lưu kết quả random vào cơ sở dữ liệu nếu cần

    res.status(200).json({ message: "User information saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// API để thực hiện quá trình random
app.post('/random-update', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    let { totalMoney } = systemInfo;
    let newRandomAmount;

    // Xác định mức giới hạn mới dựa trên số tiền hiện có
    // if (totalMoney < 500000) {
    //   newRandomAmount = Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;
    // } else if (totalMoney < 400000) {
    //   newRandomAmount = Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000;
    // } else if (totalMoney < 300000) {
    //   newRandomAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
    // } else {
    //   newRandomAmount = Math.floor(Math.random() * (200000 - 10000 + 1)) + 10000;
    // }

      newRandomAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
    const newTotalMoney = await updateSystemInfo(newRandomAmount);

    // Lưu kết quả vào MongoDB
    const result = new Result({
      randomAmount: newRandomAmount,
      newTotalMoney: newTotalMoney
    });
    await result.save();

    res.status(200).json({ message: "Random và cập nhật thành công", newRandomAmount, newTotalMoney });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
