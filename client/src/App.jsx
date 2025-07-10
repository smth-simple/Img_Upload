import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import MassiveCollectionInterface from './MassiveCollectionInterface'; // ADD THIS LINE
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Configure axios base URL to your backend server (e.g., http://localhost:5000)
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function App() {
  const [screen, setScreen] = useState('start');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data.projects);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setError('Unable to load projects. Make sure your backend is running.');
      setProjects([]);
    }
  }

  function handleSelect(project) {
    setSelectedProject(project);
    setScreen('project');
  }

  async function handleDelete(id) {
    try {
      await axios.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      console.error('Delete failed', err);
      setError('Failed to delete project.');
    }
  }

  function handleBack() {
    setSelectedProject(null);
    setScreen('start');
    fetchProjects();
  }

  if (screen === 'start') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'white', padding: '16px' }}>
        {error && <div style={{ color: 'red', marginBottom: '16px', textAlign: 'center', padding: '0 16px' }}>{error}</div>}
        <StartScreen
          projects={projects}
          onCreate={fetchProjects}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onError={setError}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: '100%', margin: '0 auto' }}>
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {screen === 'project' && selectedProject && (
        <ProjectScreen project={selectedProject} onBack={handleBack} onError={setError} />
      )}
    </div>
  );
}

function StartScreen({ projects, onCreate, onSelect, onDelete, onError }) {
  const [name, setName] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');

  async function create() {
    if (!name.trim()) return;
    try {
      await axios.post('/api/projects', { name });
      setName('');
      onCreate();
      onError(null);
    } catch (err) {
      console.error('Create failed', err);
      onError('Failed to create project.');
    }
  }

  async function handleRename(projectId, newName) {
    if (!newName.trim()) return;
    try {
      await axios.put(`/api/projects/${projectId}`, { name: newName });
      setEditingProject(null);
      setEditName('');
      onCreate(); // Refresh the project list
      onError(null);
    } catch (err) {
      console.error('Rename failed', err);
      onError('Failed to rename project.');
    }
  }

  function startEditing(project) {
    setEditingProject(project._id);
    setEditName(project.name);
  }

  function cancelEditing() {
    setEditingProject(null);
    setEditName('');
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px' }}>Scale Vision Photo Library</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
        <input
          style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          placeholder="New project name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button
          style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          onClick={create}
        >
          Create
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {projects.map(p => (
          <li key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
            {editingProject === p._id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                <input
                  style={{ flexGrow: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleRename(p._id, editName)}
                  autoFocus
                />
                <button 
                  style={{ color: '#059669', cursor: 'pointer', background: 'none', border: 'none', fontSize: '12px' }} 
                  onClick={() => handleRename(p._id, editName)}
                >
                  Save
                </button>
                <button 
                  style={{ color: '#6B7280', cursor: 'pointer', background: 'none', border: 'none', fontSize: '12px' }} 
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span style={{ flexGrow: 1, textAlign: 'center', fontWeight: 500 }}>{p.name}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ color: '#059669', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => onSelect(p)}>
                    Find
                  </button>
                  <button style={{ color: '#2563EB', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => startEditing(p)}>
                    Rename
                  </button>
                  <button style={{ color: '#DC2626', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => onDelete(p._id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectScreen({ project, onBack, onError }) {
  const [tab, setTab] = useState('add');
  const [urls, setUrls] = useState('');
  const [photos, setPhotos] = useState([]);
  const [addedCount, setAddedCount] = useState(null);
  const [useCount, setUseCount] = useState(1);
  const [usedPhotos, setUsedPhotos] = useState([]);
  const [distributionData, setDistributionData] = useState({
    languages: [],
    locales: [],
    textAmounts: [],
    imageTypes: []
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [addMode, setAddMode] = useState('image-database');
  const [keywords, setKeywords] = useState('');
  const [selectedImageSites, setSelectedImageSites] = useState(['unsplash']);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    language: [],
    locale: [],
    textAmount: [],
    imageType: [],
    usage: []
  });
  const [appliedFilters, setAppliedFilters] = useState({
    language: [],
    locale: [],
    textAmount: [],
    imageType: [],
    usage: []
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [availableFilters, setAvailableFilters] = useState({
    languages: [],
    locales: [],
    textAmounts: [],
    imageTypes: [],
    usageRanges: []
  });
  
  // Ref for infinite scroll
  const tableContainerRef = useRef(null);

  const PHOTOS_PER_PAGE = 100;

  const th = {
    padding: '6px',
    textAlign: 'left',
    borderBottom: '1px solid #E5E7EB',
    whiteSpace: 'nowrap'
  };

  const td = {
    padding: '6px',
    verticalAlign: 'top'
  };

  function handleCsvUpload(e) {
    setCsvFile(e.target.files[0]);
  }

  async function handleImport() {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('csv', csvFile);

    try {
      await axios.post(`/api/projects/${project._id}/photos/import`, formData);
      await loadStorage(true); // refresh with reset
      alert('Import successful!');
    } catch (err) {
      console.error('Full error details:', err.response?.data || err.message || err);
      console.error('Import failed', err);
      alert('Import failed');
    }
  }

  async function handleExport() {
    try {
      const res = await axios.get(`/api/projects/${project._id}/photos/export`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'photos_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed');
    }
  }

  const loadDistribution = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/projects/${project._id}/photos/distribution`, {
        params: appliedFilters
      });
      setDistributionData(data);
      onError(null);
    } catch (err) {
      console.error('Load distribution failed', err);
      onError('Failed to load distribution data.');
    } finally {
      setLoading(false);
    }
  }, [project._id, onError, appliedFilters]);

  const loadStorage = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const { data } = await axios.get(`/api/projects/${project._id}/photos`, {
        params: {
          page: currentPage,
          limit: PHOTOS_PER_PAGE,
          ...appliedFilters
        }
      });
      
      if (reset) {
        setPhotos(data.photos);
        setPage(1);
        setSelectedIds([]);
      } else {
        setPhotos(prev => [...prev, ...data.photos]);
      }
      
      setTotalPhotos(data.total || data.photos.length);
      setFilteredCount(data.filteredCount || data.total || data.photos.length);
      setHasMore(data.photos.length === PHOTOS_PER_PAGE && (reset ? data.total > PHOTOS_PER_PAGE : data.photos.length > 0));
      
      // Set available filter options
      if (data.availableFilters) {
        setAvailableFilters(data.availableFilters);
      }
      
      onError(null);
    } catch (err) {
      console.error('Load storage failed', err);
      onError('Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }, [project._id, onError, page, loading, appliedFilters]);

  // Load more photos when scrolling near bottom
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  // Effect to load more photos when page changes
  useEffect(() => {
    if (page > 1) {
      loadStorage();
    }
  }, [page]);

  // Effect to set up scroll listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container && tab === 'storage') {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, tab]);

  // Effect to load storage when switching tabs
  useEffect(() => {
    if (tab === 'storage') {
      loadStorage(true);
    } else if (tab === 'distribution') {
      loadDistribution();
    }
  }, [tab]); // Remove loadStorage and loadDistribution from dependencies

  // Effect to load storage when applied filters change
  useEffect(() => {
    if (tab === 'storage') {
      loadStorage(true);
    } else if (tab === 'distribution') {
      loadDistribution();
    }
  }, [appliedFilters]); // Remove loadStorage and loadDistribution from dependencies

  function handleFilterChange(filterType, value, checked) {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType], value]
        : prev[filterType].filter(item => item !== value)
    }));
  }

  function applyFilters() {
    setAppliedFilters(filters);
    setPage(1);
  }

  function clearAllFilters() {
    const emptyFilters = {
      language: [],
      locale: [],
      textAmount: [],
      imageType: [],
      usage: []
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  }

  function handleImageSiteChange(site, checked) {
    setSelectedImageSites(prev => 
      checked 
        ? [...prev, site]
        : prev.filter(s => s !== site)
    );
  }

  function handleLanguageChange(language, checked) {
    setSelectedLanguages(prev => 
      checked 
        ? [...prev, language]
        : prev.filter(l => l !== language)
    );
  }

  async function selectAllFiltered() {
    try {
      setLoading(true);
      
      // If all filtered photos are already selected, deselect everything
      if (selectedIds.length === filteredCount) {
        setSelectedIds([]);
        onError(null);
        return;
      }
      
      // Otherwise, select all filtered photos
      const { data } = await axios.get(`/api/projects/${project._id}/photos/ids`, {
        params: appliedFilters
      });
      setSelectedIds(data.photoIds);
      onError(null);
    } catch (err) {
      console.error('Failed to select all filtered photos:', err);
      onError('Failed to select all filtered photos.');
    } finally {
      setLoading(false);
    }
  }

  function togglePhotoSelection(photoId) {
    setSelectedIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p._id));
    }
  }

  async function handleAdd() {
    const keywordList = keywords.split('\n').map(k => k.trim()).filter(Boolean);
    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);

    try {
      setIsAdding(true);
      const payload = {
        mode: addMode,
        sites: selectedImageSites, // Changed from single site to array
        languages: selectedLanguages, // Added languages array
        keywords: keywordList,
        urls: urlList,
      };
      
      const { data } = await axios.post(
        `/api/projects/${project._id}/photos/scrape`,
        payload
      );

      setAddedCount(data.added);
      setKeywords('');
      setUrls('');
      onError(null);
    } catch (err) {
      console.error('Add failed', err);
      onError('Failed to add photos.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUse() {
    try {
      const { data } = await axios.post(
        `/api/projects/${project._id}/photos/use`,
        { count: useCount }
      );
      setUsedPhotos(data.photos);
      onError(null);
    } catch (err) {
      console.error('Use failed', err);
      onError('Failed to use photos.');
    }
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) return;
    try {
      await axios.post(`/api/projects/${project._id}/photos/delete`, { ids: selectedIds });
      await loadStorage(true); // refresh photo list with reset
      setSelectedIds([]);
      onError(null);
    } catch (err) {
      console.error('Delete failed', err);
      onError('Failed to delete selected photos.');
    }
  }

  async function checkMigrationStatus() {
    try {
      const { data } = await axios.get(`/api/projects/${project._id}/photos/migration-status`);
      setMigrationStatus(data);
    } catch (err) {
      console.error('Failed to check migration status:', err);
    }
  }

  async function handleMigratePixabay() {
    if (!window.confirm(`This will migrate ${migrationStatus?.needsMigration || 0} Pixabay URLs to permanent URLs. This may take a few minutes. Continue?`)) {
      return;
    }

    try {
      setIsMigrating(true);
      const { data } = await axios.post(`/api/projects/${project._id}/photos/migrate-pixabay`);
      
      alert(`Migration complete!\n\nMigrated: ${data.migrated}\nFailed: ${data.failed}\n\nPlease refresh the page to see the updated URLs.`);
      
      // Refresh migration status and photos
      await checkMigrationStatus();
      await loadStorage(true);
      
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Migration failed. Please check the console for details.');
    } finally {
      setIsMigrating(false);
    }
  }

  // Check migration status when switching to storage tab
  useEffect(() => {
    if (tab === 'storage') {
      checkMigrationStatus();
    }
  }, [tab]);
  
  return (
    <div>
      <button style={{ marginBottom: '16px', color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }} onClick={onBack}>← Back</button>
      <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px' }}>{project.name}</h2>
<div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
  {['add', 'storage', 'use', 'massive'].map(t => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
        backgroundColor: tab === t ? '#3B82F6' : '#E5E7EB',
        color: tab === t ? 'white' : 'black', border: 'none'
      }}
    >
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </button>
  ))}
</div>

      {tab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>Select Add Mode:</label>
          <select
            value={addMode}
            onChange={e => setAddMode(e.target.value)}
            style={{ marginBottom: '12px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="image-database">Search Image Database</option>
            <option value="custom-website">Crawl Normal Website</option>
          </select>

          {addMode === 'image-database' && (
            <>
              {/* Image Sites Selection */}
              <div style={{ marginTop: '16px', width: '100%', maxWidth: '600px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  Image Sites ({selectedImageSites.length} selected):
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '8px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#F9FAFB'
                }}>
                  {[
                    { value: 'unsplash', label: 'Unsplash' },
                    { value: 'pexels', label: 'Pexels' },
                    { value: 'pixabay', label: 'Pixabay' },
                    { value: 'freepik', label: 'Freepik' },
                    { value: 'wikimedia', label: 'Wikimedia Commons' }
                  ].map(site => (
                    <label key={site.value} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={selectedImageSites.includes(site.value)}
                        onChange={e => handleImageSiteChange(site.value, e.target.checked)}
                        style={{ marginRight: '6px' }}
                      />
                      {site.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Language/Locale Selection */}
              {(selectedImageSites.includes('pixabay') || selectedImageSites.includes('pexels')) && (
                <div style={{ marginTop: '16px', width: '100%', maxWidth: '600px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                    Languages/Locales ({selectedLanguages.length} selected):
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6B7280', marginLeft: '8px' }}>
                      (Leave empty to use default for each site)
                    </span>
                  </label>
                  <div style={{ 
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#F9FAFB'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                      gap: '6px'
                    }}>
                      {/* Pixabay Languages */}
                      {selectedImageSites.includes('pixabay') && (
                        <>
                          <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                            Pixabay Languages:
                          </div>
                          {[
                            { value: 'cs', label: 'Czech (cs)' },
                            { value: 'da', label: 'Danish (da)' },
                            { value: 'de', label: 'German (de)' },
                            { value: 'en', label: 'English (en)' },
                            { value: 'es', label: 'Spanish (es)' },
                            { value: 'fr', label: 'French (fr)' },
                            { value: 'id', label: 'Indonesian (id)' },
                            { value: 'it', label: 'Italian (it)' },
                            { value: 'hu', label: 'Hungarian (hu)' },
                            { value: 'nl', label: 'Dutch (nl)' },
                            { value: 'no', label: 'Norwegian (no)' },
                            { value: 'pl', label: 'Polish (pl)' },
                            { value: 'pt', label: 'Portuguese (pt)' },
                            { value: 'ro', label: 'Romanian (ro)' },
                            { value: 'sk', label: 'Slovak (sk)' },
                            { value: 'fi', label: 'Finnish (fi)' },
                            { value: 'sv', label: 'Swedish (sv)' },
                            { value: 'tr', label: 'Turkish (tr)' },
                            { value: 'vi', label: 'Vietnamese (vi)' },
                            { value: 'th', label: 'Thai (th)' },
                            { value: 'bg', label: 'Bulgarian (bg)' },
                            { value: 'ru', label: 'Russian (ru)' },
                            { value: 'el', label: 'Greek (el)' },
                            { value: 'ja', label: 'Japanese (ja)' },
                            { value: 'ko', label: 'Korean (ko)' },
                            { value: 'zh', label: 'Chinese (zh)' }
                          ].map(lang => (
                            <label key={`pixabay-${lang.value}`} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={selectedLanguages.includes(`pixabay:${lang.value}`)}
                                onChange={e => handleLanguageChange(`pixabay:${lang.value}`, e.target.checked)}
                                style={{ marginRight: '4px' }}
                              />
                              {lang.label}
                            </label>
                          ))}
                        </>
                      )}
                      
                      {/* Pexels Locales */}
                      {selectedImageSites.includes('pexels') && (
                        <>
                          <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', fontSize: '12px', color: '#374151', marginTop: '8px', marginBottom: '4px' }}>
                            Pexels Locales:
                          </div>
                          {[
                            { value: 'en-US', label: 'English (US)' },
                            { value: 'pt-BR', label: 'Portuguese (Brazil)' },
                            { value: 'es-ES', label: 'Spanish (Spain)' },
                            { value: 'ca-ES', label: 'Catalan (Spain)' },
                            { value: 'de-DE', label: 'German (Germany)' },
                            { value: 'it-IT', label: 'Italian (Italy)' },
                            { value: 'fr-FR', label: 'French (France)' },
                            { value: 'sv-SE', label: 'Swedish (Sweden)' },
                            { value: 'id-ID', label: 'Indonesian (Indonesia)' },
                            { value: 'pl-PL', label: 'Polish (Poland)' },
                            { value: 'ja-JP', label: 'Japanese (Japan)' },
                            { value: 'zh-TW', label: 'Chinese (Taiwan)' },
                            { value: 'zh-CN', label: 'Chinese (China)' },
                            { value: 'ko-KR', label: 'Korean (Korea)' },
                            { value: 'th-TH', label: 'Thai (Thailand)' },
                            { value: 'nl-NL', label: 'Dutch (Netherlands)' },
                            { value: 'hu-HU', label: 'Hungarian (Hungary)' },
                            { value: 'vi-VN', label: 'Vietnamese (Vietnam)' },
                            { value: 'cs-CZ', label: 'Czech (Czech Republic)' },
                            { value: 'da-DK', label: 'Danish (Denmark)' },
                            { value: 'fi-FI', label: 'Finnish (Finland)' },
                            { value: 'uk-UA', label: 'Ukrainian (Ukraine)' },
                            { value: 'el-GR', label: 'Greek (Greece)' },
                            { value: 'ro-RO', label: 'Romanian (Romania)' },
                            { value: 'nb-NO', label: 'Norwegian (Norway)' },
                            { value: 'sk-SK', label: 'Slovak (Slovakia)' },
                            { value: 'tr-TR', label: 'Turkish (Turkey)' },
                            { value: 'ru-RU', label: 'Russian (Russia)' }
                          ].map(locale => (
                            <label key={`pexels-${locale.value}`} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={selectedLanguages.includes(`pexels:${locale.value}`)}
                                onChange={e => handleLanguageChange(`pexels:${locale.value}`, e.target.checked)}
                                style={{ marginRight: '4px' }}
                              />
                              {locale.label}
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', width: '100%', maxWidth: '600px' }}>
                <label style={{ fontWeight: 'bold' }}>Keywords (one per line):</label>
                <textarea
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  rows={4}
                  style={{ width: '100%', marginTop: '6px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="Enter keywords, one per line&#10;Example:&#10;nature&#10;technology&#10;business"
                />
              </div>
            </>
          )}

          {addMode === 'custom-website' && (
            <textarea
              style={{ width: '100%', maxWidth: '400px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '8px' }}
              rows={4}
              placeholder="Enter one website URL per line"
              value={urls}
              onChange={e => setUrls(e.target.value)}
            />
          )}

          <button
            style={{
              padding: '8px 16px',
              backgroundColor: isAdding ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isAdding ? 'not-allowed' : 'pointer'
            }}
            disabled={isAdding}
            onClick={handleAdd}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
          {addedCount !== null && <p style={{ marginTop: '8px' }}>Added {addedCount} new photos.</p>}
        </div>
      )}

      {tab === 'storage' && (
        <div>
          {/* Migration Status Alert - Only show if there are Pixabay photos that need migration */}
          {migrationStatus && migrationStatus.needsMigration > 0 && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#92400E', marginBottom: '4px' }}>
                  ⚠️ Pixabay URL Migration Available
                </div>
                <div style={{ fontSize: '14px', color: '#78350F' }}>
                  {migrationStatus.needsMigration.toLocaleString()} of {migrationStatus.totalPixabay.toLocaleString()} Pixabay photos need migration to permanent URLs.
                  {migrationStatus.migrated > 0 && ` (${migrationStatus.migrated.toLocaleString()} already migrated)`}
                </div>
              </div>
              <button
                onClick={handleMigratePixabay}
                disabled={isMigrating}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isMigrating ? '#9CA3AF' : '#F59E0B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isMigrating ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isMigrating ? 'Migrating...' : 'Migrate Now'}
              </button>
            </div>
          )}

          {/* Total photos count */}
          <div style={{ 
            marginBottom: '16px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              Total Photos: {totalPhotos.toLocaleString()}
              {(filteredCount !== totalPhotos) && (
                <span style={{ color: '#059669', marginLeft: '12px' }}>
                  Filtered: {filteredCount.toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={clearAllFilters}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear All Filters
            </button>
          </div>

          {/* Filter Controls */}
          <div style={{ 
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            {/* Filter Toggle Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: showFilters ? '16px' : '0'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                Filters
                {!showFilters && (
                  <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6B7280', marginLeft: '8px' }}>
                    ({Object.values(filters).flat().length} active)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Filter Content */}
            {showFilters && (
              <>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {/* Language Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Language ({filters.language.length} selected)
                    </label>
                    <div style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px', 
                      padding: '8px',
                      backgroundColor: 'white'
                    }}>
                      {availableFilters.languages.map(lang => (
                        <label key={lang} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.language.includes(lang)}
                            onChange={e => handleFilterChange('language', lang, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {lang || 'None'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Locale Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Locale ({filters.locale.length} selected)
                    </label>
                    <div style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px', 
                      padding: '8px',
                      backgroundColor: 'white'
                    }}>
                      {availableFilters.locales.map(locale => (
                        <label key={locale} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.locale.includes(locale)}
                            onChange={e => handleFilterChange('locale', locale, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {locale || 'None'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Text Amount Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Text Amount ({filters.textAmount.length} selected)
                    </label>
                    <div style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px', 
                      padding: '8px',
                      backgroundColor: 'white'
                    }}>
                      {['text-heavy', 'text-light'].map(amount => (
                        <label key={amount} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.textAmount.includes(amount)}
                            onChange={e => handleFilterChange('textAmount', amount, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {amount === 'text-heavy' ? 'Text Heavy' : 'Text Light'}
                        </label>
                      ))}
                      {availableFilters.textAmounts.filter(amount => !['text-heavy', 'text-light'].includes(amount)).map(amount => (
                        <label key={amount} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.textAmount.includes(amount)}
                            onChange={e => handleFilterChange('textAmount', amount, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {amount || 'None'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Image Type Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Image Type ({filters.imageType.length} selected)
                    </label>
                    <div style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px', 
                      padding: '8px',
                      backgroundColor: 'white'
                    }}>
                      {[
                        'Animals and Pets',
                        'Art and Illustrations',
                        'Daily objects',
                        'Documents',
                        'Faces and people',
                        'Foods',
                        'Graphs and Charts',
                        'Handwritten notes',
                        'Indoor environments',
                        'Places and Landscapes',
                        'Scene texts',
                        'Screenshots'
                      ].map(type => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.imageType.includes(type)}
                            onChange={e => handleFilterChange('imageType', type, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {type}
                        </label>
                      ))}
                      {availableFilters.imageTypes.filter(type => ![
                        'Animals and Pets',
                        'Art and Illustrations',
                        'Daily objects',
                        'Documents',
                        'Faces and people',
                        'Foods',
                        'Graphs and Charts',
                        'Handwritten notes',
                        'Indoor environments',
                        'Places and Landscapes',
                        'Scene texts',
                        'Screenshots'
                      ].includes(type)).map(type => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.imageType.includes(type)}
                            onChange={e => handleFilterChange('imageType', type, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {type || 'None'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Usage Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Usage Count ({filters.usage.length} selected)
                    </label>
                    <div style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px', 
                      padding: '8px',
                      backgroundColor: 'white'
                    }}>
                      {[
                        { value: '0', label: 'Never Used (0)' },
                        { value: '1', label: 'Used Once (1)' },
                        { value: '2', label: 'Used Twice (2)' },
                        { value: '3', label: 'Used 3 times (3)' },
                        { value: '4+', label: 'Used 4+ times' }
                      ].map(usage => (
                        <label key={usage.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={filters.usage.includes(usage.value)}
                            onChange={e => handleFilterChange('usage', usage.value, e.target.checked)}
                            style={{ marginRight: '6px' }}
                          />
                          {usage.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Apply Filter Button */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    onClick={applyFilters}
                    disabled={loading}
                    style={{
                      padding: '8px 24px',
                      backgroundColor: loading ? '#9CA3AF' : '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? 'Loading...' : 'Apply Filters'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div style={{ 
            marginBottom: '12px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
              />
              <button
                onClick={handleImport}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: loading ? '#9CA3AF' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Import CSV'}
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: loading ? '#9CA3AF' : '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Export CSV'}
              </button>
              <a
                href="/photo_template.csv"
                download
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '12px'
                }}
              >
                Download CSV Template
              </a>
              <button
                onClick={selectAllFiltered}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: loading ? '#9CA3AF' : '#7C3AED',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                              {loading ? 'Loading...' : (selectedIds.length === filteredCount ? 'De-Select All' : 'Select All Filtered')}
              </button>
            </div>

            <button
              style={{
                padding: '6px 12px',
                backgroundColor: (selectedIds.length && !loading) ? '#DC2626' : '#E5E7EB',
                color: (selectedIds.length && !loading) ? 'white' : '#9CA3AF',
                border: 'none',
                borderRadius: '4px',
                cursor: (selectedIds.length && !loading) ? 'pointer' : 'not-allowed'
              }}
              onClick={handleDeleteSelected}
              disabled={!selectedIds.length || loading}
            >
              {loading ? 'Loading...' : `Delete Selected (${selectedIds.length})`}
            </button>
          </div>

          <div 
            ref={tableContainerRef}
            style={{ 
              overflowY: 'auto',
              maxHeight: '600px',
              marginTop: '20px', 
              width: '100%',
              border: '1px solid #E5E7EB',
              borderRadius: '4px'
            }}
          >
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              background: 'white',
              tableLayout: 'fixed'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ ...th, width: '50px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === photos.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(photos.map(p => p._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ ...th, width: '300px' }}>Photo URL</th>
                  <th style={{ ...th, width: '200px' }}>Description</th>
                  <th style={{ ...th, width: '120px' }}>Language</th>
                  <th style={{ ...th, width: '120px' }}>Locale</th>
                  <th style={{ ...th, width: '100px' }}>Text Amount</th>
                  <th style={{ ...th, width: '120px' }}>Image Type</th>
                  <th style={{ ...th, width: '80px' }}>Usage</th>
                  <th style={{ ...th, width: '400px' }}>Metadata</th>
                </tr>
              </thead>

              <tbody>
                {photos.map(p => {
                  const isPixabay = p.metadata?.source === 'pixabay';
                  const isPermanentUrl = p.url?.includes('pixabay.com/photos/');
                  
                  return (
                    <tr key={p._id} style={{ background: '#F9FAFB', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p._id)}
                          onChange={() => togglePhotoSelection(p._id)}
                        />
                      </td>
                      <td style={{ ...td, wordWrap: 'break-word' }}>
                        {p.url}
                        {isPixabay && !isPermanentUrl && (
                          <span style={{ 
                            display: 'inline-block',
                            marginLeft: '8px',
                            padding: '2px 6px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '10px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            TEMP URL
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, wordWrap: 'break-word' }}>{p.description || '-'}</td>
                      <td style={td}>{p.language || '-'}</td>
                      <td style={td}>{p.locale || '-'}</td>
                      <td style={td}>{p.textAmount || '-'}</td>
                      <td style={td}>{p.imageType || '-'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{p.usageCount}</td>
                      <td style={{ ...td, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {p.metadata ? JSON.stringify(p.metadata, null, 1) : '-'}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Loading indicator */}
                {loading && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#6B7280' }}>
                      Loading more photos...
                    </td>
                  </tr>
                )}
                
                {/* End of data indicator */}
                {!hasMore && photos.length > 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#6B7280' }}>
                      End of photos ({photos.length} of {filteredCount !== totalPhotos ? filteredCount : totalPhotos} loaded)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'distribution' && (
        <div>
          <div style={{ 
            marginBottom: '16px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
            textAlign: 'center'
          }}>
            Data Distribution Analysis
            {(filteredCount !== totalPhotos) && (
              <div style={{ color: '#059669', fontSize: '14px', marginTop: '4px' }}>
                Based on {filteredCount.toLocaleString()} filtered photos
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '16px', color: '#6B7280' }}>
              Loading distribution data...
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Language & Locale Distribution */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '24px' 
              }}>
                {/* Languages Chart */}
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                    Languages Distribution
                  </h3>
                  {distributionData.languages.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData.languages} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No language data available
                    </div>
                  )}
                </div>

                {/* Locales Chart */}
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                    Locales Distribution
                  </h3>
                  {distributionData.locales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData.locales} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No locale data available
                    </div>
                  )}
                </div>
              </div>

              {/* Text Amount & Image Type Distribution */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '24px' 
              }}>
                {/* Text Amount Pie Chart */}
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                    Text Amount Distribution
                  </h3>
                  {distributionData.textAmounts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributionData.textAmounts}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {distributionData.textAmounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No text amount data available
                    </div>
                  )}
                </div>

                {/* Image Type Chart */}
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                    Image Types Distribution
                  </h3>
                  {distributionData.imageTypes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData.imageTypes} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={120}
                          fontSize={10}
                          interval={0}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#DC2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No image type data available
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Statistics */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                  Summary Statistics
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px' 
                }}>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>
                      {distributionData.languages.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Unique Languages</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                      {distributionData.locales.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Unique Locales</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>
                      {distributionData.textAmounts.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Text Amount Types</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>
                      {distributionData.imageTypes.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Image Categories</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'use' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label>How many:</label>
            <input
              type="number"
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
              value={useCount}
              onChange={e => setUseCount(+e.target.value)}
              min={1}
            />
            <button style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleUse}>
              Use
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px', justifyItems: 'center' }}>
            {usedPhotos.map(p => {
              const isPixabay = p.metadata?.source === 'pixabay';
              const isPermanentUrl = p.url?.includes('pixabay.com/photos/');
              // For Pixabay photos with permanent URLs, use the temp image URL for display
              const displayUrl = (isPixabay && isPermanentUrl && p.metadata?.tempImageUrl) 
                ? p.metadata.tempImageUrl 
                : p.url;
              
              return (
                <div key={p._id} style={{ border: '1px solid #DDD', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <img 
                    src={displayUrl} 
                    alt="" 
                    style={{ width: '100%', height: 'auto' }}
                    onError={(e) => {
                      // Fallback to preview URL if main image fails
                      if (isPixabay && p.metadata?.previewURL) {
                        e.target.src = p.metadata.previewURL;
                      }
                    }}
                  />
                  <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Used {p.usageCount} times</p>
                  {isPixabay && (
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: isPermanentUrl ? '#059669' : '#92400E',
                      backgroundColor: isPermanentUrl ? '#D1FAE5' : '#FEF3C7',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}>
                      {isPermanentUrl ? '✓ Permanent' : '⚠️ Temp URL'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'massive' && (
  <MassiveCollectionInterface projectId={project._id} />
)}
    </div>
  );
}