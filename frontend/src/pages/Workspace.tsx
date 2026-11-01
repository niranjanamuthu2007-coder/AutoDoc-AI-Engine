import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useRepository } from '../context/RepositoryContext';
import { 
  Upload, 
  Files, 
  BarChart3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FolderDown, 
  Code2 
} from 'lucide-react';
export const Workspace: React.FC = () => {
  const { 
    repositories, 
    activeRepo, 
    fetchRepositories, 
    setActiveRepoById, 
    isLoading: contextLoading 
  } = useRepository();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Stats details state
  const [stats, setStats] = useState<{
    framework: string;
    total_files: number;
    size_bytes: number;
    total_endpoints: number;
    get_count: number;
    post_count: number;
    other_methods_count: number;
    languages: Record<string, number>;
  } | null>(null);
  // Sync stats when active repository changes
  React.useEffect(() => {
    const fetchStats = async () => {
      if (!activeRepo) {
        setStats(null);
        return;
      }
      try {
        const response = await axios.get(`/api/v1/repositories/${activeRepo.id}/stats`);
        setStats(response.data);
      } catch (err) {
        console.error("Failed fetching repo stats:", err);
      }
    };
    fetchStats();
  }, [activeRepo]);
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  const uploadFile = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setError("Please select a valid ZIP archive repository file.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) { // 500MB
      setError("ZIP archive size exceeds the maximum limit of 500MB.");
      return;
    }
    setUploading(true);
    setError(null);
    setUploadProgress("Uploading archive to engine...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadProgress("Extracting & parsing Abstract Syntax Trees...");
      const response = await axios.post('/api/v1/repositories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadProgress("Finalizing API mapping database registers...");
      await fetchRepositories();
      
      // Select the newly uploaded repository
      setActiveRepoById(response.data.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Parsing scanner failed. Ensure files compilation doesn't fail.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this repository and its analysis history?")) return;
    try {
      await axios.delete(`/api/v1/repositories/${id}`);
      await fetchRepositories();
    } catch (err) {
      console.error("Failed to delete repository:", err);
    }
  };
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Title & Dashboard Intro */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Source Intelligence Center</h2>
        <p className="text-sm text-slate-500 mt-1">Upload repository ZIPs to discover REST APIs, map code imports, and inspect quality metrics.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Repository Upload & List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ZIP Drag & Drop Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-brand-500" />
              <span>Scan New Repository</span>
            </h3>
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
                dragActive ? 'border-brand-500 bg-brand-50/30' : 'border-slate-350 hover:border-brand-400'
              }`}
            >
              {uploading ? (
                <div className="space-y-4 py-4">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{uploadProgress}</p>
                    <p className="text-xs text-slate-400 mt-1">Parsing code signatures (Non-executing)</p>
                  </div>
                </div>
              ) : (
                <>
                  <input 
                    type="file" 
                    id="repo-file-input" 
                    accept=".zip"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <label htmlFor="repo-file-input" className="cursor-pointer space-y-4 block">
                    <div className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-500 mx-auto">
                      <FolderDown className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Drag and drop ZIP archive here</p>
                      <p className="text-xs text-slate-400 mt-1">or click to browse local files (Max 500MB)</p>
                    </div>
                  </label>
                </>
              )}
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          {/* List of Recent Scans */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Files className="w-4.5 h-4.5 text-brand-500" />
              <span>Scanned Repositories</span>
            </h3>
            {contextLoading ? (
              <div className="space-y-3">
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No repositories scanned yet. Start by uploading a ZIP file above!
              </div>
            ) : (
              <div className="space-y-3">
                {repositories.map((repo) => (
                  <div 
                    key={repo.id}
                    onClick={() => setActiveRepoById(repo.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      activeRepo?.id === repo.id 
                        ? 'border-brand-500 bg-brand-50/10 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Code2 className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{repo.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-extrabold uppercase bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                            {repo.framework || 'unknown'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{formatBytes(repo.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeRepo?.id === repo.id && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-150 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(repo.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Right Column: Active Repository Summary & Stats */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full">
            <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-brand-500" />
              <span>Analysis Statistics</span>
            </h3>
            {!activeRepo ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Select a repository to view analysis metrics.
              </div>
            ) : !stats ? (
              <div className="space-y-4">
                <div className="h-6 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-20 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-24 bg-slate-100 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Numeric Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">APIs Discovered</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_endpoints}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Files</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_files}</p>
                  </div>
                </div>
                {/* HTTP Methods breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">HTTP Methods Routing</h4>
                  <div className="space-y-2 text-xs">
                    {/* GET bar */}
                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>GET ({stats.get_count})</span>
                        <span>{stats.total_endpoints ? Math.round((stats.get_count / stats.total_endpoints) * 100) : 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${stats.total_endpoints ? (stats.get_count / stats.total_endpoints) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    {/* POST bar */}
                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>POST ({stats.post_count})</span>
                        <span>{stats.total_endpoints ? Math.round((stats.post_count / stats.total_endpoints) * 100) : 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${stats.total_endpoints ? (stats.post_count / stats.total_endpoints) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    {/* Other Methods bar */}
                    {stats.other_methods_count > 0 && (
                      <div>
                        <div className="flex justify-between font-semibold text-slate-600 mb-1">
                          <span>Others ({stats.other_methods_count})</span>
                          <span>{stats.total_endpoints ? Math.round((stats.other_methods_count / stats.total_endpoints) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${stats.total_endpoints ? (stats.other_methods_count / stats.total_endpoints) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Language Distribution */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Language Distribution</h4>
                  <div className="flex h-3.5 rounded-full overflow-hidden mb-3">
                    {Object.entries(stats.languages).map(([lang, pct], idx) => {
                      const colors = ['bg-brand-500', 'bg-amber-400', 'bg-blue-400', 'bg-red-400', 'bg-slate-400'];
                      const color = colors[idx % colors.length];
                      return (
                        <div 
                          key={lang}
                          className={`h-full ${color}`}
                          style={{ width: `${pct}%` }}
                          title={`${lang}: ${pct}%`}
                        ></div>
                      );
                    })}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                    {Object.entries(stats.languages).map(([lang, pct], idx) => {
                      const textColors = ['text-brand-500', 'text-amber-500', 'text-blue-500', 'text-red-500', 'text-slate-400'];
                      const textColor = textColors[idx % textColors.length];
                      return (
                        <div key={lang} className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${textColor.replace('text-', 'bg-')}`}></span>
                          <span>{lang} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};