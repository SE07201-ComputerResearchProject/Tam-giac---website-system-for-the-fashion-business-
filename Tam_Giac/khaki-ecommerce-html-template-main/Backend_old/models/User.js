const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: { // Hash bcrypt tự động
    type: DataTypes.STRING,
    allowNull: false
  },
  fullName: DataTypes.STRING,
  phone: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  mfaSecret: DataTypes.STRING, // TOTP secret cho MFA
  mfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  googleId: DataTypes.STRING, // OAuth
  lastLogin: DataTypes.DATE
}, {
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12); // Argon2 nếu cần mạnh hơn
      }
    }
  }
});

// Method verify password (chống timing attack)
User.prototype.validPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Association
User.associate = (models) => {
  User.hasMany(models.Order, { foreignKey: 'userId' });
};

module.exports = User;

