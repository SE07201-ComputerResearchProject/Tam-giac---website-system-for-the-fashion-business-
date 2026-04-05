const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShippingAddress = sequelize.define(
  'ShippingAddress',
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
    addressLine: {
      type: DataTypes.STRING,
      field: 'address_line'
    },
    city: DataTypes.STRING,
    country: DataTypes.STRING,
    postalCode: {
      type: DataTypes.STRING,
      field: 'postal_code'
    }
  },
  {
    tableName: 'Shipping_Addresses',
    timestamps: false
  }
);

ShippingAddress.associate = (models) => {
  ShippingAddress.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = ShippingAddress;
