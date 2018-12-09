const fs = require('fs');
const path = require('path');
const Cart = require('./cart.js');

const p = path.join(
    path.dirname(process.mainModule.filename), 
    'data', 
    'products.json');

const getProductFromFile = (callBack) => {  
    fs.readFile(p, (err, fileContent) => {
        if(err) {
            callBack([]);
        }
        else {
            callBack( JSON.parse(fileContent));
        }       
    })
}

module.exports = class Product {
    constructor (id, title, imageUrl, description, price) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.description = description;
        this.price = price;
    }

    save() {       
        getProductFromFile(products => {
            if(this.id) {
                const exitingProductIndex = products.findIndex(prod => prod.id === this.id);
                const updatedProducts = [...products];
                updatedProducts[exitingProductIndex] = this;
                fs.writeFile(p, JSON.stringify(updatedProducts), (err) => {  // stringify takes JS obj and converts it to Json
                    console.log(err);
                });
            }
            else {
                this.id = Math.random().toString();
                products.push(this);
                fs.writeFile(p, JSON.stringify(products), (err) => {  
                    console.log(err);
                });
            }          
        });    
    }

static deleteById(prodId) {   
    getProductFromFile(products => {
        const product = products.find(prod => prod.id === prodId);
        const updatedProducts = products.filter(prod => prod.id !== prodId);
        fs.writeFile(p, JSON.stringify(updatedProducts), (err) => {  
            // Also remove the product from the cart 
            if(!err) {
                Cart.deleteProduct(prodId, product.price);
            }
        });
    });
}

    static fetchAll(callBack) {
        getProductFromFile(callBack);
    }

    static findById(id, cb) {
        getProductFromFile(products => {
            const product = products.find(p => p.id === id);
            cb(product);
        })
    }
}