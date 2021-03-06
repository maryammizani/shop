const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const sendGridKey = require('../key').SENDGRID_KEY;
const URL = require('../key').URL;

const { validationResult} = require('express-validator/check');

const User = require('../models/user');

const transport = nodemailer.createTransport(sendgridTransport({
    auth: {
        //api_user: ,
        api_key: sendGridKey
    }
}));

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',  
        errorMessage: message,
        oldInput: {
            email: '',
            password: ''
        },
        validationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    }
    User.findOne({email: email})
    .then(user => {
        if(!user) {
            // req.flash('error', 'Invalid email or password.');
            // return res.redirect('/login');
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email address',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: [{param: 'email'}] // or []
            });
        }
        bcrypt.compare(password, user.password)
        .then(doMatch => {
            if(doMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save(err => {
                    //console.log(err);
                    res.redirect('/');
                  });                   
            }
            // req.flash('error', 'Invalid email or password.');
            // res.redirect('/login');
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid password',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: [{param: 'password'}] // or []
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
    });
};

exports.postSignup = (req, res, next) => {
    const email= req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationErrors: errors.array()
        });
    }
    // Check to see if this user already exists
    // User.findOne({email: email})
    // .then(userDoc => {
    //     if(userDoc) {
    //         req.flash('error', 'E-Mail exists already. Please pick a different one.');
    //         return res.redirect('/signup');
    //     }
    bcrypt.hash(password, 12)   // 12: defines the number of rounds of hashing that will be applied, the higher the better
    .then(hashedpassword => {
        const user = new User ({
            email: email,
            password: hashedpassword,
            cart: {items: []}
        })
        return user.save();
    })
    .then(result => {
        res.redirect('/login');
        // Sending emials can be slow, so do not use it in a blocking way if you have too many users
        transport.sendMail({
            to: email,
            from: 'shop@node-complete.com',
            subject: 'Signup succeesed!',
            html: '<h1>You successfully signed up!</h1>'
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(Error);
        });          
    });     
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => { 
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }   
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {  // generates 32 random bytes
        if(err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then(user => {
            if(!user) {
                req.flash('error', 'No account with that email found.');
                return res.redirect('/reset');
            }     
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000; // 3,600,000 milliseconds, = 1 hour
            user.save()
            .then(result => {
                res.redirect('/');
                transport.sendMail({
                    to: req.body.email,
                    from: 'shop@node-complete.com',
                    subject: 'Password reset',  
                    html: ` 
                        <p>You requested a password reset</p>
                        <p>Click this <a href="${URL}/reset/${token}">link</a> to set a new password.</p>
                    `
                })
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(Error);
            });
        })      
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(Error);
        });
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
      .then(user => {
        let message = req.flash('error');
        if (message.length > 0) {
          message = message[0];
        } else {
          message = null;
        }
        res.render('auth/new-password', {
          path: '/new-password',
          pageTitle: 'New Password',
          errorMessage: message,
          userId: user._id.toString(),
          passwordToken: token
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
      });
  };
  
  exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
  
    User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId
    })
      .then(user => {
        resetUser = user;
        return bcrypt.hash(newPassword, 12);
      })
      .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
      })
      .then(result => {
        res.redirect('/login');
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(Error);
      });
  };
  