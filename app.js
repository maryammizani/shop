const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = 'mongodb+srv://user1:node@cluster0-nuomh.mongodb.net/shop';

const app = express();

// Create a collection in DB that keeps the sessions
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
    //expires:   // cleanedup automatically by MongoDB
});

const csrfProtection = csrf()  // You can send in a secret string to be used for hashing
// You can also store in the cookies or sessions (default is sessions) 

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

// The session middleware:
// 1. Reads and parses the cookie out of the request
// 2. When a controller sets req.session.user=? and req.session.save() =>
//    The session middleware will encrypt that session info and saves it in the DB
//    It also sends the encrypted user info in the response back to the client 
//    to be saved in their browser as a cookie
//    After that, everytime client sends a req, the cookie will be embedded in the req
//    Server parses and decrypts that cookie to see if it matches any session id in the session collection
//    if so req.session will be valid, otherwise it will be null
app.use(session({
        secret:'my secret', 
        resave: false, 
        saveUninitialized: false,
        store: store
    })
);
app.use(csrfProtection);
app.use(flash());

// Add CSRF Token 
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Fetch the user that its id was saved in our session during login and add it to the req
app.use((req, res, next) => {
    //throw new Error('Sync Error');
    if(!req.session.user){
        return next();
    }
    User.findById(req.session.user._id) 
    .then(user => {
        //throw new Error('Async Error');
        if(!user) {
            return next();
        }
        req.user = user;  
        next();
    })
    .catch(err => {
        //throw new Error(err);
        next(new Error(err));
    }); 
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Handle Errors
app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
    // redirecting can casue an infinite loop if the error happenes during user auth 
    // render the error page instead of redirecting: res.redirect('/500');   
    res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
    });
});

mongoose.connect(MONGODB_URI + '?retryWrites=true', { useNewUrlParser: true } )
.then(result => {   
    app.listen(3000);
})
.catch(err => {
    console.log(err);
})
