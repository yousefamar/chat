const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const lang = 'ar';// 'en';
const outputDir = 'data/islamqa-info-' + lang;

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

async function fetchSitemap() {
    try {
        const { data } = await axios.get(`https://islamqa.info/sitemaps/sitemap-fatawa-${lang}-1.xml`);
        return data;
    } catch (error) {
        console.error('Error fetching sitemap:', error);
    }
}

async function extractURLs(sitemapXML) {
    try {
        const parsed = await xml2js.parseStringPromise(sitemapXML);
        const urls = parsed.urlset.url.map(urlEntry => urlEntry.loc[0]);
        return urls.filter(url => url.includes(`https://islamqa.info/${lang}/answers/`));
    } catch (error) {
        console.error('Error parsing sitemap XML:', error);
    }
}

async function scrapeArticle(url) {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`Article not found (404): ${url}`);
        } else {
            console.error(`Error fetching article ${url}:`, error);
        }
    }
}

function extractQA(html, articleId, url) {
    const $ = cheerio.load(html);
    const question = $('.single_fatwa__question div').text().trim();
    const answer = $('.single_fatwa__answer__body div').text().trim();

    if (question && answer) {
        const qaPair = { id: articleId, url, question, answer };
        // if filename is too long, truncate it
        const filename = articleId.length > 200 ? articleId.substring(0, 200) : articleId;
        fs.writeFileSync(path.join(outputDir, `${filename}.json`), JSON.stringify(qaPair, null, 2));
        console.log(`Article ${articleId} processed`);
    }
}

async function main() {
    const sitemapXML = await fetchSitemap();
    const articleURLs = await extractURLs(sitemapXML);

    for (const url of articleURLs) {

        // check if article has already been scraped
        const articleId = url.split('/').pop();
        if (fs.existsSync(path.join(outputDir, `${articleId}.json`))) {
            console.log(`Article ${articleId} already processed`);
            continue;
        }

        const articleHtml = await scrapeArticle(url);
        if (articleHtml) {
            const articleId = url.split('/').pop();
            extractQA(articleHtml, articleId, url);
        }
    }
}

main();
