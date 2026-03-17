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
    const exported = require(path.join(__dirname, file));

    // Support both Sequelize-CLI style model factories and direct model exports.
    // - Factory style: module.exports = (sequelize, DataTypes) => { ...; return Model; }
    // - Direct style (this codebase): module.exports = sequelize.define(...)
    const model =
      typeof exported === 'function' && exported.length >= 2
        ? exported(sequelize, Sequelize.DataTypes)
        : exported;

    if (!model || !model.name) {
      throw new Error(`Invalid model export in ${file}`);
    }

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

