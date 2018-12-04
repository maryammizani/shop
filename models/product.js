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
    constructor (t) {
        this.title = t;
    }

    save() {
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
}