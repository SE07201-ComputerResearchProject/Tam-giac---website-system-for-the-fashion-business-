const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  paymentMethod: DataTypes.STRING, // 'vnpay', 'cod'
  paymentId: DataTypes.STRING, // VNPay transaction ID
  shippingAddress: DataTypes.JSON, // {street, city, zip, phone}
  vnpayResponse: DataTypes.JSON // Lưu verify response
}, {
  timestamps: true
});

Order.associate = (models) => {
  Order.belongsTo(models.User, { foreignKey: 'userId' });
  Order.hasMany(models.OrderItem, { foreignKey: 'orderId' });
};

module.exports = Order;

