import { useLanguage } from '../i18n';
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
    const { t } = useLanguage();
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
    <div className="functions-page h-full flex flex-col text-neutral-200 overflow-hidden relative">

      {/* Header Area */}
      <div className="z-10 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-500 " />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">{t('WORKSPACE / FUNCTIONS')}</h2>
            <h1 className="text-xl font-bold text-white tracking-tight">{t('Functions')}</h1>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-neutral-200 text-neutral-950 font-black py-2.5 px-6 rounded-xl flex items-center gap-2.5  transition-all active:scale-[0.98] text-[11px] uppercase tracking-widest"
        >
          <span className="text-lg leading-none">+</span>
          {t('New function')}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Custom Functions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">{t('Your functions')}</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFunctions.length > 0 ? customFunctions.map(func => (
                <div
                  key={func.id}
                  onClick={() => openInspect(func)}
                  className="surface-card group relative border hover:border-neutral-500/30 rounded-2xl p-5 transition-all duration-300 flex flex-col cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 " />
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-neutral-200 transition-colors uppercase">{func.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(func); }}
                        className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/10 rounded-lg transition-all"
                        title={t('Edit Module')}
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteFunction(func.id); }}
                        className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/10 rounded-lg transition-all"
                        title={t('Delete Module')}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed font-mono">
                    {func.systemPrompt}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('Custom')}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-neutral-400">{func.category || t('General')}</span>
                  </div>
                </div>
              )) : (
                <div className="surface-card md:col-span-2 py-12 text-center rounded-3xl border border-dashed">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <BrainIcon className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-400 font-bold mb-1">{t('No custom functions yet')}</p>
                  <p className="text-[10px] text-neutral-400">{t('Create a function to reuse your own instructions.')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Built-in Functions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">{t('Built-in functions')}</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builtInFunctions.map(func => (
                <div
                  key={func.id}
                  onClick={() => openInspect(func)}
                  className="surface-card border rounded-2xl p-5 flex flex-col group/item cursor-pointer hover:bg-neutral-800 hover:border-neutral-500/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 " />
                    <h3 className="text-sm font-bold text-neutral-200 group-hover/item:text-white transition-colors uppercase truncate">{func.name}</h3>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed italic mb-4">
                    "{func.description || t('Core system function')}"
                  </p>
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-200/50">{t('Read-Only')}</span>
                    <span className="text-[8px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded uppercase">{func.category || t('Standard')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={t(editingFunction?.id ? 'Edit function' : 'New function')}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="func-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                {t('Name')}
              </label>
              <input
                id="func-name"
                type="text"
                value={editingFunction?.name || ''}
                onChange={e => setEditingFunction(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all"
                placeholder={t('e.g., Code Architect')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="func-category" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                {t('Category')}
              </label>
              <input
                id="func-category"
                type="text"
                value={editingFunction?.category || ''}
                onChange={e => setEditingFunction(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all"
                placeholder={t('e.g., Development')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="func-desc" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
              {t('Short Description')}
            </label>
            <input
              id="func-desc"
              type="text"
              value={editingFunction?.description || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all font-mono italic"
              placeholder={t('Primary objective statement...')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="func-prompt" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
              {t('System instructions')}
            </label>
            <textarea
              id="func-prompt"
              rows={8}
              value={editingFunction?.systemPrompt || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full bg-neutral-950/50 border border-white/10 rounded-2xl p-4 text-xs text-neutral-200 placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all resize-none custom-scrollbar font-mono leading-relaxed"
              placeholder={t('Define behavioral parameters and output structure...')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              onClick={closeModal}
              className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all border border-white/5"
            >
              {t('Discard')}
            </button>
            <button
              onClick={handleSave}
              disabled={!editingFunction?.name || !editingFunction?.systemPrompt}
              className="px-8 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl bg-neutral-200 text-neutral-950 shadow-xl  disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98]"
            >
              {t('Save function')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Inspect Modal */}
      <Modal
        isOpen={isInspectOpen}
        onClose={closeInspect}
        title={`${inspectingFunction?.name}`}
      >
        <div className="space-y-6 p-1">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-neutral-200 uppercase tracking-widest">{t('System instructions')}</p>
            <div className="bg-neutral-950 rounded-2xl p-6 border border-white/10 font-mono text-[11px] text-neutral-200 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap shadow-inner selection:bg-neutral-500/40">
              {inspectingFunction?.systemPrompt}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={closeInspect}
              className="px-6 py-2.5 bg-neutral-700 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all shadow-xl shadow-neutral-400/20 active:scale-95 uppercase tracking-wider"
            >
              Close Core View
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
