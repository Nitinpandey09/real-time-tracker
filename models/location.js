const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Location = sequelize.define('Location', {
  userId: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  timestamp: DataTypes.DATE
});

module.exports = Location;
