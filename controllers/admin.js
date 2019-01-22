const Product = require('../models/product');
const { validationResult} = require('express-validator/check');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: false,
      errorMessage: null,
      validationErrors: []
    });
  };

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;  
    const price = req.body.price; 
    const description = req.body.description; 

    // Validate the inputs
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/edit-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const product = new Product({
        title: title, 
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user  // the same as userId: req.user._id
    });
    product.save()
    .then(result => {
        console.log('Created Product');
        res.redirect('/admin/products');
    })
    .catch(err => {
        console.log(err);
    });  
};


exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;  // The return value is always String
                                      // "true" instead of true
    if(!editMode) {   
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product) {
            return res.redirect('/');
        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            hasError: false,
            errorMessage: null,
            validationErrors: []
            });
    })
    .catch(err => console.log(err)); 
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedImageUrl = req.body.imageUrl;  // same as the input name in html
    const updatedPrice = req.body.price; 
    const updatedDescription = req.body.description; 
    Product.findById(prodId)
    .then(product => {
        // Note: toString is required to change the Mongoose ObjectId to string 
        if(product.userId.toString() !== req.user._id.toString())
        {
            return res.redirect('/');
        }
        product.title= updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDescription;
        product.imageUrl = updatedImageUrl;
        return product.save().then(result => {
            console.log('UPDATED PRODUCT');
            res.redirect('/admin/products');
        });
    })    
    .catch(err => console.log(err));
}

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    //Product.findByIdAndRemove(prodId)
    Product.deleteOne({_id: prodId, userId: req.user._id})
    .then(() => {
        console.log('DESTROYED PRODUCT');
        res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
}

exports.getProducts = (req, res, next) => 
{
    Product.find({userId: req.user._id})
    //Product.find()
    // .select('title price -_id')
    // .populate('userId', 'name')  // We could user nested paths: Ex: userId.user
    .then(products => {
        res.render('admin/products', {
            prods: products, 
            pageTitle: 'Admin Products', 
            path:'/admin/products',
            isAuthenticated: req.session.isLoggedIn
          });
        })
    .catch(err => {
        console.log(err);
    });
};
