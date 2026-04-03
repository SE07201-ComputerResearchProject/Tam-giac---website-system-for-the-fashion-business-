const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  },
  sku: {
    type: DataTypes.STRING,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  descriptionLongJson: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  imageUrl: DataTypes.STRING,
  galleryJson: DataTypes.TEXT,
  type: DataTypes.STRING,
  badge: DataTypes.STRING,
  city: DataTypes.STRING,
  collectionKey: DataTypes.STRING,
  collectionLabel: DataTypes.STRING,
  material: DataTypes.STRING,
  fit: DataTypes.STRING,
  note: DataTypes.TEXT,
  searchText: DataTypes.TEXT,
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Categories',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

Product.associate = (models) => {
  Product.belongsTo(models.Category, { foreignKey: 'categoryId' });
  Product.hasMany(models.OrderItem, { foreignKey: 'productId' });
};

module.exports = Product;

