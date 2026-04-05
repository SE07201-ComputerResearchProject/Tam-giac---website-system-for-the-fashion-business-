const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: DataTypes.STRING
  },
  {
    tableName: 'Product_Categories',
    timestamps: false
  }
);

Category.associate = (models) => {
  Category.hasMany(models.Product, { foreignKey: 'categoryId' });
};

module.exports = Category;
