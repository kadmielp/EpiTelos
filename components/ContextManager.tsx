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
    <div className="p-6 h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Modern Header with Gradient */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1.5">
          Context Manager
        </h2>
        <div className="h-0.5 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
      </div>
      
      {/* Add New Context Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-4 rounded-xl mb-4 border border-slate-700/50 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
          <div>
            <h3 className="text-lg font-bold text-white">Add New Context Source</h3>
            <p className="text-xs text-slate-400">Select local files or folders to provide context to AI</p>
          </div>
        </div>

        {/* Type Selection with Modern Radio Buttons */}
        <div className="flex items-center space-x-6 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Type:</span>
          <label className="flex items-center cursor-pointer group">
            <input 
              type="radio" 
              name="contextType" 
              value="folder" 
              checked={newType === 'folder'} 
              onChange={() => setNewType('folder')} 
              className="h-4 w-4 bg-slate-700 border-2 border-slate-500 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="ml-2 text-sm text-slate-200 font-medium group-hover:text-white transition-colors">Folder</span>
          </label>
          <label className="flex items-center cursor-pointer group">
            <input 
              type="radio" 
              name="contextType" 
              value="file" 
              checked={newType === 'file'} 
              onChange={() => setNewType('file')} 
              className="h-4 w-4 bg-slate-700 border-2 border-slate-500 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="ml-2 text-sm text-slate-200 font-medium group-hover:text-white transition-colors">File</span>
          </label>
        </div>
        
        {/* Include Subfolders Checkbox */}
        {newType === 'folder' && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <label className="flex items-center cursor-pointer group">
              <input 
                type="checkbox" 
                checked={includeSubfolders} 
                onChange={e => setIncludeSubfolders(e.target.checked)} 
                className="h-4 w-4 bg-slate-700 border-2 border-slate-500 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded-md transition-all" 
              />
              <span className="ml-2 text-sm text-slate-200 font-medium group-hover:text-white transition-colors">
                Include subfolders and their files
              </span>
            </label>
          </div>
        )}

        {/* Path and Remark Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="lg:col-span-2 flex items-center gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder={newType === 'folder' ? "Click Browse to select a folder..." : "Click Browse to select a file..."}
              readOnly
              className="flex-grow bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 cursor-default backdrop-blur-sm placeholder:text-slate-500"
            />
            <button
              onClick={handleBrowseClick}
              className="bg-slate-700/80 hover:bg-slate-600/80 text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all duration-300 flex-shrink-0 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:shadow-xl"
            >
              Browse...
            </button>
            {!isDesktop && (<input
              type="file"
              ref={webFileInputRef}
              onChange={handleWebFileSelect}
              className="hidden"
            />)}
          </div>
          <input
            type="text"
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Remark (e.g., 'My Daily Journal')"
            className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 backdrop-blur-sm placeholder:text-slate-500"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddContext}
          disabled={!newPath || !newRemark}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
        >
          Add Context
        </button>
      </div>

      {/* Managed Contexts Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-4 rounded-xl flex-grow overflow-hidden border border-slate-700/50 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 rounded-full"></div>
            <h3 className="text-lg font-bold text-white">Managed Contexts</h3>
          </div>
          <button
            onClick={handleRefreshAllFolders}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-slate-700/60 hover:bg-slate-600/60 text-white font-semibold rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            title="Refresh all folders set to include subdirectories"
          >
            <RefreshIcon className="w-4 h-4" />
            Refresh All
          </button>
        </div>

        {/* Context Tree */}
        <div className="flex-grow overflow-y-auto space-y-1 custom-scrollbar">
          {contexts.length > 0 ? (
            <ContextTreeView
              contexts={contexts}
              renderNode={(node, isExpanded, toggleExpand) => {
                const source = node.source;
                const isIntermediateFolder = !source;

                // Handle intermediate folders (e.g., `contexts_sample2` which is just a container)
                if (isIntermediateFolder) {
                  return (
                    <div className="flex items-center w-full p-2 rounded-lg hover:bg-slate-700/60 transition-all duration-200 group">
                      <div 
                        className="flex items-center cursor-pointer select-none flex-grow min-w-0" 
                        onClick={(e) => toggleExpand(e)}
                        title={node.id}
                      >
                        <FolderIcon className="w-4 h-4 mr-2 text-slate-400 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
                        <p className="text-sm font-medium truncate text-slate-400 group-hover:text-slate-300 transition-colors">{node.name}</p>
                      </div>
                    </div>
                  );
                }

                // Handle all nodes with a source (user-added files/folders, and derived files)
                return (
                  <div className={`flex items-center justify-between w-full p-2 rounded-lg transition-all duration-200 group hover:bg-slate-700/60 ${source.isHidden ? 'opacity-50' : ''}`}>
                    <div 
                      className="flex items-center cursor-pointer select-none flex-grow min-w-0" 
                      onClick={(e) => {
                        // Folder markers are expandable, all other sources (files) are inspectable
                        if (source.isFolderMarker) {
                          toggleExpand(e);
                        } else {
                          handleViewContext(source.id);
                        }
                      }}
                      title={source.path}
                    >
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-wider transition-all ${source.isFolderMarker ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {source.isFolderMarker ? 'DIR' : 'FILE'}
                      </span>
                      <p className="text-sm font-medium text-white truncate ml-2 group-hover:text-blue-300 transition-colors">{source.remark}</p>
                      {source.isFolderMarker && source.includeSubfolders && 
                        <span className="text-[10px] text-sky-400 ml-1.5 flex-shrink-0 font-semibold">(+subs)</span>
                      }
                    </div>

                    {/* Action buttons with fade-in effect */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleContextVisibility(source.id); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600/60 rounded-md transition-all duration-200 border border-transparent hover:border-slate-500/50"
                        title={source.isHidden ? 'Show in Function Runner' : 'Hide from Function Runner'}
                      >
                        {source.isHidden ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete({ ids: [source.id], remark: source.remark });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200 border border-transparent hover:border-red-500/30"
                        title={`Remove ${source.remark}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-700/50 rounded-full mb-3">
                  <span className="text-2xl">📁</span>
                </div>
                <p className="text-sm text-slate-400 font-medium mb-1">No context sources yet</p>
                <p className="text-xs text-slate-500">Add files or folders to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Confirm Removal"
      >
        {toDelete && (
          <div>
            <p className="text-slate-300 mb-2">
              Are you sure you want to remove <span className="font-semibold text-white">"{toDelete.remark}"</span>?
            </p>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
              <p className="text-xs text-slate-400">
                ℹ️ This will remove the item from this list. It will <span className="font-semibold text-slate-300">NOT delete</span> the actual file or folder from your computer.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setToDelete(null)} 
                className="px-4 py-2 text-sm rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-white font-semibold transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(71, 85, 105), rgb(51, 65, 85));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(59, 130, 246), rgb(147, 51, 234));
        }
      `}</style>
    </div>
  );
};