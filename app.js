const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
//const expressHbs = require('express-handlebars');
const errorController = require('./controllers/error');
const sequelize = require('./util/database');
const Product = require('./models/product');
const User = require('./models/user');
const Cart = require('./models/cart');
const CartItem = require('./models/cart-item');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

// db.execute('SELECT * FROM products')
// .then((result) => {
//     console.log(result[0], result[1]);
// })
// .catch(err => {
//     console.group(err);
// });

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    User.findByPk(1)
    .then(user => {
        // user is a seqelize obj, not a js obj with key//values
        // we can execute methods like destroy on it 
        req.user = user;  
        next();
    })
    .catch(err => console.log(err));
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

// Product/User Relations
Product.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
User.hasMany(Product);  // Optional

// Cart/User Relations
User.hasOne(Cart);
Cart.belongsTo(User);  // Optional

// Cart/Product Relations
Cart.belongsToMany(Product, {through: CartItem});
Product.belongsToMany(Cart, {through: CartItem});

//sequelize.sync({ force: true })
sequelize.sync()
.then(result => {
    return User.findByPk(1); 
})
.then(user => {
    if(!user) {
        return User.create({
            name: 'Maryam',
            email: 'test@test.com'
        });
    }
    //return Promise.resolve(user);
    return user;
})
.then(user => {
    user.getCart().then(cart => {
        if(!cart)
        {
            user.createCart();
        }
        return user.getCart();  
    })   
}) 
.then(cart => {
    app.listen(3000);
})
.catch(err => {
    console.log(err);
});


