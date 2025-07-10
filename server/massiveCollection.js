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
    
    // Get current counts from database
    const totalCount = await Photo.countDocuments({ projectId });
    
    // Get distribution by language
    const languageDistribution = await Photo.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$locale', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get distribution by category
    const categoryDistribution = await Photo.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$imageType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get distribution by source
    const sourceDistribution = await Photo.aggregate([
      { $match: { projectId } },
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