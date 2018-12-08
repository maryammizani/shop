const fs = require('fs');
const path = require('path');

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
    constructor (title, imageUrl, description, price) {
        this.title = title;
        this.imageUrl = imageUrl;
        this.description = description;
        this.price = price;
    }

    save() {
        this.id = Math.random().toString();
        getProductFromFile(products => {
            products.push(this);
            fs.writeFile(p, JSON.stringify(products), (err) => {  // stringify takes JS obj and converts it to Json
                console.log(err);
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