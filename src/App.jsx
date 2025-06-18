import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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

  // Render full-screen start or centered project view
  if (screen === 'start') {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'white', padding: '16px'
      }}>
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
    <div style={{ padding: '16px', maxWidth: '768px', margin: '0 auto' }}>
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {screen === 'project' && selectedProject && (
        <ProjectScreen project={selectedProject} onBack={handleBack} onError={setError} />
      )}
    </div>
  );
}

function StartScreen({ projects, onCreate, onSelect, onDelete, onError }) {
  const [name, setName] = useState('');

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
            <span style={{ flexGrow: 1, textAlign: 'center', fontWeight: 500 }}>{p.name}</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ color: '#059669', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => onSelect(p)}>
                Find
              </button>
              <button style={{ color: '#DC2626', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => onDelete(p._id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ProjectScreen remains unchanged
function ProjectScreen({ project, onBack, onError }) {
  const [tab, setTab] = useState('add');
  const [urls, setUrls] = useState('');
  const [photos, setPhotos] = useState([]);
  const [addedCount, setAddedCount] = useState(null);
  const [useCount, setUseCount] = useState(1);
  const [usedPhotos, setUsedPhotos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addMode, setAddMode] = useState('image-database');
const [keywords, setKeywords] = useState('');
const [selectedImageSite, setSelectedImageSite] = useState('unsplash');
const [imageLang, setImageLang] = useState('en');
const [csvFile, setCsvFile] = useState(null);

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
    await loadStorage(); // refresh
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


  const loadStorage = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/projects/${project._id}/photos`);
      setPhotos(data.photos);
      onError(null);
    } catch (err) {
      console.error('Load storage failed', err);
      onError('Failed to load photos.');
    }
  }, [project._id, onError]);

  useEffect(() => {
    if (tab === 'storage') loadStorage();
  }, [tab, loadStorage]);

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
    const payload = {
      mode: addMode,
      site: selectedImageSite,
      keywords: keywordList,
      urls: urlList,
    };

    if (selectedImageSite === 'pixabay') {
      payload.imageLang = imageLang;
    }

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
    await loadStorage(); // refresh photo list
    setSelectedIds([]);
    onError(null);
  } catch (err) {
    console.error('Delete failed', err);
    onError('Failed to delete selected photos.');
  }
}
  
  return (
    <div>
      <button style={{ marginBottom: '16px', color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }} onClick={onBack}>← Back</button>
      <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px' }}>{project.name}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
        {['add', 'storage', 'use'].map(t => (
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
    <div style={{ marginTop: '10px' }}>
      <label style={{ fontWeight: 'bold' }}>Image Site:</label>
      <select
        value={selectedImageSite}
        onChange={e => setSelectedImageSite(e.target.value)}
        style={{ marginLeft: '8px' }}
      >
        <option value="unsplash">Unsplash</option>
        <option value="pexels">Pexels</option>
        <option value="pixabay">Pixabay</option>
        <option value="freepik">Freepik</option>
        <option value="wikimedia">Wikimedia Commons</option>
      </select>
    </div>

{selectedImageSite === 'pixabay' && (
  <div style={{ marginTop: '10px' }}>
    <label style={{ fontWeight: 'bold' }}>Language:</label>
    <select
      value={imageLang}
      onChange={e => setImageLang(e.target.value)}
      style={{ marginLeft: '8px' }}
    >
      <option value="">None</option>
      <option value="cs">Czech (cs)</option>
      <option value="da">Danish (da)</option>
      <option value="de">German (de)</option>
      <option value="en">English (en)</option>
      <option value="es">Spanish (es)</option>
      <option value="fr">French (fr)</option>
      <option value="id">Indonesian (id)</option>
      <option value="it">Italian (it)</option>
      <option value="hu">Hungarian (hu)</option>
      <option value="nl">Dutch (nl)</option>
      <option value="no">Norwegian (no)</option>
      <option value="pl">Polish (pl)</option>
      <option value="pt">Portuguese (pt)</option>
      <option value="ro">Romanian (ro)</option>
      <option value="sk">Slovak (sk)</option>
      <option value="fi">Finnish (fi)</option>
      <option value="sv">Swedish (sv)</option>
      <option value="tr">Turkish (tr)</option>
      <option value="vi">Vietnamese (vi)</option>
      <option value="th">Thai (th)</option>
      <option value="bg">Bulgarian (bg)</option>
      <option value="ru">Russian (ru)</option>
      <option value="el">Greek (el)</option>
      <option value="ja">Japanese (ja)</option>
      <option value="ko">Korean (ko)</option>
      <option value="zh">Chinese (zh)</option>
    </select>
  </div>
)}


    <div style={{ marginTop: '10px' }}>
      <label style={{ fontWeight: 'bold' }}>Keywords (one per line):</label>
      <textarea
        value={keywords}
        onChange={e => setKeywords(e.target.value)}
        rows={3}
        style={{ width: '100%', marginTop: '6px' }}
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
      style={{ padding: '8px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      onClick={handleAdd}
    >
      Add
    </button>
    {addedCount !== null && <p style={{ marginTop: '8px' }}>Added {addedCount} new photos.</p>}
  </div>
)}

{tab === 'storage' && (
  <div style={{ overflowX: 'auto' }}>
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
          style={{
            padding: '6px 12px',
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Import CSV
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: '6px 12px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Export CSV
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
      </div>

      <button
        style={{
          padding: '6px 12px',
          backgroundColor: selectedIds.length ? '#DC2626' : '#E5E7EB',
          color: selectedIds.length ? 'white' : '#9CA3AF',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedIds.length ? 'pointer' : 'not-allowed'
        }}
        onClick={handleDeleteSelected}
        disabled={!selectedIds.length}
      >
        Delete Selected ({selectedIds.length})
      </button>
    </div>



   <div style={{ overflowX: 'auto', marginTop: '20px', width: '100%' }}>
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    tableLayout: 'fixed',
    background: 'white'
  }}>
<thead>
  <tr>
    <th style={{ ...th, width: '40px', textAlign: 'center' }}>
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
      {photos.map(p => (
        <tr key={p._id} style={{ background: '#F9FAFB', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <td style={{ padding: '6px', textAlign: 'center' }}>
            <input
              type="checkbox"
              checked={selectedIds.includes(p._id)}
              onChange={() => togglePhotoSelection(p._id)}
            />
          </td>
          <td style={{ ...td, wordWrap: 'break-word' }}>{p.url}</td>
          <td style={{ ...td, wordWrap: 'break-word' }}>{p.description || '-'}</td>
          <td style={td}>{p.language || '-'}</td>
          <td style={td}>{p.locale || '-'}</td>
          <td style={td}>{p.textAmount || '-'}</td>
          <td style={td}>{p.imageType || '-'}</td>
          <td style={{ ...td, textAlign: 'center' }}>{p.usageCount}</td>
          <td style={{
            ...td,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {p.metadata ? JSON.stringify(p.metadata, null, 1) : '-'}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

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
            {usedPhotos.map(p => (
              <div key={p._id} style={{ border: '1px solid #DDD', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <img src={p.url} alt="" style={{ width: '100%', height: 'auto' }} />
                <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Used {p.usageCount} times</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
