const mongoose = require('mongoose');

const systemSchema = new mongoose.Schema({
  totalMoney: Number,
  totalUsers: Number,
  zeroCount: Number
});

const System = mongoose.model('System', systemSchema);

module.exports = System;
