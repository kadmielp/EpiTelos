

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
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold text-white mb-6">Context Manager</h2>
      
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <h3 className="text-xl font-semibold text-white mb-3">Add New Context Source</h3>
        <p className="text-sm text-slate-400 mb-4">
          Click "Browse" to select a local folder or file to provide as context to the AI.
        </p>

        <div className="flex items-center space-x-6 mb-4">
          <span className="text-sm font-medium text-slate-300">Type:</span>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="contextType" value="folder" checked={newType === 'folder'} onChange={() => setNewType('folder')} className="h-4 w-4 bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500" />
            <span className="ml-2 text-slate-200">Folder</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="contextType" value="file" checked={newType === 'file'} onChange={() => setNewType('file')} className="h-4 w-4 bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500" />
            <span className="ml-2 text-slate-200">File</span>
          </label>
        </div>
        
        {newType === 'folder' && (
          <div className="mb-4">
             <label className="flex items-center cursor-pointer text-slate-300">
                <input type="checkbox" checked={includeSubfolders} onChange={e => setIncludeSubfolders(e.target.checked)} className="h-4 w-4 bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2">Include subfolders and their files</span>
             </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder={newType === 'folder' ? "Click Browse to select a folder..." : "Click Browse to select a file..."}
              readOnly
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500 cursor-default"
            />
            <button
              onClick={handleBrowseClick}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex-shrink-0"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleAddContext}
          className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-500"
          disabled={!newPath || !newRemark}
        >
          Add Context
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg flex-grow overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold text-white">Managed Contexts</h3>
            <button
                onClick={handleRefreshAllFolders}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors"
                title="Refresh all folders set to include subdirectories"
            >
                <RefreshIcon className="w-4 h-4" />
                Refresh All
            </button>
        </div>
        <div className="space-y-1">
          {contexts.length > 0 ? (
            <ContextTreeView
              contexts={contexts}
              renderNode={(node, isExpanded, toggleExpand) => {
                const source = node.source;
                const isIntermediateFolder = !source;

                // Handle intermediate folders (e.g., `contexts_sample2` which is just a container)
                if (isIntermediateFolder) {
                  return (
                    <div className="flex items-center w-full p-1 rounded-md hover:bg-slate-600 transition-colors">
                      <div 
                        className="flex items-center cursor-pointer select-none flex-grow min-w-0" 
                        onClick={(e) => toggleExpand(e)}
                        title={node.id} // Use node.id as path for intermediate folder nodes
                      >
                        <FolderIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                        <p className="font-medium truncate text-slate-400">{node.name}</p>
                      </div>
                    </div>
                  );
                }

                // Handle all nodes with a source (user-added files/folders, and derived files)
                return (
                  <div className={`flex items-center justify-between w-full p-1 rounded-md transition-opacity hover:bg-slate-600 transition-colors ${source.isHidden ? 'opacity-50' : ''}`}>
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
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${source.isFolderMarker ? 'bg-sky-900 text-sky-300' : 'bg-emerald-900 text-emerald-300'}`}>
                        {source.isFolderMarker ? 'DIR' : 'FILE'}
                      </span>
                      <p className="font-medium text-white truncate ml-3">{source.remark}</p>
                      {source.isFolderMarker && source.includeSubfolders && 
                        <span className="text-xs text-sky-400 ml-1.5 flex-shrink-0">(+subs)</span>
                      }
                    </div>

                    {/* Action buttons are shown for all sources */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleContextVisibility(source.id); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-md transition-colors"
                        title={source.isHidden ? 'Show in Function Runner' : 'Hide from Function Runner'}
                      >
                        {source.isHidden ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete({ ids: [source.id], remark: source.remark });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-900/50 rounded-md transition-colors"
                        title={`Remove ${source.remark}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          ) : <p className="text-slate-500 text-center py-4">No context sources have been added yet.</p>}
        </div>
      </div>

      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Confirm Removal"
      >
        {toDelete && (
          <div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to remove "{toDelete.remark}"?
              <span className="block mt-2 text-slate-400">
                This will remove the item from this list. It will NOT delete the actual file or folder from your computer.
              </span>
            </p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setToDelete(null)} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
