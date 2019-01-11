const Product = require('../models/product');
const Order = require('../models/order');

exports.getProducts = (req, res, next) => {
    Product.find()
    .then(products => {
        res.render('shop/product-list', {
            prods: products, 
            pageTitle: 'All Products', 
            path:'/products',
            isAuthenticated: req.session.isLoggedIn
          });
        })
    .catch(err => {
        console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then((product) => {
        res.render('shop/product-detail', {
            product: product, 
            pageTitle: product.title, 
            path:'/products',
            isAuthenticated: req.session.isLoggedIn
        });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
    Product.find()
    .then(products => {
        res.render('shop/index', {
            prods: products, 
            pageTitle: 'Shop', 
            path:'/',
            isAuthenticated: req.session.isLoggedIn
          });
        })
    .catch(err => {
        console.log(err);
    });
};

exports.getCart = (req, res, next) => {   
     req.session.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {
        
        const products = user.cart.items;
        console.log(products);

            res.render('shop/cart', {
                pageTitle: 'Your Cart', 
                path:'/cart',
                products: products,
                isAuthenticated: req.session.isLoggedIn
            });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {   
    const prodId = req.body.productId;
    Product.findById(prodId)
    .then(product => {
        return  req.session.user.addToCart(product);
    }).then(result => {
        console.log(result);
        res.redirect('/cart');
    })
    .catch(err => {
        console.log(err);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {  
    const prodId = req.body.productId;
     req.session.user.removeFromCart(prodId)
    .then(result => {
        res.redirect('/cart');
    })
    .catch(err => console.log(err));
}; 

exports.postOrder = (req, res, next) => {
     req.session.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {
        console.log(user.cart.items);
        const products = user.cart.items.map(i => {
            return {
                quantity: i.quantity,
                product: {...i.productId._doc}
            }
        });
        const order = new Order({
            user: {
                name:  req.session.user.name,
                userId: req.session.user
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        return  req.session.user.clearCart();        
    })
    .then(() => {
        res.redirect('/orders')
    })
    .catch(err => console.log(err));
}

exports.getOrders = (req, res, next) => {   
    Order.find({"user.userId":  req.session.user._id})
    .then(orders => {
        console.log(orders);
        res.render('shop/orders', {
            pageTitle: 'Your Orders', 
            path:'/orders',
            orders: orders,
            isAuthenticated: req.session.isLoggedIn
            });
    })
    .catch(err => console.log(err));  
};

exports.getCheckout = (req, res, next) => {
        res.render('shop/checkout', {
            pageTitle: 'Checkout', 
            path:'/checkout',
            isAuthenticated: req.session.isLoggedIn
          });
};
