const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_price'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      defaultValue: sequelize.literal('GETDATE()')
    }
  },
  {
    tableName: 'Orders',
    timestamps: false
  }
);

Order.associate = (models) => {
  Order.belongsTo(models.User, { foreignKey: 'userId' });
  Order.hasMany(models.OrderItem, { foreignKey: 'orderId' });
};

module.exports = Order;
