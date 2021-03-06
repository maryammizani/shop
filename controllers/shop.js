const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit'); // used to create pdf files (invoice)
const key = require('../key');

// Stripe: Set your secret key: remember to change this to your live secret key in production
// Stripe: See your keys here: https://dashboard.stripe.com/account/apikeys
const stripe = require("stripe")(key.STRIPE_SECRET_KEY);  // This is the secret Key, not the publishable key
//const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;   

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find()
    .countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
        .skip((page -1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
        res.render('shop/product-list', {
            prods: products, 
            pageTitle: 'Products', 
            path:'products',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page -1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
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
    const page = +req.query.page || 1;
    let totalItems;
    Product.find()
    .countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
        .skip((page -1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
        res.render('shop/index', {
            prods: products, 
            pageTitle: 'Shop', 
            path:'/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page -1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
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

exports.getCheckout = (req, res, next) => { 
    req.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {      
        const products = user.cart.items;
        let total = 0;
        products.forEach(p => {
            total += p.quantity * p.productId.price;
        });
        console.log(products);
            res.render('shop/checkout', {
            pageTitle: 'Checkout', 
            path:'/checkout',
            products: products,
            stripe_public_key: key.STRIPE_PUBLIC_KEY,
            totalSum: total
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
}

exports.postOrder = (req, res, next) => {
    // Token is created using Checkout or Elements!
    // Get the payment token ID submitted by the form:
    const token = req.body.stripeToken; // Using Express
    let totalSum = 0;

    req.user
    .populate('cart.items.productId')    // doesn't return a promise
    .execPopulate()  // returns a promise
    .then(user => {       
        user.cart.items.forEach(p => {
            totalSum += p.quantity * p.productId.price;
        });        
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
        const charge = stripe.charges.create({ // This will send a req to stripe servers and charge our payment method
            amount: totalSum * 100,
            currency: 'cad',
            description: 'Order', 
            source: token,
            metadata: {order_id: result._id.toString()} // save the created order ID in stipe
        });
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

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
    .then(order => {
        if(!order) {
            return next(new Error('No order found.'));
        }
        if(order.user.userId.toString() !== req.user._id.toString())
        {
            return next(new Error('Unauthorized'))
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition', 
            'inline; filename="' + invoiceName + '"');

        // Create the PDF file on the fly
        const pdfDoc = new PDFDocument(); //pdfDoc is a readable stream
        // pipe pdfDoc into a writable file stream (also creates the pdf on the server)       
        pdfDoc.pipe(fs.createWriteStream(invoicePath));     
        pdfDoc.pipe(res);
        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        }); 
        pdfDoc.text('------------------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfDoc.fontSize(14).text(
                prod.product.title + ' - ' + 
                prod.quantity + ' x ' + '$' +
                prod.product.price);
        });  
        pdfDoc.text('------------------------------');
        pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);
        pdfDoc.end();

        // Preload Data into memory (use only for small files)
        // fs.readFile(invoicePath, (err, data) => {
        //     if(err) {
        //         return next(err);
        //     }
        //     res.setHeader('Content-Type', 'application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
        //     //res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"');
        //     res.send(data);
        // })

        // Stream data instead of preloading it
        //const file = fs.createReadStream(invoicePath);  // allows reading the file chunk by chunk
        //file.pipe(res); 
    })
    .catch(err => next(err));
}