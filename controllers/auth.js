const User = require('../models/user');

exports.getLogin = (req, res, next) => {   

    // const isLoggedIn = req.get('Cookie')
    // .split(';')[0]
    // .trim()
    // .split('=')[1] === 'true';
    console.log(req.session);
    res.render('auth/login', {
        pageTitle: 'Login', 
        path:'/login',
        isAuthenticated: true
        });
};

exports.postLogin = (req, res, next) => {  
    //res.setHeader('Set-Cookie', 'loggedIn=true; HttpOnly');    
    User.findById("5c38742ab3f8c30500b88b69") 
    .then(user => {
        req.session.isLoggedIn = true;
        req.session.user = user;  
        res.redirect('/');
    })
    .catch(err => console.log(err));  
};