const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    }
  },
  {
    tableName: 'Product_Images',
    timestamps: false
  }
);

ProductImage.associate = (models) => {
  ProductImage.belongsTo(models.Product, { foreignKey: 'productId' });
};

module.exports = ProductImage;
