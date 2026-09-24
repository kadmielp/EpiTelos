import { useLanguage } from '../i18n';
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
    const { t } = useLanguage();
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
    <div className="sources-page h-full flex flex-col text-neutral-200 overflow-hidden relative">

      {/* Header Area */}
      <div className="z-10 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-500 " />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">{t('WORKSPACE / SOURCES')}</h2>
            <h1 className="text-xl font-bold text-white tracking-tight">{t('Sources')}</h1>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleRefreshAllFolders}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[11px] font-bold uppercase tracking-wider text-neutral-200 group"
          >
            <RefreshIcon className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            {t('Refresh folders')}
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Add New Source Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">{t('Add a source')}</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="surface-card border rounded-3xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Type Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider ml-1">{t('Source Type')}</p>
                  <div className="flex p-1 bg-neutral-950/50 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setNewType('folder')}
                      className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all ${newType === 'folder' ? 'bg-neutral-700 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                      {t('Folder')}
                    </button>
                    <button
                      onClick={() => setNewType('file')}
                      className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all ${newType === 'file' ? 'bg-neutral-700 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                      {t('File')}
                    </button>
                  </div>
                </div>

                {/* Subfolder Toggle */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider ml-1">{t('Configuration')}</p>
                  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${newType === 'folder' ? 'bg-neutral-950/50 border-white/10' : 'bg-neutral-950/20 border-white/5 opacity-30 cursor-not-allowed'}`}>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-neutral-200">{t('Include Subdirectories')}</span>
                      <span className="text-[10px] text-neutral-400">{t('Include files in nested folders')}</span>
                    </div>
                    <button
                      disabled={newType !== 'folder'}
                      onClick={() => setIncludeSubfolders(!includeSubfolders)}
                      aria-label={t('Include subdirectories')}
                      aria-pressed={includeSubfolders && newType === 'folder'}
                      className={`w-10 h-5 rounded-full transition-all relative border border-white/5 ${includeSubfolders && newType === 'folder' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
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
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-2xl py-3.5 pl-4 pr-32 text-sm text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all cursor-default"
                  />
                  <button
                    onClick={handleBrowseClick}
                    className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl border border-white/5 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                  >
                    {t('Browse')}
                  </button>
                  {!isDesktop && (<input type="file" ref={webFileInputRef} onChange={handleWebFileSelect} className="hidden" />)}
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder={t('Reference label...')}
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder:text-neutral-400 outline-none focus:border-neutral-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAddContext}
                disabled={!newPath || !newRemark}
                className="w-full bg-neutral-200 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3  disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.99] text-xs uppercase tracking-[0.2em]"
              >
                {t('Add source')}
              </button>
            </div>
          </section>

          {/* Managed Contexts Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">{t('Your sources')}</label>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            <div className="surface-card border rounded-3xl overflow-hidden flex flex-col min-h-[400px]">
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
                              <FolderIcon className="w-4 h-4 mr-3 text-neutral-400 group-hover:text-neutral-200 transition-colors flex-shrink-0" />
                              <span className="text-sm font-semibold text-neutral-300 group-hover:text-neutral-200 transition-colors truncate">{node.name}</span>
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
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md flex-shrink-0 uppercase tracking-tighter transition-all border ${source.isFolderMarker ? 'bg-neutral-500/10 text-neutral-200 border-neutral-500/20' : 'bg-neutral-500/10 text-neutral-200 border-neutral-500/20'}`}>
                              {t(source.isFolderMarker ? 'DIR' : 'FILE')}
                            </span>
                            <div className="ml-4 flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white group-hover:text-neutral-200 transition-colors truncate">
                                {source.remark}
                                {source.isFolderMarker && source.includeSubfolders && (
                                  <span className="text-[9px] text-neutral-200 ml-2 uppercase tracking-widest font-black">{t('(Recursive)')}</span>
                                )}
                              </span>
                              <span className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">{source.path}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleContextVisibility(source.id); }}
                              className={`p-2 rounded-xl border transition-all ${source.isHidden ? 'bg-white/5 text-neutral-300 border-white/5 hover:text-white hover:bg-white/10' : 'bg-neutral-700/10 text-neutral-200 border-neutral-500/20 hover:bg-neutral-700/20'}`}
                              title={t(source.isHidden ? 'Include in analysis' : 'Exclude from analysis')}
                            >
                              {source.isHidden ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setToDelete({ ids: [source.id], remark: source.remark });
                              }}
                              className="p-2 bg-neutral-700/10 text-neutral-200 border border-neutral-500/20 rounded-xl hover:bg-neutral-700/20 transition-all"
                              title={`${t('Detach ')}${source.remark}`}
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
                      <FolderIcon className="w-10 h-10 text-neutral-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-neutral-300">{t('No sources added yet')}</p>
                      <p className="text-xs font-medium">{t('Add a folder or file to include it in your runs.')}</p>
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
        title={t('Remove source')}
      >
        {toDelete && (
          <div className="space-y-6">
            <div className="p-4 bg-neutral-700/10 border border-neutral-500/20 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-neutral-700/20 rounded-lg text-neutral-200 mt-1">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white leading-tight">{t('Remove source')}</p>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {t('Remove ')}<span className="text-neutral-200 font-bold font-mono">"{toDelete.remark}"</span>{t(' from your sources?')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-neutral-700/5 border border-neutral-500/10 rounded-2xl">
              <p className="text-[11px] text-neutral-300 leading-relaxed italic">
                {t('The original file stays on your disk.')}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all border border-white/5"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl bg-neutral-200 text-neutral-950 transition-all active:scale-95"
              >
                {t('Confirm Removal')}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
