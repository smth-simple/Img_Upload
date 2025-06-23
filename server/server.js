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

// import cors from 'cors';
// app.use(cors({
//   origin: 'https://img-upload-library.onrender.com'
// }));

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

// ✅ PUT /api/projects/:id — rename a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if another project already has this name
    const existing = await Project.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ error: 'A project with this name already exists' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ✅ DELETE /api/projects/:id — delete a project
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

// ✅ UPDATED: GET /api/projects/:id/photos — get photos with filtering and pagination
app.get('/api/projects/:id/photos', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { 
      page = 1, 
      limit = 100, 
      language, 
      locale, 
      textAmount, 
      imageType, 
      usage 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = { projectId };
    
    // Add filters if they exist - handle both single values and arrays
    if (language && language !== '') {
      const languages = Array.isArray(language) ? language : [language];
      if (languages.length > 0) filter.language = { $in: languages };
    }
    if (locale && locale !== '') {
      const locales = Array.isArray(locale) ? locale : [locale];
      if (locales.length > 0) filter.locale = { $in: locales };
    }
    if (textAmount && textAmount !== '') {
      const textAmounts = Array.isArray(textAmount) ? textAmount : [textAmount];
      if (textAmounts.length > 0) filter.textAmount = { $in: textAmounts };
    }
    if (imageType && imageType !== '') {
      const imageTypes = Array.isArray(imageType) ? imageType : [imageType];
      if (imageTypes.length > 0) filter.imageType = { $in: imageTypes };
    }
    
    // Handle usage filter (updated for new ranges and multiple selections)
    if (usage && usage !== '') {
      const usages = Array.isArray(usage) ? usage : [usage];
      const usageConditions = [];
      
      usages.forEach(u => {
        switch (u) {
          case '0':
            usageConditions.push({ usageCount: 0 });
            break;
          case '1':
            usageConditions.push({ usageCount: 1 });
            break;
          case '2':
            usageConditions.push({ usageCount: 2 });
            break;
          case '3':
            usageConditions.push({ usageCount: 3 });
            break;
          case '4+':
            usageConditions.push({ usageCount: { $gte: 4 } });
            break;
        }
      });
      
      if (usageConditions.length > 0) {
        filter.$or = usageConditions;
      }
    }

    console.log('🔍 Filter applied:', filter);

    // Get total count (unfiltered)
    const totalPhotos = await Photo.countDocuments({ projectId });
    
    // Get filtered count
    const filteredCount = await Photo.countDocuments(filter);
    
    // Get paginated photos with filters
    const photos = await Photo.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get available filter options (for dropdowns)
    const availableFilters = {
      languages: await Photo.distinct('language', { projectId }),
      locales: await Photo.distinct('locale', { projectId }),
      textAmounts: await Photo.distinct('textAmount', { projectId }),
      imageTypes: await Photo.distinct('imageType', { projectId })
    };

    // Clean up null/undefined values from filter options
    availableFilters.languages = availableFilters.languages.filter(Boolean);
    availableFilters.locales = availableFilters.locales.filter(Boolean);
    availableFilters.textAmounts = availableFilters.textAmounts.filter(Boolean);
    availableFilters.imageTypes = availableFilters.imageTypes.filter(Boolean);

    console.log(`📊 Results: ${photos.length} photos (${filteredCount} total filtered, ${totalPhotos} total)`);

    res.json({ 
      photos, 
      total: totalPhotos,
      filteredCount,
      availableFilters,
      page: parseInt(page),
      hasMore: photos.length === parseInt(limit)
    });

  } catch (err) {
    console.error('Error loading filtered photos:', err);
    res.status(500).json({ error: 'Failed to load photos' });
  }
});

// ✅ NEW: GET /api/projects/:id/photos/ids — get all photo IDs for filtered results (for "Select All Filtered")
app.get('/api/projects/:id/photos/ids', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { 
      language, 
      locale, 
      textAmount, 
      imageType, 
      usage 
    } = req.query;

    // Build filter object (same logic as main endpoint)
    const filter = { projectId };
    
    if (language && language !== '') {
      const languages = Array.isArray(language) ? language : [language];
      if (languages.length > 0) filter.language = { $in: languages };
    }
    if (locale && locale !== '') {
      const locales = Array.isArray(locale) ? locale : [locale];
      if (locales.length > 0) filter.locale = { $in: locales };
    }
    if (textAmount && textAmount !== '') {
      const textAmounts = Array.isArray(textAmount) ? textAmount : [textAmount];
      if (textAmounts.length > 0) filter.textAmount = { $in: textAmounts };
    }
    if (imageType && imageType !== '') {
      const imageTypes = Array.isArray(imageType) ? imageType : [imageType];
      if (imageTypes.length > 0) filter.imageType = { $in: imageTypes };
    }
    
    // Handle usage filter
    if (usage && usage !== '') {
      const usages = Array.isArray(usage) ? usage : [usage];
      const usageConditions = [];
      
      usages.forEach(u => {
        switch (u) {
          case '0':
            usageConditions.push({ usageCount: 0 });
            break;
          case '1':
            usageConditions.push({ usageCount: 1 });
            break;
          case '2':
            usageConditions.push({ usageCount: 2 });
            break;
          case '3':
            usageConditions.push({ usageCount: 3 });
            break;
          case '4+':
            usageConditions.push({ usageCount: { $gte: 4 } });
            break;
        }
      });
      
      if (usageConditions.length > 0) {
        filter.$or = usageConditions;
      }
    }

    console.log('🔍 Getting all IDs for filter:', filter);

    // Get all photo IDs that match the filter (no pagination)
    const photoIds = await Photo.find(filter).select('_id').lean();
    const ids = photoIds.map(photo => photo._id.toString());

    console.log(`📊 Found ${ids.length} photo IDs matching filter`);

    res.json({ 
      photoIds: ids,
      count: ids.length
    });

  } catch (err) {
    console.error('Error getting filtered photo IDs:', err);
    res.status(500).json({ error: 'Failed to get photo IDs' });
  }
});

// ✅ POST /api/projects/:projectId/photos/import — import photos from CSV
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

// ✅ GET /api/projects/:projectId/photos/export — export photos to CSV
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

// ✅ WORKING VERSION: GET /api/projects/:id/photos/distribution  
app.get('/api/projects/:id/photos/distribution', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { 
      language, 
      locale, 
      textAmount, 
      imageType, 
      usage 
    } = req.query;

    // Build filter object (same logic as main endpoint)
    const filter = { projectId };
    
    if (language && language !== '') {
      const languages = Array.isArray(language) ? language : [language];
      if (languages.length > 0) filter.language = { $in: languages };
    }
    if (locale && locale !== '') {
      const locales = Array.isArray(locale) ? locale : [locale];
      if (locales.length > 0) filter.locale = { $in: locales };
    }
    if (textAmount && textAmount !== '') {
      const textAmounts = Array.isArray(textAmount) ? textAmount : [textAmount];
      if (textAmounts.length > 0) filter.textAmount = { $in: textAmounts };
    }
    if (imageType && imageType !== '') {
      const imageTypes = Array.isArray(imageType) ? imageType : [imageType];
      if (imageTypes.length > 0) filter.imageType = { $in: imageTypes };
    }
    
    // Handle usage filter
    if (usage && usage !== '') {
      const usages = Array.isArray(usage) ? usage : [usage];
      const usageConditions = [];
      
      usages.forEach(u => {
        switch (u) {
          case '0':
            usageConditions.push({ usageCount: 0 });
            break;
          case '1':
            usageConditions.push({ usageCount: 1 });
            break;
          case '2':
            usageConditions.push({ usageCount: 2 });
            break;
          case '3':
            usageConditions.push({ usageCount: 3 });
            break;
          case '4+':
            usageConditions.push({ usageCount: { $gte: 4 } });
            break;
        }
      });
      
      if (usageConditions.length > 0) {
        filter.$or = usageConditions;
      }
    }

    console.log(`📊 Getting distribution for filter: ${JSON.stringify(filter)}`);

    // Get distinct values for all fields
    const [distinctLanguages, distinctLocales, distinctTextAmounts, distinctImageTypes] = await Promise.all([
      Photo.distinct('language', filter),
      Photo.distinct('locale', filter),
      Photo.distinct('textAmount', filter),
      Photo.distinct('imageType', filter)
    ]);

    console.log(`📊 Found ${distinctLanguages.length} languages, ${distinctLocales.length} locales, ${distinctTextAmounts.length} text amounts, ${distinctImageTypes.length} image types`);

    const results = {
      languages: [],
      locales: [],
      textAmounts: [],
      imageTypes: []
    };

    // Count languages manually (all of them since there's usually not many)
    for (const lang of distinctLanguages) {
      const count = await Photo.countDocuments({ ...filter, language: lang });
      results.languages.push({ 
        name: lang === null ? 'None' : lang, 
        count 
      });
    }

    // Count ALL locales manually, then take top 50
    const localePromises = distinctLocales.map(async (locale) => {
      const count = await Photo.countDocuments({ ...filter, locale: locale });
      return { 
        name: locale === null ? 'None' : locale, 
        count 
      };
    });
    const allLocaleResults = await Promise.all(localePromises);
    allLocaleResults.sort((a, b) => b.count - a.count);
    results.locales = allLocaleResults.slice(0, 50); // Top 50 by count

    // Count text amounts manually (all of them since there are only a few)
    for (const textAmount of distinctTextAmounts) {
      const count = await Photo.countDocuments({ ...filter, textAmount: textAmount });
      results.textAmounts.push({ 
        name: textAmount === null ? 'None' : textAmount, 
        count 
      });
    }

    // Count ALL image types manually, then take top 20
    const imageTypePromises = distinctImageTypes.map(async (imageType) => {
      const count = await Photo.countDocuments({ ...filter, imageType: imageType });
      return { 
        name: imageType === null ? 'None' : imageType, 
        count 
      };
    });
    const allImageTypeResults = await Promise.all(imageTypePromises);
    allImageTypeResults.sort((a, b) => b.count - a.count);
    results.imageTypes = allImageTypeResults.slice(0, 20); // Top 20 by count

    // Sort final results by count
    results.languages.sort((a, b) => b.count - a.count);
    results.textAmounts.sort((a, b) => b.count - a.count);

    console.log(`📈 Final distribution results:`);
    console.log(`  Languages: ${results.languages.length} items`);
    console.log(`  Locales: ${results.locales.length} items (top 50)`);
    console.log(`  TextAmounts: ${results.textAmounts.length} items`);
    console.log(`  ImageTypes: ${results.imageTypes.length} items (top 20)`);

    res.json(results);

  } catch (err) {
    console.error('❌ Error getting distribution data:', err);
    res.status(500).json({ error: 'Failed to get distribution data' });
  }
});


// ✅ POST /api/projects/:id/photos/scrape — scrape photos from various sources
app.post('/api/projects/:id/photos/scrape', async (req, res) => {
  const projectId = req.params.id;
  const { mode, sites, languages, keywords, urls } = req.body;

  if (mode === 'image-database') {
    if (!Array.isArray(keywords) || !Array.isArray(sites) || sites.length === 0) {
      return res.status(400).json({ error: 'Missing keywords or sites' });
    }

    const seen = new Set();
    let totalAdded = 0;

    // Process each keyword with each selected site
    for (const keyword of keywords) {
      for (const site of sites) {
        console.log(`🔍 Scraping ${site} with keyword="${keyword}"`);
        
        if (site === 'pexels') {
          // Get Pexels locales for this site
          const pexelsLocales = languages ? 
            languages.filter(lang => lang.startsWith('pexels:')).map(lang => lang.replace('pexels:', '')) :
            [''];
          
          if (pexelsLocales.length === 0) pexelsLocales.push(''); // Default if none selected
          
          for (const locale of pexelsLocales) {
            console.log(`  📍 Using Pexels locale: ${locale || 'default'}`);
            totalAdded += await scrapeFromPexels(projectId, keyword, seen, locale);
          }
        } 
        else if (site === 'pixabay') {
          // Get Pixabay languages for this site
          const pixabayLangs = languages ? 
            languages.filter(lang => lang.startsWith('pixabay:')).map(lang => lang.replace('pixabay:', '')) :
            [''];
          
          if (pixabayLangs.length === 0) pixabayLangs.push(''); // Default if none selected
          
          for (const lang of pixabayLangs) {
            console.log(`  🌍 Using Pixabay language: ${lang || 'default'}`);
            totalAdded += await scrapeFromPixabay(projectId, keyword, seen, lang);
          }
        } 
        else if (site === 'unsplash') {
          totalAdded += await scrapeFromUnsplash(projectId, keyword, seen);
        } 
        else if (site === 'freepik') {
          totalAdded += await scrapeFromFreepik(projectId, keyword, seen);
        } 
        else if (site === 'wikimedia') {
          totalAdded += await scrapeFromWikimedia(projectId, keyword, seen);
        } 
        else {
          const searchUrl = buildSearchUrl(site, keyword);
          if (searchUrl) {
            totalAdded += await scrapeSinglePage(projectId, searchUrl, seen);
          }
        }
      }
    }

    console.log(`✅ Total added across all sites and languages: ${totalAdded}`);
    return res.json({ added: totalAdded });
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

// ✅ POST /api/projects/:id/photos/delete — delete selected photos
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

// Helper function to build search URLs
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

// Scraping functions
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

async function scrapeFromPexels(projectId, keyword, seen, locale = '') {
  const API_KEY = process.env.PEXELS_API_KEY;
  const PER_PAGE = 80;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${PER_PAGE}${locale ? `&locale=${locale}` : ''}`;

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
          locale: locale || null,
          usageCount: 0,
          metadata: {
            width: photo.width,
            height: photo.height,
            photographer: photo.photographer,
            source: 'pexels',
            keyword,
            locale
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
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const perPage = 30;
  let added = 0;

  console.log('🔑 Using Unsplash key:', accessKey);

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

      // Make additional API call for full metadata
      let country = null;
      try {
        const detailRes = await axios.get(`https://api.unsplash.com/photos/${photo.id}`, {
          headers: {
            Authorization: `Client-ID ${accessKey}`
          }
        });
        country = detailRes.data.location?.country || null;
      } catch (detailErr) {
        console.warn(`  ↳ Failed to fetch location for photo ID ${photo.id}`);
      }

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
          projectId,
          url: imageUrl,
          description: photo.alt_description || photo.description || null,
          locale: country || null,
          usageCount: 0,
          metadata: {
            width: photo.width,
            height: photo.height,
            photographer: photo.user?.name,
            source: 'unsplash',
            keyword,
            country
          }
        });
        added++;
      }
    }

    return added;
  } catch (err) {
    console.warn(`❌ Error fetching from Unsplash for "${keyword}":`, err.message);
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

    const apiUrl = `https://pixabay.com/api/?${params.toString()}`;
    console.log('📷 Pixabay URL:', apiUrl);

    const { data } = await axios.get(apiUrl);

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

// Health check endpoint
app.get('/', (req, res) => {
  res.send('✅ Backend is up and running');
});

// Connect to MongoDB and start the server
mongoose.connect(MONGO_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error', err);
});