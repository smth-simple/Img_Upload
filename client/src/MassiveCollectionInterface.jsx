import React, { useState, useEffect } from 'react';
import { Play, Pause, BarChart3, Globe, Image, TrendingUp } from 'lucide-react';
import axios from 'axios'; // Add this import

export default function MassiveCollectionInterface({ projectId }) {
  const [progress, setProgress] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch progress data
  const fetchProgress = async () => {
    try {
      // Use axios instead of fetch to use the same base URL configuration
      const response = await axios.get(`/api/projects/${projectId}/collection-progress`);
      setProgress(response.data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  // Start massive collection
  const startCollection = async () => {
    setLoading(true);
    try {
      // Use axios instead of fetch
      const response = await axios.post(`/api/projects/${projectId}/massive-collection`);
      setIsCollecting(true);
      console.log('Collection started:', response.data);
      
      // Show alert to user
      alert(`Massive collection started!\n\nTarget: ${response.data.target} images\nLanguages: ${response.data.languages}\nCategories: ${response.data.categories}\n\nThe collection is now running in the background. You can monitor progress on this page.`);
    } catch (err) {
      console.error('Failed to start collection:', err);
      alert('Failed to start collection. Please check the console for details.');
    }
    setLoading(false);
  };

  // Auto-refresh progress every 30 seconds
  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const progressPercent = progress ? parseFloat(progress.progress) : 0;
  const totalImages = progress?.totalImages || 0;
  const target = progress?.target || 150000;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Massive Image Collection Dashboard
        </h1>
        <p className="text-gray-600">
          Collecting 150,000 localized images across 39 languages and 12 categories
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5" />
          Collection Control
        </h2>
        
        <div className="flex items-center gap-4">
          <button
            onClick={startCollection}
            disabled={loading || isCollecting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
              isCollecting
                ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                : loading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                Starting...
              </>
            ) : isCollecting ? (
              <>
                <Pause className="w-4 h-4" />
                Collection Running
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Massive Collection
              </>
            )}
          </button>

          <button
            onClick={fetchProgress}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <TrendingUp className="w-4 h-4" />
            Refresh Progress
          </button>
        </div>
      </div>

      {/* Rest of the component stays the same */}
      {/* Progress Overview */}
      {progress && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Collection Progress
          </h2>
          
          {/* Main Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">
                {totalImages.toLocaleString()} / {target.toLocaleString()} images
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              ></div>
            </div>
            <div className="mt-1 text-right">
              <span className="text-lg font-bold text-blue-600">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Image className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Images</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {totalImages.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Languages</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.keys(progress.languageDistribution || {}).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Object.keys(progress.categoryDistribution || {}).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Distribution */}
      {progress?.languageDistribution && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {Object.entries(progress.languageDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([language, count]) => (
                <div key={language} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{language}</span>
                  <span className="text-blue-600 font-bold">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {progress?.categoryDistribution && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5" />
            Category Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(progress.categoryDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 capitalize">
                    {category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-green-600 font-bold">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Source Distribution */}
      {progress?.sourceDistribution && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Source Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(progress.sourceDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([source, count]) => (
                <div key={source} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 capitalize">{source}</span>
                  <span className="text-purple-600 font-bold">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Collection Strategy Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Collection Strategy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Target Distribution</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• ~3,850 images per language (39 languages)</li>
              <li>• ~320 images per category per language</li>
              <li>• 12 diverse image categories</li>
              <li>• Multi-source collection strategy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Image Categories</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Arts and Illustrations</li>
              <li>• Daily Objects</li>
              <li>• Documents</li>
              <li>• Faces and People</li>
              <li>• Handwritten Notes</li>
              <li>• Indoor Environments</li>
              <li>• Places and Landscapes</li>
              <li>• Scene Texts</li>
              <li>• Animals</li>
              <li>• Foods</li>
              <li>• Screenshots</li>
              <li>• Graphs and Charts</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-white/50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Collection Sources</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-blue-100 p-2 rounded text-center">
              <strong>Pixabay</strong><br/>
              Primary source<br/>
              ~60,000 images
            </div>
            <div className="bg-green-100 p-2 rounded text-center">
              <strong>Pexels</strong><br/>
              Secondary source<br/>
              ~30,000 images
            </div>
            <div className="bg-purple-100 p-2 rounded text-center">
              <strong>Unsplash</strong><br/>
              High quality<br/>
              ~30,000 images
            </div>
            <div className="bg-orange-100 p-2 rounded text-center">
              <strong>Wikimedia</strong><br/>
              Specialized content<br/>
              ~30,000 images
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important Notes</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• This collection will take several hours to complete</li>
          <li>• Images use temporary URLs that expire in 24 hours</li>
          <li>• Make sure all API keys are properly configured</li>
          <li>• Monitor rate limits to avoid API restrictions</li>
          <li>• The collection runs in the background - you can close this page</li>
        </ul>
      </div>

      {/* Manual Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Manual Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.href = `/projects/${projectId}/storage`}
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
          >
            <Image className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="font-medium">View Storage</span>
            <p className="text-sm text-gray-500 mt-1">Browse collected images</p>
          </button>
          
          <button 
            onClick={() => window.location.href = `/projects/${projectId}/export`}
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
          >
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="font-medium">Export Data</span>
            <p className="text-sm text-gray-500 mt-1">Download collection CSV</p>
          </button>
          
          <button 
            onClick={() => window.location.href = `/projects/${projectId}/analysis`}
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="font-medium">Analysis</span>
            <p className="text-sm text-gray-500 mt-1">View detailed statistics</p>
          </button>
        </div>
      </div>
    </div>
  );
}