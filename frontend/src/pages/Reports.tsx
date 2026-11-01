import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRepository } from '../context/RepositoryContext';
import { 
  FileJson, 
  FileText, 
  ExternalLink, 
  FileSignature, 
  Download 
} from 'lucide-react';
export const Reports: React.FC = () => {
  const { activeRepo } = useRepository();
  const [openapiPreview, setOpenapiPreview] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchOpenApiPreview = async () => {
      if (!activeRepo) return;
      setLoading(true);
      try {
        const response = await axios.get(`/api/v1/repositories/${activeRepo.id}/reports/openapi`);
        // Just extract header elements to avoid overloading local previews
        const summarySpec = {
          openapi: response.data.openapi,
          info: response.data.info,
          paths: Object.keys(response.data.paths || {}).slice(0, 3).reduce((acc: any, key) => {
            acc[key] = response.data.paths[key];
            return acc;
          }, {})
        };
        setOpenapiPreview(JSON.stringify(summarySpec, null, 2));
      } catch (err) {
        setOpenapiPreview("Failed to render OpenAPI document preview.");
      } finally {
        setLoading(false);
      }
    };
    fetchOpenApiPreview();
  }, [activeRepo]);
  const handleDownload = (type: 'openapi' | 'markdown' | 'json') => {
    if (!activeRepo) return;
    const url = `/api/v1/repositories/${activeRepo.id}/reports/${type}`;
    if (type === 'markdown') {
      // Trigger native browser download directly
      window.open(url, '_blank');
    } else {
      // Download programmatically
      axios.get(url).then((response) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${activeRepo.name}_api_${type}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });
    }
  };
  const reportCards = [
    {
      title: "OpenAPI Specification",
      desc: "Swagger-compliant JSON schema mappings summarizing routing structures, parameters, and HTTP methods.",
      icon: FileJson,
      type: "openapi",
      actionLabel: "Download JSON Spec"
    },
    {
      title: "Technical Markdown Doc",
      desc: "Static documentation detailing controller handlers, file line markers, parameters, and docstrings.",
      icon: FileText,
      type: "markdown",
      actionLabel: "Export Markdown"
    },
    {
      title: "Printable PDF Report",
      desc: "Styled document container optimized for native browser print mappers or saving directly as PDF files.",
      icon: FileSignature,
      type: "pdf",
      actionLabel: "Print / Save PDF"
    }
  ];
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page headers */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Export & Documentation reports</h2>
        <p className="text-sm text-slate-500 mt-1">Export discovered REST specs into standard industry formats or generate printed reports.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Report type cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-brand-500/25 transition-all shadow-sm">
                  <div className="space-y-4">
                    <div className="w-10 h-10 bg-brand-50 border border-brand-100 text-brand-500 rounded-xl flex items-center justify-center">
                      <Icon className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{card.title}</h4>
                      <p className="text-xs text-slate-450 mt-1 leading-relaxed font-semibold">{card.desc}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {card.type === 'pdf' ? (
                      <a
                        href={`/api/v1/repositories/${activeRepo?.id}/reports/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <span>{card.actionLabel}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleDownload(card.type as any)}
                        disabled={!activeRepo}
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-40"
                      >
                        <Download className="w-4 h-4" />
                        <span>{card.actionLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Right Column: OpenAPI JSON Live Preview */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-sm font-bold text-slate-700 mb-4">OpenAPI Document Preview</h3>
            
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto text-left font-mono text-[10px] text-slate-300 leading-5">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                </div>
              ) : (
                <pre>{openapiPreview}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};