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

const uri = 'mongodb+srv://luckymoney:1232001Truc@cluster0.hcqcnwe.mongodb.net/'

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const existingSystem = await System.findOne({});
    if (!existingSystem) {
      const newSystem = new System({
        totalMoney: 700,
        totalUsers: 24,
        zeroCount: 2,
        isFinished: false
      });
      await newSystem.save();
      console.log("Initial system data created");
    } else {
      console.log("System data already exists");
    }
    console.log('Connected to MongoDB Atlas');
  })
  .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

app.use(cors());
app.use(bodyParser.json());

app.get('/total-money', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    res.json({ totalMoney: systemInfo.totalMoney });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/total-users', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    res.json({ totalUsers: systemInfo.totalUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function updateSystemInfo(newRandomAmount) {
  try {
    const systemInfo = await System.findOne({});
    let { totalMoney, totalUsers, zeroCount, isFinished } = systemInfo;

    if (isFinished || totalUsers === 0 || totalMoney <= 0) {
      throw new Error("Quá trình random đã kết thúc.");
    }

    let zeroCountIncrement = 0; 

    if (newRandomAmount === 1000 && totalUsers > 0) {
      totalUsers--;
    } else if (newRandomAmount === 0) {
      if (zeroCount < 2) {
        zeroCount++;
        zeroCountIncrement++;
      }
    } else {
      const amountPerUser = totalMoney / (totalUsers - 3);
      await User.updateMany({}, { $inc: { "denomination": amountPerUser } });
    }

    await User.updateMany({ "denomination": 0 }, { $inc: { "denomination": 0 } }, { multi: true });
    await User.updateOne({ "denomination": 0 }, { $inc: { "denomination": 1000 } });

    await User.updateOne({ "denomination": 1000 }, { $inc: { "denomination": newRandomAmount - 1000 } });

    totalUsers--;
    if(totalUsers === 18){
      newRandomAmount = 0
    }
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

app.post('/save-user-result', async (req, res) => {
  try {
    const { name } = req.body;

    const existingUser = await ClickedUser.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ message: "You have already clicked before." });
    }

    const newUser = new ClickedUser({ name });
    await newUser.save();

    res.status(200).json({ message: "User information saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/random-update', async (req, res) => {
  try {
    const systemInfo = await System.findOne({});
    let newRandomAmount;

      newRandomAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
    const newTotalMoney = await updateSystemInfo(newRandomAmount);
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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
