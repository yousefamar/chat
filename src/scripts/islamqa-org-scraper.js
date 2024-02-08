const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const lang = 'ar'; // Update language code if needed
const outputDir = `data/islamqa-org-${lang}`;

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function fetchSitemap(page) {
    try {
        const url = page === 1
            ? `https://islamqa.org/sitemap-posts.xml`
            : `https://islamqa.org/sitemap-posts.xml?page=${page}`;
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error('Error fetching sitemap:', error);
    }
}

async function extractURLs(sitemapXML) {
    try {
        const parsed = await xml2js.parseStringPromise(sitemapXML);
        const urls = parsed.urlset.url.map(urlEntry => urlEntry.loc[0]);
        return urls;
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

function extractData(html, articleId, url) {
    const $ = cheerio.load(html);
    const title = $('.title-header').text().trim();
    const content = $('#qna_only').text().trim();
    const shortLink = $('#copy-shortlink').attr('value');
    const madhab = $('#answered-according-to a').first().text().trim();
    const madhabURL = $('#answered-according-to a').first().attr('href');
    const source = $('#answered-according-to a').last().text().trim();
    const sourceURL = $('#answered-according-to a').last().attr('href');
    const scholars = $('#scholar a').map((i, el) => $(el).text().trim()).get();
    const scholarURLs = $('#scholar a').map((i, el) => $(el).attr('href')).get();

    const articleData = {
        id: articleId,
        url,
        title,
        content,
        shortLink,
        madhab,
        madhabURL,
        source,
        sourceURL,
        scholars,
        scholarURLs
    };

    fs.writeFileSync(path.join(outputDir, `${articleId}.json`), JSON.stringify(articleData, null, 2));
    console.log(`Article ${articleId} processed`);
}

async function main() {
    for (let page = 1; page <= 20; page++) {
        const sitemapXML = await fetchSitemap(page);
        const articleURLs = await extractURLs(sitemapXML);

        for (let url of articleURLs) {
            // console.log(`Processing article: ${url}`);
            if (url.endsWith('/'))
                url = url.slice(0, -1);
            const articleId = url.split('/').pop();
            if (fs.existsSync(path.join(outputDir, `${articleId}.json`))) {
                console.log(`Article ${articleId} already processed`);
                continue;
            }

            const articleHtml = await scrapeArticle(url);
            if (articleHtml) {
                extractData(articleHtml, articleId, url);
            }
        }
    }
}

main();