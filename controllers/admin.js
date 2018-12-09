const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
    //res.sendFile(path.join(rootDir, 'views', 'add-product.html'));
    res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false
    });
  };

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;  // same as the input name in html
    const price = req.body.price; 
    const description = req.body.description; 
    const product = new Product(title, imageUrl, description, price);
    product.save();
    res.redirect('/');
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;  // The return value is always String
                                      // "true" instead of true
    if(!editMode) {   
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId, product => {
        if(!product) {
            return res.redirect('/');
        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product
          });
    })  
};

exports.getProducts = (req, res, next) => 
{
    Product.fetchAll((products) => {
        res.render('admin/products', {
            prods: products, 
            pageTitle: 'Admin Products', 
            path:'/admin/products'
          });
    });
};