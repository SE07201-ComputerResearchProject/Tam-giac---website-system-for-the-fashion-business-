const express = require('express');
const session = require('express-session');
const Sequelize = require('sequelize');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

// Khởi tạo Express app
const app = express();
app.use(express.json());

// Kết nối Redis
const redisClient = redis.createClient();
redisClient.on('error', (err) => console.error('Redis error:', err));

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'fashion_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 3600000 }
}));

// Kết nối SQL Server qua Sequelize
const sequelize = new Sequelize('fashiondb', 'username', 'password', {
    host: 'localhost',
    dialect: 'mssql',
    dialectOptions: {
        options: {
            encrypt: true
        }
    }
});

// Định nghĩa các model
const User = sequelize.define('User', {
    username: { type: Sequelize.STRING, unique: true },
    password: Sequelize.STRING
});

const Product = sequelize.define('Product', {
    name: Sequelize.STRING,
    price: Sequelize.FLOAT,
    stock: Sequelize.INTEGER
});

const Cart = sequelize.define('Cart', {
    userId: Sequelize.INTEGER
});

const CartItem = sequelize.define('CartItem', {
    cartId: Sequelize.INTEGER,
    productId: Sequelize.INTEGER,
    quantity: Sequelize.INTEGER
});

const Order = sequelize.define('Order', {
    userId: Sequelize.INTEGER,
    total: Sequelize.FLOAT,
    status: Sequelize.STRING
});

// Thiết lập quan hệ
User.hasOne(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.hasMany(CartItem, { foreignKey: 'cartId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Khởi tạo DB
sequelize.sync({ alter: true })
    .then(() => console.log('Đã đồng bộ DB!'))
    .catch(err => console.error('Lỗi đồng bộ DB:', err));

// API: Đăng ký người dùng
app.post('/user/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.create({ username, password });
        res.json({ message: 'Đăng ký thành công!', userId: user.id });
    } catch (err) {
        res.status(400).json({ error: 'Tên đăng nhập đã tồn tại hoặc dữ liệu không hợp lệ!' });
    }
});

// API: Đăng nhập
app.post('/user/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username, password } });
        if (!user) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu!' });
        req.session.userId = user.id;
        res.json({ message: 'Đăng nhập thành công!', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi đăng nhập!' });
    }
});

// API: Thêm sản phẩm
app.post('/product', async (req, res) => {
    const { name, price, stock } = req.body;
    try {
        const product = await Product.create({ name, price, stock });
        res.json({ message: 'Thêm sản phẩm thành công!', product });
    } catch (err) {
        res.status(400).json({ error: 'Lỗi thêm sản phẩm!' });
    }
});

// API: Lấy danh sách sản phẩm
app.get('/product', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy sản phẩm!' });
    }
});

// API: Sửa sản phẩm
app.put('/product/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, stock } = req.body;
    try {
        const product = await Product.findByPk(id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
        product.name = name ?? product.name;
        product.price = price ?? product.price;
        product.stock = stock ?? product.stock;
        await product.save();
        res.json({ message: 'Cập nhật sản phẩm thành công!', product });
    } catch (err) {
        res.status(400).json({ error: 'Lỗi cập nhật sản phẩm!' });
    }
});

// API: Xóa sản phẩm
app.delete('/product/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByPk(id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
        await product.destroy();
        res.json({ message: 'Xóa sản phẩm thành công!' });
    } catch (err) {
        res.status(400).json({ error: 'Lỗi xóa sản phẩm!' });
    }
});

// API: Thêm vào giỏ hàng
app.post('/cart/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        let cart = await Cart.findOne({ where: { userId } });
        if (!cart) cart = await Cart.create({ userId });
        let item = await CartItem.findOne({ where: { cartId: cart.id, productId } });
        if (item) {
            item.quantity += quantity;
            await item.save();
        } else {
            await CartItem.create({ cartId: cart.id, productId, quantity });
        }
        res.json({ message: 'Thêm vào giỏ thành công!' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi thêm vào giỏ!' });
    }
});

// API: Tính tiền
app.post('/cart/checkout', async (req, res) => {
    const { userId } = req.body;
    try {
        const cart = await Cart.findOne({ where: { userId }, include: [CartItem] });
        if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
        let total = 0;
        for (const item of cart.CartItems) {
            const product = await Product.findByPk(item.productId);
            total += product.price * item.quantity;
        }
        res.json({ total });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi tính tiền!' });
    }
});

// API: Xác nhận đơn hàng
app.post('/order/confirm', async (req, res) => {
    const { userId } = req.body;
    try {
        const cart = await Cart.findOne({ where: { userId }, include: [CartItem] });
        if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
        let total = 0;
        for (const item of cart.CartItems) {
            const product = await Product.findByPk(item.productId);
            if (product.stock < item.quantity) return res.status(400).json({ error: 'Sản phẩm hết hàng!' });
            total += product.price * item.quantity;
            product.stock -= item.quantity;
            await product.save();
        }
        await Order.create({ userId, total, status: 'confirmed' });
        await CartItem.destroy({ where: { cartId: cart.id } });
        res.json({ message: 'Xác nhận đơn thành công!' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xác nhận đơn!' });
    }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});