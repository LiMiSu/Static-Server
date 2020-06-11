var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
    }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/
    const session = JSON.parse(fs.readFileSync('./session.json').toString());
    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)
    if (path === '/sign_in' && method === 'POST') {
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
        const array = [];//有可能是一点一点上传的，所以要加进这个数组
        request.on('data', (chunk) => {//'data'是上传事件
            array.push(chunk);
        })
        request.on('end', () => {//请求结束事件
            // console.log(array);//是一个Buffer
            const string = Buffer.concat(array).toString();//Buffer提供的一个可以把不同的数据合成一个字符串的功能
            const obj = JSON.parse(string);
            const user = userArray.find((user) => user.name === obj.name && user.password === obj.password);//返回满足条件的第一个
            if (user === undefined) {//没有 用户名密码错了
                response.statusCode = 404;
                response.setHeader('Content-Type', 'text/json;charset=utf-8');
            } else {
                response.statusCode = 200;
                //发门票
                const random = Math.random()//随机数加密
                console.log(JSON.parse(fs.readFileSync('./session.json')));
                session[random] = {user_id: user.id};
                fs.writeFileSync('./session.json', JSON.stringify(session));
                response.setHeader('Set-Cookie', `session_id=${random}; HttpOnly`);//HttpOnly杜绝前端操作cookie，前端能操作cookie意味着用户也能操作cookie
            }
            response.end();//监听事件是异步，最后执行，end要在这
        })
        // response.end();
    } else if (path === '/home.html') {
        //取到门票
        const cookie = request.headers['cookie'];
        let sessionId
        try {
            sessionId = cookie.split(';').filter(s => s.indexOf('session_id') >= 0)[0].split('=')[1];
        } catch (error) {
        }
        // console.log(session[sessionId]);
        if (sessionId&&session[sessionId]) {
            const userId = session[sessionId].user_id;
            const userArray = JSON.parse(fs.readFileSync('./db/users.json'));
            const user = userArray.find(user => user.id === userId);
            const homeHtml = fs.readFileSync('./public/home.html').toString();
            let string
            if (user) {
                string = homeHtml.replace('{{loginStatus}}', '已登录').replace('{{user.name}}', user.name);
            } else {
                string = homeHtml.replace('{{loginStatus}}', '未登录').replace('{{user.name}}', '');
            }
            response.write(string);
        } else {
            const homeHtml = fs.readFileSync('./public/home.html').toString();
            const string = homeHtml.replace('{{loginStatus}}', '未登录').replace('{{user.name}}', '');
            response.write(string);
        }
        response.end();
    } else if (path === '/register' && method === 'POST') {//动态
        response.setHeader('Content-Type', 'text/html;charset=utf-8');
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
        const array = [];//有可能是一点一点上传的，所以要加进这个数组
        request.on('data', (chunk) => {//'data'是上传事件
            array.push(chunk);
        })
        request.on('end', () => {//请求结束事件
            const string = Buffer.concat(array).toString();//Buffer提供的一个可以把不同的数据合成一个字符串的功能
            const obj = JSON.parse(string);
            const lastUser = userArray[userArray.length - 1];
            const newUser = {
                id: lastUser ? lastUser.id + 1 : 1,
                name: obj.name,
                password: obj.password
            };
            userArray.push(newUser);
            fs.writeFileSync('./db/users.json', JSON.stringify(userArray));
            response.end();
        })
    } else {//静态
        response.statusCode = 200
        const filePath = path === '/' ? '/index.html' : path;
        const index = filePath.lastIndexOf('.');
        const suffix = filePath.substring(index);
        const fileTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }
        response.setHeader('Content-Type', `${fileTypes[suffix] || 'text/html'};charset=utf-8`)
        let content
        try {
            content = fs.readFileSync(`./public${filePath}`)
        } catch (error) {
            content = `文件不存在`;
            response.statusCode = 404;
        }
        response.write(content);
        response.end()

    }
    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)