"use client";

import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { 
  FolderTree, 
  Plus, 
  Wallet, 
  Landmark, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";

interface AccountNodeData extends Record<string, unknown> {
  id: number;
  code: string;
  name: string;
  level: number;
  type: string;
  balance: number;
  isTerminal: boolean;
  onAddSub?: (node: any) => void;
  isManagementActive: boolean;
}

const levelColors: Record<number, string> = {
  1: "bg-slate-900 border-slate-700 text-white shadow-xl shadow-slate-900/20",
  2: "bg-blue-700 border-blue-600 text-white shadow-lg shadow-blue-700/20",
  3: "bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/20",
  4: "bg-teal-500 border-teal-400 text-white shadow-sm shadow-teal-500/20",
};

const CustomAccountNode = ({ data }: { data: AccountNodeData }) => {
  const isTerminal = data.isTerminal;

  return (
    <div className={cn(
      "px-6 py-5 rounded-[2rem] border-2 transition-all group relative min-w-[320px] backdrop-blur-md",
      levelColors[data.level] || "bg-white text-slate-900",
      "hover:scale-[1.02] hover:z-50 duration-500 ease-out shadow-2xl"
    )}>
      {/* Handles for vertical connections */}
      <Handle type="target" position={Position.Top} className="!w-4 !h-1.5 !bg-white/40 border-none rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-1.5 !bg-white/40 border-none rounded-full" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black opacity-50 font-mono tracking-tighter">{data.code}</span>
            <div className="p-2 rounded-2xl bg-white/10 shadow-inner">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          {(data.level === 3 || (data.level === 2 && data.type === 'EQUITY')) && data.isManagementActive && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                data.onAddSub?.(data);
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white text-current hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-black text-lg tracking-tight truncate leading-tight">{data.name}</span>
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isTerminal ? "bg-emerald-400" : "bg-white/40")} />
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-[0.2em]">
              {isTerminal ? "حساب فرعي نهائي" : `المستوى ${data.level}`}
            </span>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest">الرصيد الحالي</span>
            <span className="text-sm font-black mt-0.5">
              {data.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-[10px] ml-1 opacity-60">ج.م</span>
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            {data.type === 'ASSET' && <Wallet size={16} className="text-emerald-300" />}
            {data.type === 'LIABILITY' && <Landmark size={16} className="text-rose-300" />}
            {!['ASSET', 'LIABILITY'].includes(data.type) && <FileText size={16} className="opacity-80" />}
          </div>
        </div>
      </div>
      
      {/* Decorative Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] pointer-events-none" />
    </div>
  );
};

const nodeTypes = {
  account: CustomAccountNode,
};

interface COAFlowTreeProps {
  data: any[];
  onAddSub: (parent: any) => void;
  isManagementActive: boolean;
}

export function COAFlowTree({ data, onAddSub, isManagementActive }: COAFlowTreeProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const HORIZONTAL_SPACING = 400;
    const VERTICAL_SPACING = 250;

    const traverse = (
      items: any[], 
      level: number, 
      parentId: string | null = null, 
      xOffset: number = 0
    ) => {
      let currentX = xOffset;
      const totalWidthForLevel = items.length * HORIZONTAL_SPACING;
      const startX = xOffset - (totalWidthForLevel / 2) + (HORIZONTAL_SPACING / 2);

      items.forEach((item, index) => {
        const nodeId = `node-${item.id}`;
        
        // Vertical Layout logic
        const x = startX + (index * HORIZONTAL_SPACING);
        const y = (level - 1) * VERTICAL_SPACING;

        nodes.push({
          id: nodeId,
          type: "account",
          position: { x, y },
          data: { 
            ...item, 
            onAddSub, 
            isManagementActive 
          },
        });

        if (parentId) {
          edges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: "smoothstep",
            animated: item.isTerminal,
            style: { 
              stroke: item.isTerminal ? "#2dd4bf" : "#64748b", 
              strokeWidth: 3,
              opacity: 0.8
            },
          });
        }

        if (item.children && item.children.length > 0) {
          traverse(item.children, level + 1, nodeId, x);
        }
      });
    };

    traverse(data, 1);
    return { initialNodes: nodes, initialEdges: edges };
  }, [data, onAddSub, isManagementActive]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-[700px] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="rtl-flow"
      >
        <Background gap={20} size={1} color="#64748b" style={{ opacity: 0.1 }} />
        <Controls showInteractive={false} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden" />
        
        <Panel position="top-right" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-3 m-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900 dark:text-white">تجربة تصفح تفاعلية</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">استخدم الماوس للتحجيم والتحريك</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <span className="text-[9px] font-black text-slate-400">م1: أساسي</span>
            <div className="w-2 h-2 rounded-full bg-blue-700" />
            <span className="text-[9px] font-black text-slate-400">م2: رئيسي</span>
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="text-[9px] font-black text-slate-400">م3: مجموعة</span>
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-[9px] font-black text-slate-400">م4: طرفي</span>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Tooltip Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 z-50 animate-bounce">
         <ArrowRightLeft className="w-5 h-5 text-teal-400" />
         <span className="text-xs font-black tracking-tight">اضغط باستمرار على الماوس للتحرك واستخدم العجلة للتكبير</span>
      </div>
    </div>
  );
}

import { ArrowRightLeft } from "lucide-react";
