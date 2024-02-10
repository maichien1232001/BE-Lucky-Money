const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  randomAmount: Number,
  newTotalMoney: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;
