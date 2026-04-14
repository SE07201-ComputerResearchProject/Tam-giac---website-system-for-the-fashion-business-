const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash'
    },
    fullName: {
      type: DataTypes.STRING,
      field: 'full_name'
    },
    phone: DataTypes.STRING,
    tel: DataTypes.STRING,
    companyName: {
      type: DataTypes.STRING,
      field: 'company_name'
    },
    country: DataTypes.STRING,
    city: DataTypes.STRING,
    address: {
      type: DataTypes.STRING,
      field: 'address_line'
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  },
  {
    tableName: 'Users',
    timestamps: false
  }
);

User.associate = (models) => {
  User.hasMany(models.Order, { foreignKey: 'userId' });
  User.hasMany(models.ShippingAddress, { foreignKey: 'userId' });
};

module.exports = User;
