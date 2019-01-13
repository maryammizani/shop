const bcrypt = require('bcryptjs');
const User = require('../models/user');

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: false
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false
  });
};

exports.postLogin = (req, res, next) => {
  User.findById('5c38742ab3f8c30500b88b69')
    .then(user => {
      req.session.isLoggedIn = true;
      req.session.user = user;
      req.session.save(err => {
        console.log(err);
        res.redirect('/');
      });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
    const email= req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    // Check to see if this user already exists
    User.findOne({email: email})
    .then(userDoc => {
        if(userDoc) {
            return res.redirect('/signup');
        }
        return bcrypt.hash(password, 12)   // 12: defines the number of rounds of hashing that will be applied, the higher the better
        .then(hashedpassword => {
            const user = new User ({
                email: email,
                password: hashedpassword,
                cart: {items: []}
            })
            return user.save();
        })     
    })
    .then(result => {
        res.redirect('/login')
    })
    .catch(err => {
        console.log(err);
    })
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
