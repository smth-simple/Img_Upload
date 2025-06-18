// server/server.js
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import Project from './models/Project.js'; // ✅ import your model
import Photo from './models/Photo.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import csvParser from 'csv-parser';
import multer from 'multer';
import { Parser } from 'json2csv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/photo-project';

const app = express();
app.use(express.json());

// Simple CORS setup so CRA (port 3000) can call it:
const allowedOrigins = ['http://localhost:3000', 'https://img-upload-library.onrender.com'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


// ✅ GET /api/projects — list all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({});
    res.json({ projects });
  } catch (err) {
    console.error('Failed to fetch projects', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ✅ POST /api/projects — create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const existing = await Project.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Project already exists' });

    const project = new Project({ name });
    await project.save();

    res.status(201).json({ project });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// import
app.post('/api/projects/:projectId/photos/import', upload.single('csv'), async (req, res) => {
  const { projectId } = req.params;
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ error: 'CSV file missing' });
  }

  let added = 0;
  const seen = new Set();

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', async (row) => {
      const url = row.url?.trim();
      if (!url || seen.has(url)) return;
      seen.add(url);

      const exists = await Photo.exists({ projectId, url });
      if (!exists) {
        await Photo.create({
          projectId,
          url,
          description: row.description || null,
          language: row.language || null,
          locale: row.locale || null,
          textAmount: row.textAmount || null,
          imageType: row.imageType || null,
          usageCount: Number(row.usageCount || 0),
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        });
        added++;
      }
    })
    .on('end', () => {
      fs.unlink(filePath, () => {});
      res.json({ added });
    })
    .on('error', (err) => {
      console.error('CSV import error', err);
      fs.unlink(filePath, () => {});
      res.status(500).json({ error: 'Failed to process CSV' });
    });
});

// Export
app.get('/api/projects/:projectId/photos/export', async (req, res) => {
  const { projectId } = req.params;
  const photos = await Photo.find({ projectId });

  const fields = ['url', 'description', 'locale', 'usageCount', 'metadata'];
  const parser = new Parser({ fields });
  const csv = parser.parse(photos);

  res.header('Content-Type', 'text/csv');
  res.attachment('photos_export.csv');
  res.send(csv);
});

// Website scraper
app.post('/api/projects/:id/photos/scrape', async (req, res) => {
  const projectId = req.params.id;
  const { mode, site, keywords, urls } = req.body;

if (mode === 'image-database') {
  if (!Array.isArray(keywords) || !site) {
    return res.status(400).json({ error: 'Missing keywords or site' });
  }

  const seen = new Set();
  let added = 0;

  for (const keyword of keywords) {
    if (site === 'pexels') {
      added += await scrapeFromPexels(projectId, keyword, seen);
    } else if (site === 'pixabay') {
      added += await scrapeFromPixabay(projectId, keyword, seen, imageLang || '');
    } else if (site === 'unsplash') {
      added += await scrapeFromUnsplash(projectId, keyword, seen);
    } else if (site === 'Freepik') {
      added += await scrapeFromFreepik(projectId, keyword, seen);
    } else if (site === 'Wikimedia Commons') {
      added += await scrapeFromWikimedia(projectId, keyword, seen);
    } else {
      const searchUrl = buildSearchUrl(site, keyword);
      if (!searchUrl) continue;
      added += await scrapeSinglePage(projectId, searchUrl, seen);
    }
  }

  return res.json({ added });
}



  if (mode === 'custom-website') {
    if (!Array.isArray(urls)) return res.status(400).json({ error: 'Missing URL list' });

    const seen = new Set();
    let added = 0;
    for (const url of urls) {
      added += await crawlEntireSite(projectId, url, seen);
    }

    return res.json({ added });
  }

  return res.status(400).json({ error: 'Invalid mode' });
});




// Connect to MongoDB and start the server
mongoose.connect(MONGO_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error', err);
})

// Get photo model
app.get('/api/projects/:id/photos', async (req, res) => {
  try {
    const photos = await Photo.find({ projectId: req.params.id });
    res.json({ photos });
  } catch (err) {
    console.error('Failed to load photos', err);
    res.status(500).json({ error: 'Failed to load photos' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const result = await Project.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

async function scrapeSinglePage(projectId, url, seen) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });

    const $ = cheerio.load(data);
    let added = 0;

    const elements = $('img, source').toArray();
    for (const el of elements) {
      const rawSrc = $(el).attr('src') || $(el).attr('srcset')?.split(' ')[0];
      if (!rawSrc) continue;

      const fullUrl = rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, url).href;

      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);

      const exists = await Photo.exists({ projectId, url: fullUrl });
      if (!exists) {
        await Photo.create({ projectId, url: fullUrl, usageCount: 0 });
        added++;
      }
    }

    return added;
  } catch (err) {
    console.warn(`Error scraping ${url}:`, err.message);
    return 0;
  }
}


async function crawlEntireSite(projectId, baseUrl, seen) {
  const visited = new Set();
  let toVisit = [baseUrl];
  let totalAdded = 0;

  while (toVisit.length) {
    const current = toVisit.pop();
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const { data } = await axios.get(current);
      const $ = cheerio.load(data);
      totalAdded += await scrapeSinglePage(projectId, current, seen);

      $('a[href]').each((_, a) => {
        const href = $(a).attr('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        const newUrl = href.startsWith('http') ? href : new URL(href, current).href;
        if (newUrl.startsWith(baseUrl) && !visited.has(newUrl)) {
          toVisit.push(newUrl);
        }
      });
    } catch (err) {
      console.warn(`Error crawling ${current}:`, err.message);
    }
  }

  return totalAdded;
}

// delete button
app.post('/api/projects/:id/photos/delete', async (req, res) => {
  const { ids } = req.body;
  const projectId = req.params.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No photo IDs provided' });
  }

  try {
    await Photo.deleteMany({ _id: { $in: ids }, projectId });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting photos:', err);
    res.status(500).json({ error: 'Failed to delete photos' });
  }
});

// searchUrl helper function
function buildSearchUrl(site, keyword) {
  const encoded = encodeURIComponent(keyword);
  switch (site) {
    case 'unsplash':
      return `https://unsplash.com/s/photos/${encoded}`;
    case 'pexels':
      return `https://www.pexels.com/search/${encoded}/`;
    case 'freepik':
      return `https://www.freepik.com/search?format=search&query=${encoded}`;
    case 'pixabay':
      return `https://pixabay.com/images/search/${encoded}/`;
    case 'wikimedia':
      return `https://commons.wikimedia.org/w/index.php?search=${encoded}&title=Special:MediaSearch`;
    default:
      return null;
  }
}
async function scrapeFromPexels(projectId, keyword, seen) {
  const API_KEY = process.env.PEXELS_API_KEY;
  const PER_PAGE = 80;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${PER_PAGE}&page=1`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: API_KEY
      }
    });

    let added = 0;

    for (const photo of data.photos) {
      const imageUrl = photo.src.original;
      if (seen.has(imageUrl)) continue;
      seen.add(imageUrl);

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
        projectId,
        url: imageUrl,
        description: photo.alt || null,
        locale: photo.location?.country || null,
        usageCount: 0,
        metadata: {
            width: photo.width,
            height: photo.height,
            photographer: photo.photographer,
            source: 'pexels',
            keyword
        }
        });

        added++;
      }
    }

    return added;
  } catch (err) {
    console.warn(`Error fetching from Pexels for keyword "${keyword}":`, err.message);
    return 0;
  }
}

async function scrapeFromUnsplash(projectId, keyword, seen) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY; // Hardcoded for now
  const perPage = 30;
  let added = 0;
console.log('Unsplash Key:', process.env.UNSPLASH_ACCESS_KEY);

  try {
    const { data } = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: keyword,
        per_page: perPage,
        page: 1
      },
      headers: {
        Authorization: `Client-ID ${accessKey}`
      }
    });

    for (const photo of data.results) {
      const imageUrl = photo.urls?.full || photo.urls?.regular;
      if (!imageUrl || seen.has(imageUrl)) continue;
      seen.add(imageUrl);

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
          projectId,
          url: imageUrl,
          description: photo.alt_description || photo.description || null,
          locale: photo.location?.country || null,
          usageCount: 0,
          metadata: {
            width: photo.width,
            height: photo.height,
            photographer: photo.user?.name,
            source: 'unsplash',
            keyword
          }
        });
        added++;
      }
    }

    return added;
  } catch (err) {
    console.warn(`Error fetching from Unsplash for "${keyword}":`, err.message);
    return 0;
  }
}

async function scrapeFromPixabay(projectId, keyword, seen, lang = '') {
  const API_KEY = process.env.PIXABAY_API_KEY;
  let added = 0;

  try {
    const params = new URLSearchParams({
      key: API_KEY,
      q: keyword.replace(/\s+/g, '+'), // URL-encode keyword
      image_type: 'photo',
      per_page: '80',
    });

    if (lang && lang !== 'ignore') {
      params.append('lang', lang);
    }

    const url = `https://pixabay.com/api/?${params.toString()}`;
    const { data } = await axios.get(url);

    for (const photo of data.hits || []) {
      const imageUrl = photo.largeImageURL;
      if (!imageUrl || seen.has(imageUrl)) continue;
      seen.add(imageUrl);

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
          projectId,
          url: imageUrl,
          description: photo.tags || null,
          locale: lang !== 'ignore' ? lang : keyword,
          usageCount: 0,
          metadata: {
            width: photo.imageWidth,
            height: photo.imageHeight,
            photographer: photo.user,
            source: 'pixabay',
            keyword,
            lang: lang !== 'ignore' ? lang : null,
          },
        });
        added++;
      }
    }
  } catch (err) {
    console.warn(`Error fetching from Pixabay for "${keyword}":`, err.message);
  }

  return added;
}

async function scrapeFromFreepik(projectId, keyword, seen) {
  let added = 0;

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const searchUrl = `https://www.freepik.com/search?format=search&query=${encodeURIComponent(keyword)}&type=photo`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('img');

    const imageUrls = await page.$$eval('img', imgs =>
      imgs
        .map(img => img.src)
        .filter(src => src.includes('https://img.freepik.com'))
    );

    for (const url of imageUrls) {
      if (!url || seen.has(url)) continue;
      seen.add(url);

      const exists = await Photo.exists({ projectId, url });
      if (!exists) {
        await Photo.create({
          projectId,
          url,
          description: keyword,
          locale: keyword,
          usageCount: 0,
          metadata: {
            source: 'freepik',
            keyword
          }
        });
        added++;
      }
    }

    await browser.close();
  } catch (err) {
    console.warn(`Error scraping Freepik for "${keyword}":`, err.message);
  }

  return added;
}

async function scrapeFromWikimedia(projectId, keyword, seen) {
  const axios = await import('axios');
  const cheerio = await import('cheerio');
  let added = 0;

  try {
    const query = encodeURIComponent(keyword);
    const url = `https://commons.wikimedia.org/w/index.php?search=${query}&title=Special:MediaSearch&go=Go&type=image`;

    const { data } = await axios.default.get(url);
    const $ = cheerio.load(data);

    // Only target media thumbnails in the search results
    $('figure.sdms-search-result__media').each(async (i, el) => {
      const img = $(el).find('img');
      const imageUrl = (img.attr('src') || '').trim();
      const detailPageUrl = $(el).find('a.sdms-search-result__media-container').attr('href');
      const altText = img.attr('alt')?.trim() || null;

      // Defensive checks: block .svg and known static/resource domains
      if (
        !imageUrl ||
        seen.has(imageUrl) ||
        imageUrl.endsWith('.svg') ||
        imageUrl.includes('/static/') ||
        imageUrl.includes('/resources/')
      ) {
        return;
      }

      seen.add(imageUrl);

      // Attempt to scrape extra metadata
      let author = null;
      let license = null;

      if (detailPageUrl) {
        try {
          const detailRes = await axios.default.get(`https://commons.wikimedia.org${detailPageUrl}`);
          const $$ = cheerio.load(detailRes.data);
          author = $$('#fileinfotpl_aut').text().trim() || null;
          license = $$('#licensetpl_long').text().trim() || null;
        } catch (err) {
          console.warn(`Failed detail fetch: ${detailPageUrl}`);
        }
      }

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
          projectId,
          url: imageUrl,
          description: altText || keyword,
          locale: 'Unknown',
          usageCount: 0,
          metadata: {
            keyword,
            source: 'wikimedia',
            altText,
            author,
            license,
          },
        });
        added++;
      }
    });
  } catch (err) {
    console.warn(`Error scraping Wikimedia for "${keyword}":`, err.message);
  }

  return added;
}

;