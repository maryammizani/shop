const path = require('path');
const fs = require('fs');  // file system: node core module
//const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet'); // Sets secure response headers
const compression = require('compression');  // compresses the response bodies to reduce the file sizes served to the front-end
const morgan = require('morgan');  // Logs all the requests

const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');

const User = require('./models/user');

console.log(process.env.NODE_ENV);
const key = require('./key');
const MONGODB_URI = key.MONGODB_URI;
//const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-nuomh.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
const app = express();

// Create a collection in DB that keeps the sessions
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
    //expires:   // cleanedup automatically by MongoDB
});

const csrfProtection = csrf();  // You can send in a secret string to be used for hashing
// You can also store in the cookies or sessions (default is sessions) 

// const privateKey = fs.readFileSync('server.key');  // Will not start the server before this file is read
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({ 
    destination: (req, file, cb) => {
      cb(null, 'images');  // The ./images dir should already exist, otherwise you get an error 
    },
    filename: (req, file, cb) => {
        cb(null, new Date().getTime() + '-' + file.originalname);//.toISOString().replace(new RegExp(':.', 'g'), '-') 
    }
});

const fileFilter = (req, file, cb) => {
    console.log(file.mimetype);
    if(
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg'
        ) {
        cb(null, true); // true means accept the file
    }
    else {
        cb(null, false);
    }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), 
    {flags: 'a'}
);

app.use(helmet());
app.use(compression());   
app.use(morgan('combined', {stream: accessLogStream}));

app.use(bodyParser.urlencoded({extended: false}));
//app.use(multer({dest: 'images'}).single('image'));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

// express.static is a middleware that statically serves the requested files from the predefined paths
// Express assumes that the files are served as if they were in the root folder,
app.use(express.static(path.join(__dirname, 'public')));

// The first param 'images' adjusts the root folder: if we have a req that starts with /images, then serve the files in that predefined path
// Ex: Req URL = http://localhost:3000/images/t.jpg
app.use('/images', express.static(path.join(__dirname, 'images')));

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

app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    //res.locals.csrfToken = req.csrfToken();
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

app.post('/create-order', isAuth, shopController.postOrder);

// Check if the received CSRF token matches what is expected
// The CSRF middleware checks both the req body and the header for the _csrf field
app.use(csrfProtection);

// Add the CSRF Token to the response
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Handle Errors
app.get('/500', errorController.get500);
app.use(errorController.get404);



app.use((error, req, res, next) => {
    console.log(error);
    //redirecting can casue an infinite loop if the error happenes during user auth 
    //render the error page instead of redirecting: res.redirect('/500');   
    res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
    });
});

mongoose.connect(MONGODB_URI + '?retryWrites=true', { useNewUrlParser: true } )
.then(result => {   
    app.listen(process.env.PORT || 3000);
    // https.createServer({key: privateKey, cert: certificate}, app)
    // .listen(process.env.PORT || 3000);
})
.catch(err => {
    console.log(err);
})
