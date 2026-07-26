import React, { useState, useEffect, useRef } from 'react';
interface Node {
  id: string;
  label: string;
  type: string; // file, external
}
interface Edge {
  source: string;
  target: string;
}
interface GraphProps {
  nodes: Node[];
  edges: Edge[];
}
export const Graph: React.FC<GraphProps> = ({ nodes, edges }) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const width = 800;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;
  // Calculate layout coordinates on mount/nodes change
  useEffect(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const fileNodes = nodes.filter(n => n.type === 'file');
    const extNodes = nodes.filter(n => n.type !== 'file');
    // Inner circle for internal codebase files
    fileNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, fileNodes.length)) * 2 * Math.PI;
      const radius = 130;
      coords[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });
    // Outer circle for external libraries
    extNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, extNodes.length)) * 2 * Math.PI + Math.PI / 4;
      const radius = 220;
      coords[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });
    setPositions(coords);
  }, [nodes]);
  // Handle SVG panning interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  // Determine active edge highlights
  const isEdgeHighlighted = (edge: Edge) => {
    if (!hoveredNode) return true;
    return edge.source === hoveredNode || edge.target === hoveredNode;
  };
  return (
    <div className="relative border border-slate-200 bg-slate-900 rounded-2xl shadow-inner overflow-hidden select-none h-[500px]">
      <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg z-10">
        Drag to Pan • Hover to Highlight Imports
      </div>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y})`}>
          {/* Render directed connection lines */}
          {edges.map((edge, idx) => {
            const p1 = positions[edge.source];
            const p2 = positions[edge.target];
            if (!p1 || !p2) return null;
            const active = isEdgeHighlighted(edge);
            const isRelated = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
            return (
              <line
                key={`edge-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isRelated ? '#a78bfa' : '#334155'}
                strokeWidth={isRelated ? 2 : 1}
                strokeDasharray={edge.target.startsWith('ext:') ? '4,4' : '0'}
                opacity={active ? (isRelated ? 1.0 : 0.4) : 0.05}
                markerEnd={isRelated ? "url(#arrow-active)" : "url(#arrow)"}
                className="transition-all duration-300"
              />
            );
          })}
          {/* Render node components */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isFile = node.type === 'file';
            const isDimmed = hoveredNode && hoveredNode !== node.id && 
              !edges.some(e => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id));
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer transition-opacity duration-300"
                opacity={isDimmed ? 0.25 : 1}
              >
                {isFile ? (
                  // Internal File Module
                  <>
                    <rect
                      x="-65"
                      y="-18"
                      width="130"
                      height="36"
                      rx="8"
                      fill="#1e1b4b"
                      stroke={hoveredNode === node.id ? '#c084fc' : '#818cf8'}
                      strokeWidth={hoveredNode === node.id ? 2 : 1}
                      className="transition-all shadow-glow"
                    />
                    <text
                      textAnchor="middle"
                      y="4"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                      className="font-sans"
                    >
                      {node.label}
                    </text>
                  </>
                ) : (
                  // External Package
                  <>
                    <circle
                      r="16"
                      fill="#0f172a"
                      stroke={hoveredNode === node.id ? '#60a5fa' : '#3b82f6'}
                      strokeWidth={1.5}
                      className="transition-all"
                    />
                    <text
                      textAnchor="middle"
                      y="22"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="semibold"
                    >
                      {node.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};