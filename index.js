const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://gamefaqs.gamespot.com';

const browserHeaders = {
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9,pt;q=0.8",
};

const slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

const writeToFile = (data, path) => {
    const promiseCallback = (resolve, reject) => {
        fs.writeFile(path, data, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(true);
        });
    };
    return new Promise(promiseCallback);
};

const readFromFile = (filename) => {
    const promiseCallback = (resolve, reject) => {
        fs.readFile(filename, 'utf8', (error, contents)=> {
            if (error) {
                // console.log('*** readFromFile', error);
                resolve(null);
                return;
            }
            resolve(contents);
        });
    }
    return new Promise(promiseCallback);
};

const getPage = (path) => {

    const url = `${BASE_URL}${path}`;
    const options = {
        headers: browserHeaders,
    };

    return axios.get(url, options).then(response => response.data);
};

const getCachedPage = (path) => {
    const filename = `cache/${slug(path)}.html`;
    const promiseCallback = async (resolve, reject) => {
        const cachedHTML = await readFromFile(filename);
        if(!cachedHTML) {
            // console.log('*** getCachedPage.fresh');
            const html = await getPage(path);
            await writeToFile(html, filename);
            resolve(html);
            return;
        }
        // console.log('*** getCachedPage.cached');
        resolve(cachedHTML);
    };
    
    return new Promise(promiseCallback);
};

const saveData = (data, path) => {
    const promiseCallback = async (resolve, reject) => {
        const dataToStore = JSON.stringify({ data : data }, null, 2);
        const created = await writeToFile(dataToStore, path);
        resolve(true);
    };    

    return new Promise(promiseCallback);
};

const getPageIgems = (html) => {

    const $ = cheerio.load(html);
    const promiseCallback = (resolve, reject) => {
        const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';

        const games = [];
        $(selector).each((i, element) => {
            const a = $('td.rtitle > a', element);
            const title = a.text();
            const href = a.attr('href');
            const id = href.split('/').pop();
            games.push({ id, title, path: href });
        });
        
        resolve(games);
    } 
    
    // $('seletor').attr();
    // $('seletor').text();

    return new Promise(promiseCallback);

};

const path = '/n64/category/999-all?page=1';
getCachedPage(path)
  .then(getPageIgems)
  .then((data)=> saveData(data, './db.json'))
  .then(console.log)
  .catch(console.error);