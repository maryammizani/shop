const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class Product {
    constructor(title, price, description, imageUrl, id) {
        this.title = title;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        if(id)
        {
            this._id = new mongodb.ObjectId(id);
        }
    }

    save() {
        const db = getDb();
        let dbOp;
        if(this._id)
        {
            // Update the product
            dbOp = db.collection('products').updateOne({_id: this._id}, {$set: this});  // updateMany
            //{$set: {title: this.title, price: this.price, description: this.description, imageUrl: this.imageUrl}}
        }
        else {
            dbOp = db.collection('products').insertOne(this);
        }
        
        return dbOp
        .then(result => {
            console.log(result);
        })
        .catch(err => {
            console.log(err);
        });
    }

    static fetchAll() {
        const db = getDb();
        return db.collection('products').find().toArray() // filter Ex: find({title: 'A book'})
        .then(products => {
            return products;
        })
        .catch(err => {
            console.log(err);
        })
    }

    static findById(prodId) {
        const db = getDb();
        return db.collection('products').find({_id: new mongodb.ObjectId(prodId)}).next()
        .then(product => {
            console.log(product);
            return product;
        })
        .catch(err => {
            console.log(err);
        })
    }
}

module.exports = Product;
