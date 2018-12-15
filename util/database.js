// const mysql = require('mysql2');
const Sequelize = require('sequelize');

const sequelize = new Sequelize('node-complete', 'root', 'node', {
    dialect: 'mysql',
    host: 'localhost'
});

module.exports = sequelize;

// const pool = mysql.createPool({
//     host: 'localhost',  // or the IP address of the host
//     user: 'root',       // this is the default that was used during the configuration process
//     database: 'node-complete',
//     password: 'node'
// });

// // export promises (insetad of callbacks) to handle async tasks 
// module.exports = pool.promise(); 