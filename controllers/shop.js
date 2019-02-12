const fs = require('fs');
const path = require('path');
const Product = require('../models/product');
const Order = require('../models/order');

exports.getProducts = (req, res, next) => {
    Product.find()
    .then(products => {
        res.render('shop/product-list', {
            prods: products, 
            pageTitle: 'All Products', 
            path:'/products',
          });
        })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
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
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
};

exports.getIndex = (req, res, next) => {
    Product.find()
    .then(products => {
        res.render('shop/index', {
            prods: products, 
            pageTitle: 'Shop', 
            path:'/'
            // isAuthenticated: req.session.isLoggedIn,
            // csrfToken: req.csrfToken()
          });
        })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
};

exports.getCart = (req, res, next) => {   
     req.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {
        
        const products = user.cart.items;
        console.log(products);

            res.render('shop/cart', {
                pageTitle: 'Your Cart', 
                path:'/cart',
                products: products,
            });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
};

exports.postCart = (req, res, next) => {   
    const prodId = req.body.productId;
    Product.findById(prodId)
    .then(product => {
        return  req.user.addToCart(product);
    }).then(result => {
        console.log(result);
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {  
    const prodId = req.body.productId;
     req.user.removeFromCart(prodId)
    .then(result => {
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
}; 

exports.postOrder = (req, res, next) => {
     req.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {
        const products = user.cart.items.map(i => {
            return {
                quantity: i.quantity,
                product: {...i.productId._doc}
            }
        });
        const order = new Order({
            user: {
                email:  req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        return  req.user.clearCart();        
    })
    .then(() => {
        res.redirect('/orders')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
}

exports.getOrders = (req, res, next) => {   
    Order.find({"user.userId":  req.user._id})
    .then(orders => {
        console.log(orders);
        res.render('shop/orders', {
            pageTitle: 'Your Orders', 
            path:'/orders',
            orders: orders,
            });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });  
};

exports.getCheckout = (req, res, next) => {
        res.render('shop/checkout', {
            pageTitle: 'Checkout', 
            path:'/checkout',
          });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    fs.readFile(invoicePath, (err, data) => {
        if(err) {
            return next(err);
        }
        res.send(data);
    })
}