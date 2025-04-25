const { Sequelize } = require('sequelize');

// Creates a local SQLite database file (tracker.sqlite)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './tracker.sqlite',
  logging: false,
});

module.exports = sequelize;
