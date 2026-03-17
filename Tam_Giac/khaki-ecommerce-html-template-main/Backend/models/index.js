'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const { sequelize } = require('../config/database');
const basename = path.basename(__filename);
const modelFiles = {};

// Đọc tất cả models tự động (tốt best practice)
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    modelFiles[model.name] = model;
  });

// Associations (FK quan hệ)
Object.keys(modelFiles).forEach(modelName => {
  if (modelFiles[modelName].associate) {
    modelFiles[modelName].associate(modelFiles);
  }
});

module.exports = modelFiles;
module.exports.sequelize = sequelize;

