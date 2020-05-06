const http = require('http');
const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const uuid = require('uuid');
const app = new Koa();

const public = path.join(__dirname, '/public')
app.use(koaStatic(public));

app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
        return await next();
    }

    const headers = { 'Access-Control-Allow-Origin': '*', };

    if (ctx.request.method !== 'OPTIONS') {
        ctx.response.set({ ...headers });
        try {
            return await next();
        } catch (e) {
            e.headers = { ...e.headers, ...headers };
            throw e;
        }
    }

    if (ctx.request.get('Access-Control-Request-Method')) {
        ctx.response.set({
            ...headers,
            'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
        });

        if (ctx.request.get('Access-Control-Request-Headers')) {
            ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
        }

        ctx.response.status = 204;
    }
});

app.use(koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true,
}));

app.use(async (ctx) => {
    if (ctx.request.method === 'DELETE') {
        const fileName = ctx.request.querystring;
        const fullPath = `${public}/${fileName}`;
        console.log(fileName);
        fs.unlinkSync(fullPath);
    }
    if (ctx.request.files ) {
        const fileInput = ctx.request.files['file-input'];
        console.log(fileInput);
        if (fileInput instanceof Array) {
            fileInput.forEach((file) => {
                const link = new Promise((resolve, reject) => {
                    const extension = file.name.match(/[.][a-z]*/i);
                    const oldPath = file.path;
                    const filename = uuid.v4() + extension[0];
                    const newPath = path.join(public, filename);
            
                    const callback = (error) => reject(error);
            
                    const readStream = fs.createReadStream(oldPath);
                    const writeStream = fs.createWriteStream(newPath);
            
                    readStream.on('error', callback);
                    writeStream.on('error', callback);
            
                    readStream.on('close', () => {
                        console.log('close');
                        fs.unlink(oldPath, callback);
                        resolve(filename);
                    });
            
                    readStream.pipe(writeStream);
                });
            });
        } else {
            const file = fileInput;
            const link = new Promise((resolve, reject) => {
                const extension = file.name.match(/[.][a-z]*/i);
                const oldPath = file.path;
                console.log(extension)
                const filename = uuid.v4() + extension[0];
                const newPath = path.join(public, filename);
                const callback = (error) => reject(error);
        
                const readStream = fs.createReadStream(oldPath);
                const writeStream = fs.createWriteStream(newPath);
        
                readStream.on('error', callback);
                writeStream.on('error', callback);
        
                readStream.on('close', () => {
                    console.log('close');
                    fs.unlink(oldPath, callback);
                    resolve(filename);
                });
        
                readStream.pipe(writeStream);
            });
        }   
    }

    const links = await new Promise((resolve, reject) => {
        fs.readdir(public, function(err, items) {
            resolve(items.slice(1));
        });
        
    });
    ctx.response.body = links;
});

const port = process.env.PORT || 7070;
http.createServer(app.callback()).listen(port)