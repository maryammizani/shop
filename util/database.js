const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let _db;  

const mongoConnect = (callback) => {
    MongoClient.connect('mongodb+srv://user1:node@cluster0-nuomh.mongodb.net/shop?retryWrites=true', {useNewUrlParser: true})
    .then(client => {
        console.log('Connected');
        _db = client.db();  // To connect to another db other than shop, you could send the name of the db to this func -> ex: client.db(‘test’);
        callback(client);
    })
    .catch(err => {
        console.log(err);
        throw err;
    });
};

const getDb = () => {
    if(_db) {
        return _db;
    }
    throw 'No DB found!';
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
