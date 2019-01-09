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
    req.session.isLoggedIn = true;
    res.redirect('/');
};