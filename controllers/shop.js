const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit'); // used to create pdf files (invoice)

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