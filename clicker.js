const mongoose = require('mongoose');

const clickedUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

const ClickedUser = mongoose.model('ClickedUser', clickedUserSchema);

module.exports = ClickedUser;
