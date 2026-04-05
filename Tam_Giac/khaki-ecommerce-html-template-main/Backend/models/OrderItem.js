const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'Orders',
        key: 'id'
      }
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  },
  {
    tableName: 'Order_Items',
    timestamps: false
  }
);

OrderItem.associate = (models) => {
  OrderItem.belongsTo(models.Order, { foreignKey: 'orderId' });
  OrderItem.belongsTo(models.Product, { foreignKey: 'productId' });
};

module.exports = OrderItem;
