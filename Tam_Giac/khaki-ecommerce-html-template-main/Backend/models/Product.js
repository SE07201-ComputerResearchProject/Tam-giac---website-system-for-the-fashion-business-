const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
      references: {
        model: 'Product_Categories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.STRING,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      defaultValue: sequelize.literal('GETDATE()')
    }
  },
  {
    tableName: 'Products',
    timestamps: false
  }
);

Product.associate = (models) => {
  Product.belongsTo(models.Category, { foreignKey: 'categoryId' });
  Product.hasMany(models.ProductImage, { foreignKey: 'productId' });
  Product.hasMany(models.OrderItem, { foreignKey: 'productId' });
};

module.exports = Product;
