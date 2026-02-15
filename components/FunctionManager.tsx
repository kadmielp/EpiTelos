import React, { useState } from 'react';
import { IAIFunction } from '../types';
import { Modal } from './Modal';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

import { BrainIcon } from './icons/BrainIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';

interface FunctionManagerProps {
  functions: IAIFunction[];
  onSaveFunction: (func: Partial<IAIFunction>) => void;
  onDeleteFunction: (id: string) => void;
}

export const FunctionManager: React.FC<FunctionManagerProps> = ({ functions, onSaveFunction, onDeleteFunction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<Partial<IAIFunction> | null>(null);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectingFunction, setInspectingFunction] = useState<IAIFunction | null>(null);

  const openModal = (func?: IAIFunction) => {
    setEditingFunction(func || { name: '', systemPrompt: '', description: '', category: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFunction(null);
  };

  const openInspect = (func: IAIFunction) => {
    setInspectingFunction(func);
    setIsInspectOpen(true);
  };

  const closeInspect = () => {
    setIsInspectOpen(false);
    setInspectingFunction(null);
  };

  const handleSave = () => {
    if (editingFunction && editingFunction.name && editingFunction.systemPrompt) {
      onSaveFunction(editingFunction);
      closeModal();
    }
  };

  const builtInFunctions = functions.filter(f => !f.isCustom);
  const customFunctions = functions.filter(f => f.isCustom);

  return (
    <div className="h-full flex flex-col text-slate-200 overflow-hidden relative">

      {/* Header Area */}
      <div className="z-10 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Intelligence orchestration</h2>
            <h1 className="text-xl font-bold text-white tracking-tight">Function Manager</h1>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2.5 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all active:scale-[0.98] text-[11px] uppercase tracking-widest"
        >
          <span className="text-lg leading-none">+</span>
          Create New Logic
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Custom Functions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Proprietary Assets</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFunctions.length > 0 ? customFunctions.map(func => (
                <div
                  key={func.id}
                  onClick={() => openInspect(func)}
                  className="group relative bg-slate-900/40 backdrop-blur-3xl border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)] flex flex-col cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors uppercase">{func.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(func); }}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-all"
                        title="Edit Module"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteFunction(func.id); }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all"
                        title="Delete Module"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-mono">
                    {func.systemPrompt}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Local Instance</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-slate-500">{func.category || 'General'}</span>
                  </div>
                </div>
              )) : (
                <div className="md:col-span-2 py-12 text-center bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <BrainIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-1">No Custom Intelligence</p>
                  <p className="text-[10px] text-slate-600">Create proprietary functions to expand system capabilities.</p>
                </div>
              )}
            </div>
          </section>

          {/* Built-in Functions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Core Architectures</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builtInFunctions.map(func => (
                <div
                  key={func.id}
                  onClick={() => openInspect(func)}
                  className="bg-slate-900/20 backdrop-blur-sm border border-white/5 rounded-2xl p-5 flex flex-col group/item border-opacity-50 cursor-pointer hover:bg-slate-900/40 hover:border-emerald-500/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-sm font-bold text-slate-300 group-hover/item:text-white transition-colors uppercase truncate">{func.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic mb-4">
                    "{func.description || 'Core system function'}"
                  </p>
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/50">Read-Only</span>
                    <span className="text-[8px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded uppercase">{func.category || 'Standard'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingFunction?.id ? 'Edit Intelligence Module' : 'Architect New Function'}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="func-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Module Label
              </label>
              <input
                id="func-name"
                type="text"
                value={editingFunction?.name || ''}
                onChange={e => setEditingFunction(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all"
                placeholder="e.g., Code Architect"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="func-category" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Classification
              </label>
              <input
                id="func-category"
                type="text"
                value={editingFunction?.category || ''}
                onChange={e => setEditingFunction(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all"
                placeholder="e.g., Development"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="func-desc" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Short Description
            </label>
            <input
              id="func-desc"
              type="text"
              value={editingFunction?.description || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all font-mono italic"
              placeholder="Primary objective statement..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="func-prompt" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              System Instructions (Core Logic)
            </label>
            <textarea
              id="func-prompt"
              rows={8}
              value={editingFunction?.systemPrompt || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 placeholder:text-slate-800 outline-none focus:border-blue-500/50 transition-all resize-none custom-scrollbar font-mono leading-relaxed"
              placeholder="Define behavioral parameters and output structure..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              onClick={closeModal}
              className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={!editingFunction?.name || !editingFunction?.systemPrompt}
              className="px-8 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl hover:shadow-blue-500/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98]"
            >
              Commit Module
            </button>
          </div>
        </div>
      </Modal>

      {/* Inspect Modal */}
      <Modal
        isOpen={isInspectOpen}
        onClose={closeInspect}
        title={`Intelligence Core: ${inspectingFunction?.name}`}
      >
        <div className="space-y-6 p-1">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">System Architecture Reference</p>
            <div className="bg-slate-950 rounded-2xl p-6 border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap shadow-inner selection:bg-blue-500/40">
              {inspectingFunction?.systemPrompt}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={closeInspect}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-wider"
            >
              Close Core View
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};