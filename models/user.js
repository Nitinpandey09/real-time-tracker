const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const User = sequelize.define('User', {
  username: DataTypes.STRING,
  avatar: DataTypes.STRING,
  isAdmin: DataTypes.BOOLEAN
});

module.exports = User;
