import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRepository } from '../context/RepositoryContext';
import { Graph } from '../components/Graph';
import { 
  Search, 
  ArrowUpDown, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  ShieldAlert, 
  Info,
  BookOpen
} from 'lucide-react';
export const Analysis: React.FC = () => {
  const { activeRepo } = useRepository();
  const [activeTab, setActiveTab] = useState<'discovery' | 'docs' | 'graph' | 'quality'>('discovery');
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [authFilter, setAuthFilter] = useState("");
  const [sortField, setSortField] = useState("route");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Data lists
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Selected details
  const [selectedEndpoint, setSelectedEndpoint] = useState<any | null>(null);
  const [selectedDocsEp, setSelectedDocsEp] = useState<any | null>(null);
  // Graph state
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  // Code Quality state
  const [qualityData, setQualityData] = useState<{ score: number; violations: any[]; summary: string } | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  // Fetch Endpoints
  const fetchEndpoints = async () => {
    if (!activeRepo) return;
    try {
      const authQuery = authFilter === "true" ? "&auth=true" : authFilter === "false" ? "&auth=false" : "";
      const methodQuery = methodFilter ? `&method=${methodFilter}` : "";
      const searchQuery = searchTerm ? `&search=${searchTerm}` : "";
      const sortQuery = `&sort_by=${sortField}&sort_order=${sortOrder}`;
      const response = await axios.get(
        `/api/v1/repositories/${activeRepo.id}/endpoints?page=${page}&per_page=15${searchQuery}${methodQuery}${authQuery}${sortQuery}`
      );
      
      setEndpoints(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
      // Default select for documentation tab if empty
      if (response.data.items.length > 0 && !selectedDocsEp) {
        setSelectedDocsEp(response.data.items[0]);
      }
    } catch (err) {
      console.error("Failed fetching endpoints:", err);
    }
  };
  useEffect(() => {
    fetchEndpoints();
  }, [activeRepo, page, methodFilter, authFilter, sortField, sortOrder, searchTerm]);
  // Load Graph Data
  useEffect(() => {
    const fetchGraph = async () => {
      if (!activeRepo || activeTab !== 'graph') return;
      setGraphLoading(true);
      try {
        const response = await axios.get(`/api/v1/repositories/${activeRepo.id}/reports/dependency-graph`);
        setGraphData(response.data);
      } catch (err) {
        console.error("Failed fetching dependency graph:", err);
      } finally {
        setGraphLoading(false);
      }
    };
    fetchGraph();
  }, [activeRepo, activeTab]);
  // Load Code Quality Data
  useEffect(() => {
    const fetchQuality = async () => {
      if (!activeRepo || activeTab !== 'quality') return;
      setQualityLoading(true);
      try {
        const response = await axios.get(`/api/v1/repositories/${activeRepo.id}/reports/code-quality`);
        setQualityData(response.data);
      } catch (err) {
        console.error("Failed fetching code quality indices:", err);
      } finally {
        setQualityLoading(false);
      }
    };
    fetchQuality();
  }, [activeRepo, activeTab]);
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    POST: 'bg-indigo-50 text-indigo-700 border-indigo-250',
    PUT: 'bg-amber-50 text-amber-700 border-amber-250',
    DELETE: 'bg-red-50 text-red-700 border-red-250',
    PATCH: 'bg-purple-50 text-purple-700 border-purple-250'
  };
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Sub tabs Navigation Bar */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'discovery', label: 'API Discovery' },
          { id: 'docs', label: 'Reference Docs' },
          { id: 'graph', label: 'Dependency Map' },
          { id: 'quality', label: 'Code Quality' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-brand-600 text-brand-600 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* ========================================================
          1. API DISCOVERY TAB
          ======================================================== */}
      {activeTab === 'discovery' && (
        <div className="space-y-4">
          {/* Filtering Header Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between bg-white border border-slate-250 p-4 rounded-xl">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search path, handler or docstring..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 bg-slate-50/30"
              />
            </div>
            
            <div className="flex gap-4">
              {/* Method filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/30 font-semibold"
              >
                <option value="">HTTP Method (All)</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              {/* Auth filter */}
              <select
                value={authFilter}
                onChange={(e) => setAuthFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/30 font-semibold"
              >
                <option value="">Auth Guards (All)</option>
                <option value="true">🔑 Protected</option>
                <option value="false">🔓 Public</option>
              </select>
            </div>
          </div>
          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                  <th onClick={() => handleSort('method')} className="p-4 cursor-pointer hover:bg-slate-100/50">
                    <div className="flex items-center gap-1.5">Method <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th onClick={() => handleSort('route')} className="p-4 cursor-pointer hover:bg-slate-100/50">
                    <div className="flex items-center gap-1.5">Route <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th onClick={() => handleSort('function_name')} className="p-4 cursor-pointer hover:bg-slate-100/50">
                    <div className="flex items-center gap-1.5">Handler Controller <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="p-4">Auth</th>
                  <th className="p-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                      No APIs matching the filter.
                    </td>
                  </tr>
                ) : (
                  endpoints.map((ep) => (
                    <tr 
                      key={ep.id}
                      onClick={() => setSelectedEndpoint(ep)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${methodColors[ep.method] || 'bg-slate-50 border-slate-200'}`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-700 truncate max-w-[240px]" title={ep.route}>
                        {ep.route}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500 truncate max-w-[180px]">
                        {ep.function_name}
                      </td>
                      <td className="p-4">
                        {ep.auth ? (
                          <span title="Auth Guard active">
                            <Lock className="w-4 h-4 text-brand-500" />
                          </span>
                        ) : (
                          <span title="Public access">
                            <Unlock className="w-4 h-4 text-slate-300" />
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400 truncate max-w-[180px]" title={ep.file_path}>
                        {ep.file_path.split('/').pop()}:{ep.line_number}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs font-semibold text-slate-500 bg-slate-50/20">
                <span>Showing page {page} of {totalPages} ({total} entries total)</span>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Endpoint Details Drawer Modal */}
          {selectedEndpoint && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
              <div className="w-[500px] bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${methodColors[selectedEndpoint.method]}`}>
                          {selectedEndpoint.method}
                        </span>
                        {selectedEndpoint.auth ? (
                          <span className="text-[9px] font-bold uppercase text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded border border-brand-200/30">
                            🔑 Secure
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            🔓 Public
                          </span>
                        )}
                      </div>
                      <h3 className="font-mono text-sm font-bold text-slate-800 break-words">{selectedEndpoint.route}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedEndpoint(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2"
                    >
                      ×
                    </button>
                  </div>
                  {/* Controller definitions */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handler Signature</h4>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg font-mono text-xs text-slate-600 space-y-1.5">
                      <p><span className="text-slate-400 font-semibold">Controller:</span> {selectedEndpoint.function_name}()</p>
                      <p><span className="text-slate-400 font-semibold">Module:</span> {selectedEndpoint.module_name}</p>
                      <p><span className="text-slate-400 font-semibold">File path:</span> {selectedEndpoint.file_path}</p>
                      <p><span className="text-slate-400 font-semibold">Line count:</span> {selectedEndpoint.line_number}</p>
                      {selectedEndpoint.return_type && (
                        <p><span className="text-slate-400 font-semibold">Return:</span> <span className="text-brand-600">{selectedEndpoint.return_type}</span></p>
                      )}
                    </div>
                  </div>
                  {/* Docstring */}
                  {selectedEndpoint.docstring && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Docstring</h4>
                      <blockquote className="border-l-4 border-brand-500 bg-brand-50/10 p-3 rounded text-xs text-slate-650 italic leading-relaxed whitespace-pre-line">
                        {selectedEndpoint.docstring}
                      </blockquote>
                    </div>
                  )}
                  {/* Parameters Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parameters Schema</h4>
                    {!selectedEndpoint.parameters || selectedEndpoint.parameters.length === 0 ? (
                      <p className="text-xs text-slate-450 italic">No input parameters discovered.</p>
                    ) : (
                      <div className="border border-slate-150 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase">
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Source (In)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedEndpoint.parameters.map((p: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/30">
                                <td className="p-2.5 font-semibold text-slate-700">
                                  {p.name} {p.required && <span className="text-red-500">*</span>}
                                </td>
                                <td className="p-2.5 font-mono text-[10px] text-brand-600">{p.type || 'str'}</td>
                                <td className="p-2.5">
                                  <span className="text-[9px] uppercase font-semibold text-slate-500 bg-slate-150 px-1.5 py-0.5 rounded">
                                    {p.location}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedDocsEp(selectedEndpoint);
                      setActiveTab('docs');
                      setSelectedEndpoint(null);
                    }}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open in Reference Docs</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ========================================================
          2. REFERENCE DOCS TAB
          ======================================================== */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: endpoints list */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 h-[550px] overflow-y-auto">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">API List</h4>
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setSelectedDocsEp(ep)}
                className={`w-full flex items-center gap-3 text-left p-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedDocsEp?.id === ep.id 
                    ? 'border-brand-500 bg-brand-50/10 text-brand-700 shadow-sm' 
                    : 'border-transparent text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${methodColors[ep.method]}`}>
                  {ep.method}
                </span>
                <span className="truncate font-mono">{ep.route}</span>
              </button>
            ))}
          </div>
          {/* Right panel: documentation viewer (Swagger style) */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            {!selectedDocsEp ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                Select an endpoint from the left list.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded border ${methodColors[selectedDocsEp.method]}`}>
                      {selectedDocsEp.method}
                    </span>
                    <span className="font-mono">{selectedDocsEp.route}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 font-mono">Handler: {selectedDocsEp.function_name}()</p>
                </div>
                <hr className="border-slate-100" />
                {/* Path display banner */}
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-350">
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-semibold font-mono">ENDPOINT URL</span>
                    <span className="font-mono text-white">{window.location.origin}{selectedDocsEp.route}</span>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">HTTP {selectedDocsEp.method}</span>
                </div>
                {/* Parameter lists */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Request Parameters</h4>
                  {!selectedDocsEp.parameters || selectedDocsEp.parameters.length === 0 ? (
                    <p className="text-xs text-slate-450 italic">No parameters required.</p>
                  ) : (
                    <div className="border border-slate-150 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase">
                            <th className="p-3">Name</th>
                            <th className="p-3">Source</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Default</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDocsEp.parameters.map((p: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-3 font-semibold text-slate-700">
                                {p.name} {p.required && <span className="text-red-500">*</span>}
                              </td>
                              <td className="p-3">
                                <span className="text-[9px] uppercase font-semibold text-slate-500 bg-slate-150 px-1.5 py-0.5 rounded">
                                  {p.location}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-brand-600">{p.type || 'str'}</td>
                              <td className="p-3 text-slate-450 font-mono">{p.default || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {/* Responses */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Response Payload</h4>
                  <div className="border border-slate-150 rounded-lg p-4 bg-slate-50/20 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-bold text-slate-700">Status {selectedDocsEp.status_code || 200}</span>
                      </div>
                      <span className="text-slate-400 font-mono">application/json</span>
                    </div>
                    {selectedDocsEp.return_type ? (
                      <pre className="bg-slate-900 border border-slate-800 text-emerald-400 p-3 rounded-lg font-mono text-[11px] leading-relaxed">
{`{{
  "response": "${selectedDocsEp.return_type}"
}}`}
                      </pre>
                    ) : (
                      <p className="text-slate-450 italic">Successful response returning serialized data model objects.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========================================================
          3. DEPENDENCY GRAPH TAB
          ======================================================== */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-205 p-6 rounded-xl space-y-4">
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Codebase Modules Import Network</h3>
              <p className="text-xs text-slate-500 mt-1">Statically resolved linkages mapping file imports to internal dependencies and external libraries.</p>
            </div>
            
            {graphLoading ? (
              <div className="h-[500px] bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : graphData.nodes.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs bg-slate-900 rounded-2xl h-[500px] flex items-center justify-center">
                No dependencies mapped.
              </div>
            ) : (
              <Graph nodes={graphData.nodes} edges={graphData.edges} />
            )}
          </div>
        </div>
      )}
      {/* ========================================================
          4. CODE QUALITY TAB
          ======================================================== */}
      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quality Score Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between items-center text-center h-[350px]">
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Audit Score Index</h3>
              <p className="text-xs text-slate-450 mt-1">Calculated via AST checks</p>
            </div>
            {qualityLoading || !qualityData ? (
              <div className="w-28 h-28 rounded-full border-4 border-slate-100 animate-pulse flex items-center justify-center"></div>
            ) : (
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Circular progress loader */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke={qualityData.score > 80 ? "#10b981" : qualityData.score > 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - qualityData.score / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-3xl font-extrabold text-slate-800">
                  {qualityData.score}
                </div>
              </div>
            )}
            <div className="text-xs font-semibold text-slate-500 leading-relaxed px-4">
              {qualityData?.summary || "Analyzing project modules syntax..."}
            </div>
          </div>
          {/* Code Violations Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-700 text-sm">Discovered Violations</h3>
            
            {qualityLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
              </div>
            ) : !qualityData || qualityData.violations.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs italic">
                Clean audit score! No quality violations detected in source modules.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {qualityData.violations.map((v: any, idx: number) => {
                  const isError = v.severity === 'error';
                  const isWarning = v.severity === 'warning';
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex gap-3.5 p-4 rounded-xl border ${
                        isError 
                          ? 'border-red-100 bg-red-50/10' 
                          : isWarning 
                            ? 'border-amber-100 bg-amber-50/10' 
                            : 'border-blue-100 bg-blue-50/10'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isError ? (
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Info className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                            isError 
                              ? 'bg-red-100 text-red-700' 
                              : isWarning 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {v.rule}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {v.file_path.split('/').pop()}:{v.line_number}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-2">{v.message}</p>
                        <p className="text-[10px] text-slate-450 mt-1 font-mono break-all leading-relaxed bg-slate-900/5 p-2 rounded">
                          File: {v.file_path}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};