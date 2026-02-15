import React, { useState } from 'react';
import { IContextSource, TreeNode } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { ContextTreeView, getDescendantSourceIds } from './ContextTreeView';
import { Modal } from './Modal';
import { FolderIcon } from './icons/FolderIcon';
import { RefreshIcon } from './icons/RefreshIcon';

interface ContextManagerProps {
  isDesktop: boolean;
  contexts: IContextSource[];
  addContext: (path: string, remark: string, type: 'folder' | 'file', includeSubfolders: boolean) => void;
  removeContexts: (ids: string[]) => void;
  handleViewContext: (id: string) => void;
  toggleContextVisibility: (id: string) => void;
  handleRefreshAllFolders: () => void;
}

export const ContextManager: React.FC<ContextManagerProps> = ({ isDesktop, contexts, addContext, removeContexts, handleViewContext, toggleContextVisibility, handleRefreshAllFolders }) => {
  const [newPath, setNewPath] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [newType, setNewType] = useState<'folder' | 'file'>('folder');
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [toDelete, setToDelete] = useState<{ ids: string[]; remark: string } | null>(null);
  const webFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddContext = () => {
    if (newPath && newRemark) {
      addContext(newPath, newRemark, newType, newType === 'folder' ? includeSubfolders : false);
      setNewPath('');
      setNewRemark('');
      setIncludeSubfolders(false);
    }
  };

  const handleConfirmDelete = () => {
    if (toDelete) {
      removeContexts(toDelete.ids);
      setToDelete(null);
    }
  };

  const handleBrowseClick = async () => {
    // @ts-ignore
    if (isDesktop && window.__TAURI__) {
      // @ts-ignore
      const result = await window.__TAURI__.dialog.open({
        directory: newType === 'folder',
        multiple: false,
      });
      if (typeof result === 'string') {
        const pathParts = result.replace(/\\/g, '/').split('/');
        const name = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
        setNewPath(result);
        if (!newRemark) {
          const remark = newType === 'file' && name.includes('.') ? name.split('.').slice(0, -1).join('.') : name;
          setNewRemark(remark || name);
        }
      }
    } else {
      if (webFileInputRef.current) {
        if (newType === 'folder') {
          webFileInputRef.current.setAttribute('webkitdirectory', 'true');
        } else {
          webFileInputRef.current.removeAttribute('webkitdirectory');
        }
        webFileInputRef.current.click();
      }
    }
  };

  const handleWebFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (newType === 'folder') {
      const firstFile = files[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      const folderName = pathParts[0];
      setNewPath(folderName);
      if (!newRemark) {
        setNewRemark(folderName);
      }
    } else { // 'file'
      const file = files[0];
      setNewPath(file.name);
      if (!newRemark) {
        const nameParts = file.name.split('.');
        if (nameParts.length > 1) {
          nameParts.pop();
        }
        setNewRemark(nameParts.join('.'));
      }
    }
    event.target.value = '';
  };

  return (
    <div className="h-full flex flex-col text-slate-200 overflow-hidden relative">

      {/* Header Area */}
      <div className="z-10 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Knowledge architecture</h2>
            <h1 className="text-xl font-bold text-white tracking-tight">Context Manager</h1>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleRefreshAllFolders}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[11px] font-bold uppercase tracking-wider text-slate-300 group"
          >
            <RefreshIcon className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Sync All
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Add New Source Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Ingest New Knowledge</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Type Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Source Type</p>
                  <div className="flex p-1 bg-slate-950/50 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setNewType('folder')}
                      className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all ${newType === 'folder' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Folder System
                    </button>
                    <button
                      onClick={() => setNewType('file')}
                      className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all ${newType === 'file' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Individual File
                    </button>
                  </div>
                </div>

                {/* Subfolder Toggle */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Configuration</p>
                  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${newType === 'folder' ? 'bg-slate-950/50 border-white/10' : 'bg-slate-950/20 border-white/5 opacity-30 cursor-not-allowed'}`}>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Include Subdirectories</span>
                      <span className="text-[10px] text-slate-500">Recursive discovery of all nested files</span>
                    </div>
                    <button
                      disabled={newType !== 'folder'}
                      onClick={() => setIncludeSubfolders(!includeSubfolders)}
                      className={`w-10 h-5 rounded-full transition-all relative border border-white/5 ${includeSubfolders && newType === 'folder' ? 'bg-blue-600' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-md ${includeSubfolders && newType === 'folder' ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Path and Remark */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 group relative">
                  <input
                    type="text"
                    value={newPath}
                    readOnly
                    placeholder={newType === 'folder' ? "Select a knowledge directory..." : "Select a knowledge file..."}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3.5 pl-4 pr-32 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all cursor-default"
                  />
                  <button
                    onClick={handleBrowseClick}
                    className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/5 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                  >
                    Browse
                  </button>
                  {!isDesktop && (<input type="file" ref={webFileInputRef} onChange={handleWebFileSelect} className="hidden" />)}
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder="Reference label..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAddContext}
                disabled={!newPath || !newRemark}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.99] text-xs uppercase tracking-[0.2em]"
              >
                Assemble Knowledge Context
              </button>
            </div>
          </section>

          {/* Managed Contexts Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Active Knowledge Base</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
              <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                {contexts.length > 0 ? (
                  <ContextTreeView
                    contexts={contexts}
                    renderNode={(node, isExpanded, toggleExpand) => {
                      const source = node.source;
                      const isIntermediateFolder = !source;

                      if (isIntermediateFolder) {
                        return (
                          <div className="flex items-center w-full px-4 py-2 rounded-xl hover:bg-white/5 transition-all group">
                            <button
                              className="flex items-center text-left flex-grow min-w-0"
                              onClick={(e) => toggleExpand(e)}
                            >
                              <FolderIcon className="w-4 h-4 mr-3 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                              <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors truncate">{node.name}</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className={`flex items-center justify-between w-full px-4 py-2.5 rounded-2xl transition-all group hover:bg-white/5 ${source.isHidden ? 'opacity-40 grayscale' : ''}`}>
                          <div
                            className="flex items-center cursor-pointer select-none flex-grow min-w-0"
                            onClick={(e) => {
                              if (source.isFolderMarker) toggleExpand(e);
                              else handleViewContext(source.id);
                            }}
                          >
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md flex-shrink-0 uppercase tracking-tighter transition-all border ${source.isFolderMarker ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {source.isFolderMarker ? 'DIR' : 'FILE'}
                            </span>
                            <div className="ml-4 flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                {source.remark}
                                {source.isFolderMarker && source.includeSubfolders && (
                                  <span className="text-[9px] text-blue-500 ml-2 uppercase tracking-widest font-black">(Recursive)</span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{source.path}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleContextVisibility(source.id); }}
                              className={`p-2 rounded-xl border transition-all ${source.isHidden ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10' : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20'}`}
                              title={source.isHidden ? 'Include in analysis' : 'Exclude from analysis'}
                            >
                              {source.isHidden ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setToDelete({ ids: [source.id], remark: source.remark });
                              }}
                              className="p-2 bg-red-600/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-600/20 transition-all"
                              title={`Detach ${source.remark}`}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  />
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center space-y-4 opacity-30">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <FolderIcon className="w-10 h-10 text-slate-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-400">Knowledge Void</p>
                      <p className="text-xs uppercase tracking-widest font-black">Awaiting data ingestion</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Knowledge Detachment"
      >
        {toDelete && (
          <div className="space-y-6">
            <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-red-600/20 rounded-lg text-red-400 mt-1">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white leading-tight">Remove from Active Context</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to detach <span className="text-red-400 font-bold font-mono">"{toDelete.remark}"</span>?
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                Note: This only removes the reference from EpiTelos. Your original files on disk will remaining untouched and secure.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-white transition-all active:scale-95"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};