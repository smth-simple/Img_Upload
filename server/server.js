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
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT');
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

// ✅ NEW: POST /api/projects/:id/photos/migrate-pixabay — migrate Pixabay URLs to permanent ones
app.post('/api/projects/:id/photos/migrate-pixabay', async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log('🔄 Starting Pixabay URL migration for project:', projectId);

    // Find all photos from Pixabay that need migration
    const pixabayPhotos = await Photo.find({
      projectId,
      'metadata.source': 'pixabay',
      // Check for temporary URL patterns
      $or: [
        { url: { $regex: /cdn\.pixabay\.com/ } },
        { url: { $regex: /pixabay\.com\/get/ } },
        { url: { $not: { $regex: /pixabay\.com\/photos\// } } }
      ]
    });

    console.log(`📊 Found ${pixabayPhotos.length} Pixabay photos to migrate`);

    let migrated = 0;
    let failed = 0;
    const batchSize = 100;

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < pixabayPhotos.length; i += batchSize) {
      const batch = pixabayPhotos.slice(i, i + batchSize);
      const updates = [];

      for (const photo of batch) {
        try {
          let permanentUrl = null;

          // Method 1: Check if we have pixabayId in metadata
          if (photo.metadata?.pixabayId) {
            // Construct the permanent URL from the ID
            permanentUrl = `https://pixabay.com/photos/photo-${photo.metadata.pixabayId}/`;
          }
          // Method 2: Try to extract ID from current URL if possible
          else if (photo.url) {
            const match = photo.url.match(/[-_](\d{6,})[-_.]/);
            if (match && match[1]) {
              permanentUrl = `https://pixabay.com/photos/photo-${match[1]}/`;
              // Also update the pixabayId in metadata
              if (!photo.metadata) photo.metadata = {};
              photo.metadata.pixabayId = match[1];
            }
          }

          if (permanentUrl) {
            updates.push({
              updateOne: {
                filter: { _id: photo._id },
                update: {
                  $set: {
                    url: permanentUrl,
                    'metadata.oldTempUrl': photo.url,
                    'metadata.migratedAt': new Date().toISOString()
                  }
                }
              }
            });
            migrated++;
          } else {
            console.warn(`⚠️ Could not determine permanent URL for photo ${photo._id}`);
            failed++;
          }
        } catch (err) {
          console.error(`❌ Error processing photo ${photo._id}:`, err);
          failed++;
        }
      }

      // Execute batch update
      if (updates.length > 0) {
        await Photo.bulkWrite(updates);
        console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pixabayPhotos.length / batchSize)}`);
      }
    }

    console.log(`🎉 Migration complete! Migrated: ${migrated}, Failed: ${failed}`);

    res.json({
      success: true,
      total: pixabayPhotos.length,
      migrated,
      failed
    });

  } catch (err) {
    console.error('❌ Migration error:', err);
    res.status(500).json({ error: 'Migration failed', details: err.message });
  }
});

// ✅ GET /api/projects/:id/photos/migration-status — check migration status
app.get('/api/projects/:id/photos/migration-status', async (req, res) => {
  try {
    const projectId = req.params.id;

    // Count total Pixabay photos
    const totalPixabay = await Photo.countDocuments({
      projectId,
      'metadata.source': 'pixabay'
    });

    // Count photos that need migration
    const needsMigration = await Photo.countDocuments({
      projectId,
      'metadata.source': 'pixabay',
      $or: [
        { url: { $regex: /cdn\.pixabay\.com/ } },
        { url: { $regex: /pixabay\.com\/get/ } },
        { url: { $not: { $regex: /pixabay\.com\/photos\// } } }
      ]
    });

    // Count already migrated
    const migrated = await Photo.countDocuments({
      projectId,
      'metadata.source': 'pixabay',
      'metadata.migratedAt': { $exists: true }
    });

    res.json({
      totalPixabay,
      needsMigration,
      migrated,
      permanent: totalPixabay - needsMigration
    });

  } catch (err) {
    console.error('Error checking migration status:', err);
    res.status(500).json({ error: 'Failed to check migration status' });
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

// ✅ POST /api/projects/:id/photos/use — mark photos as used
app.post('/api/projects/:id/photos/use', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { count = 1 } = req.body;

    // Find photos with lowest usage count
    const photos = await Photo.find({ projectId })
      .sort({ usageCount: 1 })
      .limit(count);

    if (photos.length === 0) {
      return res.status(404).json({ error: 'No photos available' });
    }

    // Increment usage count for selected photos
    const photoIds = photos.map(p => p._id);
    await Photo.updateMany(
      { _id: { $in: photoIds } },
      { $inc: { usageCount: 1 } }
    );

    // Return updated photos
    const updatedPhotos = await Photo.find({ _id: { $in: photoIds } });

    res.json({ photos: updatedPhotos });
  } catch (err) {
    console.error('Error using photos:', err);
    res.status(500).json({ error: 'Failed to use photos' });
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
      q: keyword.replace(/\s+/g, '+'),
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
      // Use the temporary image URL directly (fast!)
      const imageUrl = photo.largeImageURL || photo.webformatURL;
      
      if (!imageUrl || seen.has(imageUrl)) continue;
      seen.add(imageUrl);

      const exists = await Photo.exists({ projectId, url: imageUrl });
      if (!exists) {
        await Photo.create({
          projectId,
          url: imageUrl, // Store temporary URL directly
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
            pixabayId: photo.id,
            pageURL: photo.pageURL,
            // Store URL creation time to track age
            urlCreatedAt: new Date().toISOString(),
            // Note: URLs expire in ~24 hours
            urlExpiresApprox: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

// 150,000 Image Collection Implementation

// Language and category configuration
const LANGUAGES = [
  { code: 'ja_JP', name: 'Japanese', pixabay: 'ja', pexels: 'ja' },
  { code: 'ko_KR', name: 'Korean', pixabay: 'ko', pexels: 'ko' },
  { code: 'fr_FR', name: 'French', pixabay: 'fr', pexels: 'fr' },
  { code: 'de_DE', name: 'German', pixabay: 'de', pexels: 'de' },
  { code: 'ar_AE', name: 'Arabic (UAE)', pixabay: 'ar', pexels: 'ar' },
  { code: 'ar_EG', name: 'Arabic (Egypt)', pixabay: 'ar', pexels: 'ar' },
  { code: 'ar_SA', name: 'Arabic (Saudi)', pixabay: 'ar', pexels: 'ar' },
  { code: 'da_DK', name: 'Danish', pixabay: 'da', pexels: 'da' },
  { code: 'de_AT', name: 'German (Austria)', pixabay: 'de', pexels: 'de' },
  { code: 'de_CH', name: 'German (Switzerland)', pixabay: 'de', pexels: 'de' },
  { code: 'es_CL', name: 'Spanish (Chile)', pixabay: 'es', pexels: 'es' },
  { code: 'es_ES', name: 'Spanish (Spain)', pixabay: 'es', pexels: 'es' },
  { code: 'es_MX', name: 'Spanish (Mexico)', pixabay: 'es', pexels: 'es' },
  { code: 'es_US', name: 'Spanish (US)', pixabay: 'es', pexels: 'es' },
  { code: 'fi_FI', name: 'Finnish', pixabay: 'fi', pexels: 'fi' },
  { code: 'fr_BE', name: 'French (Belgium)', pixabay: 'fr', pexels: 'fr' },
  { code: 'fr_CA', name: 'French (Canada)', pixabay: 'fr', pexels: 'fr' },
  { code: 'fr_CH', name: 'French (Switzerland)', pixabay: 'fr', pexels: 'fr' },
  { code: 'he_IL', name: 'Hebrew', pixabay: '', pexels: '' },
  { code: 'hi_IN', name: 'Hindi', pixabay: '', pexels: '' },
  { code: 'id_ID', name: 'Indonesian', pixabay: '', pexels: 'id' },
  { code: 'it_CH', name: 'Italian (Switzerland)', pixabay: 'it', pexels: 'it' },
  { code: 'it_IT', name: 'Italian (Italy)', pixabay: 'it', pexels: 'it' },
  { code: 'ms_MY', name: 'Malay', pixabay: '', pexels: '' },
  { code: 'nl_BE', name: 'Dutch (Belgium)', pixabay: 'nl', pexels: 'nl' },
  { code: 'nl_NL', name: 'Dutch (Netherlands)', pixabay: 'nl', pexels: 'nl' },
  { code: 'no_NO', name: 'Norwegian', pixabay: 'no', pexels: 'no' },
  { code: 'pl_PL', name: 'Polish', pixabay: 'pl', pexels: 'pl' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)', pixabay: 'pt', pexels: 'pt' },
  { code: 'pt_PT', name: 'Portuguese (Portugal)', pixabay: 'pt', pexels: 'pt' },
  { code: 'ru_RU', name: 'Russian', pixabay: 'ru', pexels: 'ru' },
  { code: 'sv_SE', name: 'Swedish', pixabay: 'sv', pexels: 'sv' },
  { code: 'th_TH', name: 'Thai', pixabay: 'th', pexels: 'th' },
  { code: 'tr_TR', name: 'Turkish', pixabay: 'tr', pexels: 'tr' },
  { code: 'uk_UA', name: 'Ukrainian', pixabay: '', pexels: '' },
  { code: 'vi_VN', name: 'Vietnamese', pixabay: 'vi', pexels: 'vi' },
  { code: 'zh_CN', name: 'Chinese (Simplified)', pixabay: 'zh', pexels: 'zh' },
  { code: 'zh_HK', name: 'Chinese (Hong Kong)', pixabay: 'zh', pexels: 'zh' },
  { code: 'zh_TW', name: 'Chinese (Traditional)', pixabay: 'zh', pexels: 'zh' }
];

const CATEGORIES = {
  'arts_illustrations': {
    name: 'Arts and Illustrations',
    keywords: {
      en: ['art', 'painting', 'drawing', 'illustration', 'sketch', 'artwork', 'design', 'creative'],
      es: ['arte', 'pintura', 'dibujo', 'ilustración', 'diseño', 'creativo'],
      fr: ['art', 'peinture', 'dessin', 'illustration', 'conception', 'créatif'],
      de: ['kunst', 'malerei', 'zeichnung', 'illustration', 'design', 'kreativ'],
      zh: ['艺术', '绘画', '插图', '设计', '创意'],
      ja: ['アート', '絵画', 'イラスト', 'デザイン', '創造'],
      ar: ['فن', 'رسم', 'توضيح', 'تصميم', 'إبداع'],
      ru: ['искусство', 'живопись', 'рисование', 'иллюстрация', 'дизайн'],
      ko: ['예술', '그림', '일러스트', '디자인', '창작']
    }
  },
  'daily_objects': {
    name: 'Daily Objects',
    keywords: {
      en: ['objects', 'items', 'tools', 'household', 'everyday', 'things', 'products'],
      es: ['objetos', 'artículos', 'herramientas', 'hogar', 'cotidiano', 'productos'],
      fr: ['objets', 'articles', 'outils', 'maison', 'quotidien', 'produits'],
      de: ['objekte', 'gegenstände', 'werkzeuge', 'haushalt', 'alltag', 'produkte'],
      zh: ['物品', '工具', '家居', '日常用品', '产品'],
      ja: ['オブジェクト', '道具', '家庭用品', '日用品', '製品'],
      ar: ['أشياء', 'أدوات', 'منزل', 'يومي', 'منتجات'],
      ru: ['предметы', 'инструменты', 'домашний', 'повседневный', 'продукты'],
      ko: ['물건', '도구', '가정용품', '일상용품', '제품']
    }
  },
  'documents': {
    name: 'Documents',
    keywords: {
      en: ['document', 'paper', 'form', 'certificate', 'letter', 'text', 'paperwork'],
      es: ['documento', 'papel', 'formulario', 'certificado', 'carta', 'papeleo'],
      fr: ['document', 'papier', 'formulaire', 'certificat', 'lettre', 'paperasse'],
      de: ['dokument', 'papier', 'formular', 'zertifikat', 'brief', 'unterlagen'],
      zh: ['文档', '文件', '证书', '信件', '表格'],
      ja: ['文書', '書類', '証明書', '手紙', 'フォーム'],
      ar: ['وثيقة', 'ورقة', 'شهادة', 'رسالة', 'استمارة'],
      ru: ['документ', 'бумага', 'сертификат', 'письмо', 'форма'],
      ko: ['문서', '서류', '증명서', '편지', '양식']
    }
  },
  'faces_people': {
    name: 'Faces and People',
    keywords: {
      en: ['people', 'person', 'face', 'portrait', 'human', 'family', 'group'],
      es: ['personas', 'persona', 'cara', 'retrato', 'humano', 'familia', 'grupo'],
      fr: ['personnes', 'personne', 'visage', 'portrait', 'humain', 'famille', 'groupe'],
      de: ['menschen', 'person', 'gesicht', 'porträt', 'mensch', 'familie', 'gruppe'],
      zh: ['人', '面孔', '肖像', '家庭', '群体'],
      ja: ['人', '顔', '肖像', '家族', 'グループ'],
      ar: ['أشخاص', 'وجه', 'صورة', 'عائلة', 'مجموعة'],
      ru: ['люди', 'человек', 'лицо', 'портрет', 'семья', 'группа'],
      ko: ['사람', '얼굴', '초상화', '가족', '그룹']
    }
  },
  'handwritten_notes': {
    name: 'Handwritten Notes',
    keywords: {
      en: ['handwriting', 'notes', 'handwritten', 'writing', 'manuscript', 'notebook'],
      es: ['escritura a mano', 'notas', 'manuscrito', 'cuaderno'],
      fr: ['écriture manuscrite', 'notes', 'manuscrit', 'carnet'],
      de: ['handschrift', 'notizen', 'handgeschrieben', 'manuskript', 'notizbuch'],
      zh: ['手写', '笔记', '手稿', '笔记本'],
      ja: ['手書き', 'ノート', '手稿', 'ノートブック'],
      ar: ['خط اليد', 'ملاحظات', 'مخطوطة', 'دفتر'],
      ru: ['почерк', 'заметки', 'рукопись', 'блокнот'],
      ko: ['손글씨', '노트', '수고', '공책']
    }
  },
  'indoor_environments': {
    name: 'Indoor Environments',
    keywords: {
      en: ['indoor', 'interior', 'room', 'office', 'home', 'building', 'inside'],
      es: ['interior', 'habitación', 'oficina', 'casa', 'edificio', 'dentro'],
      fr: ['intérieur', 'chambre', 'bureau', 'maison', 'bâtiment', 'dedans'],
      de: ['innen', 'zimmer', 'büro', 'haus', 'gebäude', 'drinnen'],
      zh: ['室内', '房间', '办公室', '家', '建筑'],
      ja: ['室内', '部屋', 'オフィス', '家', '建物'],
      ar: ['داخلي', 'غرفة', 'مكتب', 'منزل', 'مبنى'],
      ru: ['интерьер', 'комната', 'офис', 'дом', 'здание'],
      ko: ['실내', '방', '사무실', '집', '건물']
    }
  },
  'places_landscapes': {
    name: 'Places and Landscapes',
    keywords: {
      en: ['landscape', 'nature', 'outdoor', 'scenery', 'place', 'location', 'view'],
      es: ['paisaje', 'naturaleza', 'exterior', 'escenario', 'lugar', 'ubicación'],
      fr: ['paysage', 'nature', 'extérieur', 'paysage', 'lieu', 'emplacement'],
      de: ['landschaft', 'natur', 'draußen', 'szenerie', 'ort', 'standort'],
      zh: ['风景', '自然', '户外', '景色', '地点'],
      ja: ['風景', '自然', '屋外', '景色', '場所'],
      ar: ['منظر طبيعي', 'طبيعة', 'خارجي', 'مكان', 'موقع'],
      ru: ['пейзаж', 'природа', 'на улице', 'место', 'локация'],
      ko: ['풍경', '자연', '야외', '경치', '장소']
    }
  },
  'scene_texts': {
    name: 'Scene Texts',
    keywords: {
      en: ['sign', 'text', 'writing', 'words', 'billboard', 'street', 'signage'],
      es: ['señal', 'texto', 'escritura', 'palabras', 'cartelera', 'señalización'],
      fr: ['signe', 'texte', 'écriture', 'mots', 'panneau', 'signalisation'],
      de: ['schild', 'text', 'schrift', 'wörter', 'billboard', 'beschilderung'],
      zh: ['标志', '文字', '街道标识', '广告牌'],
      ja: ['看板', 'テキスト', '文字', '標識', '掲示板'],
      ar: ['علامة', 'نص', 'كتابة', 'لافتة', 'إشارة'],
      ru: ['знак', 'текст', 'надпись', 'вывеска', 'указатель'],
      ko: ['표지판', '텍스트', '문자', '간판', '표시']
    }
  },
  'animals': {
    name: 'Animals',
    keywords: {
      en: ['animals', 'pets', 'wildlife', 'cat', 'dog', 'bird', 'nature'],
      es: ['animales', 'mascotas', 'vida silvestre', 'gato', 'perro', 'pájaro'],
      fr: ['animaux', 'animaux de compagnie', 'faune', 'chat', 'chien', 'oiseau'],
      de: ['tiere', 'haustiere', 'wildtiere', 'katze', 'hund', 'vogel'],
      zh: ['动物', '宠物', '野生动物', '猫', '狗', '鸟'],
      ja: ['動物', 'ペット', '野生動物', '猫', '犬', '鳥'],
      ar: ['حيوانات', 'حيوانات أليفة', 'حياة برية', 'قطة', 'كلب', 'طائر'],
      ru: ['животные', 'домашние животные', 'дикая природа', 'кот', 'собака', 'птица'],
      ko: ['동물', '애완동물', '야생동물', '고양이', '개', '새']
    }
  },
  'foods': {
    name: 'Foods',
    keywords: {
      en: ['food', 'meal', 'cooking', 'dish', 'recipe', 'cuisine', 'eating'],
      es: ['comida', 'comida', 'cocina', 'plato', 'receta', 'cocina'],
      fr: ['nourriture', 'repas', 'cuisine', 'plat', 'recette', 'gastronomie'],
      de: ['essen', 'mahlzeit', 'kochen', 'gericht', 'rezept', 'küche'],
      zh: ['食物', '餐', '烹饪', '菜肴', '食谱'],
      ja: ['食べ物', '食事', '料理', '皿', 'レシピ'],
      ar: ['طعام', 'وجبة', 'طبخ', 'طبق', 'وصفة'],
      ru: ['еда', 'еда', 'приготовление', 'блюдо', 'рецепт'],
      ko: ['음식', '식사', '요리', '요리', '레시피']
    }
  },
  'screenshots': {
    name: 'Screenshots',
    keywords: {
      en: ['screenshot', 'screen', 'computer', 'software', 'app', 'interface', 'digital'],
      es: ['captura de pantalla', 'pantalla', 'computadora', 'software', 'aplicación'],
      fr: ['capture d\'écran', 'écran', 'ordinateur', 'logiciel', 'application'],
      de: ['bildschirmfoto', 'bildschirm', 'computer', 'software', 'anwendung'],
      zh: ['截图', '屏幕', '计算机', '软件', '应用程序'],
      ja: ['スクリーンショット', '画面', 'コンピュータ', 'ソフトウェア', 'アプリ'],
      ar: ['لقطة شاشة', 'شاشة', 'حاسوب', 'برنامج', 'تطبيق'],
      ru: ['скриншот', 'экран', 'компьютер', 'программа', 'приложение'],
      ko: ['스크린샷', '화면', '컴퓨터', '소프트웨어', '앱']
    }
  },
  'graphs_charts': {
    name: 'Graphs and Charts',
    keywords: {
      en: ['chart', 'graph', 'data', 'statistics', 'diagram', 'infographic', 'visualization'],
      es: ['gráfico', 'datos', 'estadísticas', 'diagrama', 'infografía'],
      fr: ['graphique', 'données', 'statistiques', 'diagramme', 'infographie'],
      de: ['diagramm', 'daten', 'statistiken', 'schaubild', 'infografik'],
      zh: ['图表', '数据', '统计', '图解', '信息图'],
      ja: ['チャート', 'データ', '統計', '図表', 'インフォグラフィック'],
      ar: ['مخطط', 'بيانات', 'إحصائيات', 'رسم بياني', 'إنفوجرافيك'],
      ru: ['график', 'данные', 'статистика', 'диаграмма', 'инфографика'],
      ko: ['차트', '데이터', '통계', '다이어그램', '인포그래픽']
    }
  }
};

// Collection orchestrator
class MassiveImageCollector {
  constructor(projectId) {
    this.projectId = projectId;
    this.targetTotal = 150000;
    this.targetPerLanguage = Math.floor(this.targetTotal / LANGUAGES.length); // ~3,850
    this.targetPerCategory = Math.floor(this.targetPerLanguage / Object.keys(CATEGORIES).length); // ~320
    this.progress = new Map();
    this.seen = new Set();
    
    // Initialize progress tracking
    this.initializeProgress();
  }

  initializeProgress() {
    for (const language of LANGUAGES) {
      this.progress.set(language.code, {
        total: 0,
        categories: Object.fromEntries(
          Object.keys(CATEGORIES).map(cat => [cat, 0])
        )
      });
    }
  }

  // Get language-specific keywords for a category
  getKeywords(categoryKey, languageCode) {
    const category = CATEGORIES[categoryKey];
    const baseLang = languageCode.split('_')[0]; // Extract base language (e.g., 'en' from 'en_US')
    
    // Try exact match first, then base language, then English fallback
    return category.keywords[baseLang] || 
           category.keywords[languageCode] || 
           category.keywords.en || 
           [];
  }

  // Enhanced scraping with better distribution control
  async collectForLanguageAndCategory(languageConfig, categoryKey, targetCount = 320) {
    console.log(`🎯 Collecting ${targetCount} images for ${languageConfig.name} - ${CATEGORIES[categoryKey].name}`);
    
    const keywords = this.getKeywords(categoryKey, languageConfig.code);
    let collected = 0;
    let keywordIndex = 0;
    
    // Sources to try in order of preference
    const sources = [
      { name: 'pixabay', langCode: languageConfig.pixabay },
      { name: 'pexels', langCode: languageConfig.pexels },
      { name: 'unsplash', langCode: '' }, // Unsplash doesn't have language filtering
      { name: 'wikimedia', langCode: '' }
    ];

    while (collected < targetCount && keywordIndex < keywords.length * 3) {
      const keyword = keywords[keywordIndex % keywords.length];
      const source = sources[Math.floor(keywordIndex / keywords.length) % sources.length];
      
      if (!source.langCode && source.name !== 'unsplash' && source.name !== 'wikimedia') {
        keywordIndex++;
        continue; // Skip sources that don't support this language
      }

      try {
        let added = 0;
        
        switch (source.name) {
          case 'pixabay':
            added = await this.scrapeFromPixabay(keyword, source.langCode, languageConfig.code, categoryKey);
            break;
          case 'pexels':
            added = await this.scrapeFromPexels(keyword, source.langCode, languageConfig.code, categoryKey);
            break;
          case 'unsplash':
            added = await this.scrapeFromUnsplash(keyword, languageConfig.code, categoryKey);
            break;
          case 'wikimedia':
            added = await this.scrapeFromWikimedia(keyword, languageConfig.code, categoryKey);
            break;
        }
        
        collected += added;
        this.updateProgress(languageConfig.code, categoryKey, added);
        
        console.log(`  ✅ ${source.name}:"${keyword}" → +${added} images (${collected}/${targetCount})`);
        
        // Rate limiting
        await this.delay(1000);
        
      } catch (err) {
        console.warn(`  ❌ ${source.name}:"${keyword}" failed:`, err.message);
      }
      
      keywordIndex++;
    }
    
    console.log(`🏁 Completed ${languageConfig.name} - ${CATEGORIES[categoryKey].name}: ${collected}/${targetCount} images`);
    return collected;
  }

  // Enhanced Pixabay scraping with better metadata
  async scrapeFromPixabay(keyword, langCode, localeCode, categoryKey) {
    const API_KEY = process.env.PIXABAY_API_KEY;
    if (!API_KEY) return 0;

    try {
      const params = new URLSearchParams({
        key: API_KEY,
        q: keyword.replace(/\s+/g, '+'),
        image_type: 'photo',
        per_page: '80',
        safesearch: 'true'
      });

      if (langCode) {
        params.append('lang', langCode);
      }

      const { data } = await axios.get(`https://pixabay.com/api/?${params.toString()}`);
      let added = 0;

      for (const photo of data.hits || []) {
        const imageUrl = photo.largeImageURL || photo.webformatURL;
        
        if (!imageUrl || this.seen.has(imageUrl)) continue;
        this.seen.add(imageUrl);

        const exists = await Photo.exists({ projectId: this.projectId, url: imageUrl });
        if (!exists) {
          await Photo.create({
            projectId: this.projectId,
            url: imageUrl,
            description: photo.tags || keyword,
            language: langCode || null,
            locale: localeCode,
            textAmount: this.estimateTextAmount(photo.tags || ''),
            imageType: categoryKey,
            usageCount: 0,
            metadata: {
              width: photo.imageWidth,
              height: photo.imageHeight,
              photographer: photo.user,
              source: 'pixabay',
              keyword,
              category: categoryKey,
              locale: localeCode,
              language: langCode,
              pixabayId: photo.id,
              pageURL: photo.pageURL,
              collectedAt: new Date().toISOString(),
            },
          });
          added++;
        }
      }

      return added;
    } catch (err) {
      console.warn(`Pixabay error for "${keyword}":`, err.message);
      return 0;
    }
  }

  // Enhanced Pexels scraping
  async scrapeFromPexels(keyword, localeCode, fullLocaleCode, categoryKey) {
    const API_KEY = process.env.PEXELS_API_KEY;
    if (!API_KEY) return 0;

    try {
      const params = {
        query: keyword,
        per_page: 80
      };
      
      if (localeCode) {
        params.locale = localeCode;
      }

      const { data } = await axios.get('https://api.pexels.com/v1/search', {
        params,
        headers: { Authorization: API_KEY }
      });

      let added = 0;

      for (const photo of data.photos || []) {
        const imageUrl = photo.src.original;
        
        if (!imageUrl || this.seen.has(imageUrl)) continue;
        this.seen.add(imageUrl);

        const exists = await Photo.exists({ projectId: this.projectId, url: imageUrl });
        if (!exists) {
          await Photo.create({
            projectId: this.projectId,
            url: imageUrl,
            description: photo.alt || keyword,
            language: localeCode || null,
            locale: fullLocaleCode,
            textAmount: this.estimateTextAmount(photo.alt || ''),
            imageType: categoryKey,
            usageCount: 0,
            metadata: {
              width: photo.width,
              height: photo.height,
              photographer: photo.photographer,
              source: 'pexels',
              keyword,
              category: categoryKey,
              locale: fullLocaleCode,
              language: localeCode,
              pexelsId: photo.id,
              collectedAt: new Date().toISOString(),
            },
          });
          added++;
        }
      }

      return added;
    } catch (err) {
      console.warn(`Pexels error for "${keyword}":`, err.message);
      return 0;
    }
  }

  // Enhanced Unsplash scraping
  async scrapeFromUnsplash(keyword, localeCode, categoryKey) {
    const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    if (!ACCESS_KEY) return 0;

    try {
      // Add locale-specific terms to keyword for better localization
      const localizedKeyword = this.localizeKeywordForUnsplash(keyword, localeCode);
      
      const { data } = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: localizedKeyword,
          per_page: 30
        },
        headers: {
          Authorization: `Client-ID ${ACCESS_KEY}`
        }
      });

      let added = 0;

      for (const photo of data.results || []) {
        const imageUrl = photo.urls?.full || photo.urls?.regular;
        
        if (!imageUrl || this.seen.has(imageUrl)) continue;
        this.seen.add(imageUrl);

        const exists = await Photo.exists({ projectId: this.projectId, url: imageUrl });
        if (!exists) {
          await Photo.create({
            projectId: this.projectId,
            url: imageUrl,
            description: photo.alt_description || photo.description || keyword,
            language: null,
            locale: localeCode,
            textAmount: this.estimateTextAmount(photo.alt_description || ''),
            imageType: categoryKey,
            usageCount: 0,
            metadata: {
              width: photo.width,
              height: photo.height,
              photographer: photo.user?.name,
              source: 'unsplash',
              keyword: localizedKeyword,
              category: categoryKey,
              locale: localeCode,
              unsplashId: photo.id,
              collectedAt: new Date().toISOString(),
            },
          });
          added++;
        }
      }

      return added;
    } catch (err) {
      console.warn(`Unsplash error for "${keyword}":`, err.message);
      return 0;
    }
  }

  // Enhanced Wikimedia scraping
  async scrapeFromWikimedia(keyword, localeCode, categoryKey) {
    try {
      const localizedKeyword = this.localizeKeywordForWikimedia(keyword, localeCode);
      const searchUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(localizedKeyword)}&title=Special:MediaSearch&go=Go&type=image`;

      const { data } = await axios.get(searchUrl);
      const $ = cheerio.load(data);

      let added = 0;

      $('figure.sdms-search-result__media').each(async (i, el) => {
        if (i >= 40) return false; // Limit results

        const img = $(el).find('img');
        const imageUrl = img.attr('src')?.trim();
        const altText = img.attr('alt')?.trim();

        if (!imageUrl || this.seen.has(imageUrl) || imageUrl.endsWith('.svg')) return;
        this.seen.add(imageUrl);

        const exists = await Photo.exists({ projectId: this.projectId, url: imageUrl });
        if (!exists) {
          await Photo.create({
            projectId: this.projectId,
            url: imageUrl,
            description: altText || keyword,
            language: null,
            locale: localeCode,
            textAmount: this.estimateTextAmount(altText || ''),
            imageType: categoryKey,
            usageCount: 0,
            metadata: {
              source: 'wikimedia',
              keyword: localizedKeyword,
              category: categoryKey,
              locale: localeCode,
              altText,
              collectedAt: new Date().toISOString(),
            },
          });
          added++;
        }
      });

      return added;
    } catch (err) {
      console.warn(`Wikimedia error for "${keyword}":`, err.message);
      return 0;
    }
  }

  // Utility functions
  localizeKeywordForUnsplash(keyword, localeCode) {
    const locationTerms = {
      'ja_JP': ['Japan', 'Japanese', 'Tokyo'],
      'ko_KR': ['Korea', 'Korean', 'Seoul'],
      'zh_CN': ['China', 'Chinese', 'Beijing'],
      'zh_HK': ['Hong Kong', 'Chinese'],
      'fr_FR': ['France', 'French', 'Paris'],
      'de_DE': ['Germany', 'German', 'Berlin'],
      'es_ES': ['Spain', 'Spanish', 'Madrid'],
      'it_IT': ['Italy', 'Italian', 'Rome'],
      'ru_RU': ['Russia', 'Russian', 'Moscow']
    };

    const terms = locationTerms[localeCode];
    if (terms && Math.random() < 0.3) { // 30% chance to add location term
      return `${keyword} ${terms[Math.floor(Math.random() * terms.length)]}`;
    }
    return keyword;
  }

  localizeKeywordForWikimedia(keyword, localeCode) {
    // Similar localization for Wikimedia
    return this.localizeKeywordForUnsplash(keyword, localeCode);
  }

  estimateTextAmount(description) {
    if (!description) return 'none';
    const wordCount = description.split(/\s+/).length;
    if (wordCount < 3) return 'minimal';
    if (wordCount < 8) return 'moderate';
    return 'substantial';
  }

  updateProgress(languageCode, categoryKey, added) {
    const langProgress = this.progress.get(languageCode);
    langProgress.total += added;
    langProgress.categories[categoryKey] += added;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main collection orchestrator
  async startCollection() {
    console.log(`🚀 Starting massive image collection: ${this.targetTotal} images across ${LANGUAGES.length} languages`);
    
    let totalCollected = 0;
    const startTime = Date.now();

    // Phase 1: High-priority languages (better API support)
    const highPriorityLanguages = LANGUAGES.filter(lang => 
      lang.pixabay && ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'].includes(lang.pixabay)
    );

    console.log(`📍 Phase 1: Collecting from ${highPriorityLanguages.length} high-priority languages`);
    
    for (const language of highPriorityLanguages) {
      console.log(`\n🌍 Processing language: ${language.name} (${language.code})`);
      
      for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
        const collected = await this.collectForLanguageAndCategory(language, categoryKey, this.targetPerCategory);
        totalCollected += collected;
        
        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = totalCollected / elapsed;
        const eta = (this.targetTotal - totalCollected) / rate;
        
        console.log(`📊 Progress: ${totalCollected}/${this.targetTotal} (${(totalCollected/this.targetTotal*100).toFixed(1)}%) | Rate: ${rate.toFixed(1)}/sec | ETA: ${(eta/3600).toFixed(1)}h`);
      }
    }

    // Phase 2: Remaining languages
    const remainingLanguages = LANGUAGES.filter(lang => !highPriorityLanguages.includes(lang));
    
    console.log(`\n📍 Phase 2: Collecting from ${remainingLanguages.length} remaining languages`);
    
    for (const language of remainingLanguages) {
      console.log(`\n🌍 Processing language: ${language.name} (${language.code})`);
      
      for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
        const collected = await this.collectForLanguageAndCategory(language, categoryKey, this.targetPerCategory);
        totalCollected += collected;
        
        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = totalCollected / elapsed;
        
        console.log(`📊 Progress: ${totalCollected}/${this.targetTotal} (${(totalCollected/this.targetTotal*100).toFixed(1)}%) | Rate: ${rate.toFixed(1)}/sec`);
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n🎉 Collection completed! ${totalCollected} images collected in ${(totalTime/3600).toFixed(1)} hours`);
    
    return this.generateReport();
  }

  generateReport() {
    const report = {
      totalImages: 0,
      languageDistribution: {},
      categoryDistribution: {},
      sourceDistribution: {},
      completedAt: new Date().toISOString()
    };

    // Calculate distributions
    for (const [langCode, progress] of this.progress.entries()) {
      report.totalImages += progress.total;
      report.languageDistribution[langCode] = progress.total;
      
      for (const [categoryKey, count] of Object.entries(progress.categories)) {
        if (!report.categoryDistribution[categoryKey]) {
          report.categoryDistribution[categoryKey] = 0;
        }
        report.categoryDistribution[categoryKey] += count;
      }
    }

    return report;
  }
}

// API endpoint to start massive collection
app.post('/api/projects/:id/massive-collection', async (req, res) => {
  try {
    const projectId = req.params.id;
    const collector = new MassiveImageCollector(projectId);
    
    // Start collection in background
    collector.startCollection().then(report => {
      console.log('📊 Final Report:', report);
    }).catch(err => {
      console.error('❌ Collection failed:', err);
    });

    res.json({ 
      message: 'Massive collection started',
      target: 150000,
      languages: LANGUAGES.length,
      categories: Object.keys(CATEGORIES).length
    });

  } catch (err) {
    console.error('Error starting massive collection:', err);
    res.status(500).json({ error: 'Failed to start collection' });
  }
});

// API endpoint to get collection progress
app.get('/api/projects/:id/collection-progress', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Convert string to ObjectId for MongoDB queries
    const ObjectId = mongoose.Types.ObjectId;
    const projectObjectId = new ObjectId(projectId);
    
    // Get current counts from database
    const totalCount = await Photo.countDocuments({ projectId: projectObjectId });
    
    // Get distribution by language
    const languageDistribution = await Photo.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$locale', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get distribution by category
    const categoryDistribution = await Photo.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$imageType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get distribution by source
    const sourceDistribution = await Photo.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$metadata.source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalImages: totalCount,
      target: 150000,
      progress: (totalCount / 150000 * 100).toFixed(2),
      languageDistribution: languageDistribution.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      categoryDistribution: categoryDistribution.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      sourceDistribution: sourceDistribution.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {})
    });

  } catch (err) {
    console.error('Error getting collection progress:', err);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

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