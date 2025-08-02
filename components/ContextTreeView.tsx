
import React, { useState } from 'react';
import { IContextSource, TreeNode } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

/**
 * Recursively filters out intermediate folders that have no children and are not context sources themselves.
 */
const pruneEmptyFolders = (nodes: TreeNode[]): TreeNode[] => {
  return nodes
    .map(node => ({
      ...node,
      // First, prune the children of the current node
      children: pruneEmptyFolders(node.children),
    }))
    .filter(node => 
      // Then, keep the node only if it is a source itself or if it has any children left after pruning
      node.source || node.children.length > 0
    );
};

/**
 * Flattens the tree by removing intermediate container folders that do not have direct file children.
 * For example, a structure like Root -> FolderA -> FolderB -> file.md where FolderA is just a container
 * will be flattened to Root -> FolderB -> file.md.
 */
const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];

    for (const node of nodes) {
        // A node is a "pass-through" container if it's an intermediate folder (not a source itself)
        // and it does not contain any direct children that are files (sources).
        const isIntermediateContainer = !node.source && !node.children.some(child => !!child.source);

        if (isIntermediateContainer) {
            // This folder is just a container for other folders.
            // So, we skip it and process its children directly, adding them to the current level's results.
            result.push(...flattenTree(node.children));
        } else {
            // This node is either a file source, or a folder that contains file sources directly.
            // We should keep it, but we still need to process its children in case they contain pass-through folders.
            node.children = flattenTree(node.children);
            result.push(node);
        }
    }
    return result;
};


/**
 * Builds a hierarchical tree from a flat list of context sources.
 */
export const buildContextTree = (contexts: IContextSource[]): TreeNode[] => {
  const root: TreeNode = { id: 'root', name: 'Root', children: [] };
  // Use a map to keep track of nodes by their full path to avoid duplicates
  const nodes: Record<string, TreeNode> = { 'root': root };

  // Sort contexts by path length to ensure parent directories are created before their children
  const sortedContexts = [...contexts].sort((a, b) => a.path.length - b.path.length);

  sortedContexts.forEach(source => {
    const pathParts = source.path.replace(/\\/g, '/').split('/').filter(p => p);
    let parentNode = root;

    // Use a more robust loop to build up the path
    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        // Create a consistent key from the path parts, handling Windows/Unix separators
        const nodePath = pathParts.slice(0, i + 1).join('/');
        
        let currentNode = nodes[nodePath];

        if (!currentNode) {
            currentNode = {
                id: nodePath,
                name: part,
                children: [],
            };
            nodes[nodePath] = currentNode;
            parentNode.children.push(currentNode);
        }

        parentNode = currentNode;

        // If this is the last part of the path, it represents the actual source
        if (i === pathParts.length - 1) {
            currentNode.source = source;
        }
    }
  });

  // Recursively sort children: folders first, then alphabetically
  const sortNodes = (node: TreeNode) => {
      node.children.sort((a, b) => {
          const aIsFolder = (a.source?.type === 'folder') || (a.children.length > 0 && !a.source);
          const bIsFolder = (b.source?.type === 'folder') || (b.children.length > 0 && !b.source);
          if (aIsFolder && !bIsFolder) return -1;
          if (!aIsFolder && bIsFolder) return 1;
          return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNodes);
  };

  sortNodes(root);
  
  const prunedTree = pruneEmptyFolders(root.children);
  return flattenTree(prunedTree);
};


/**
 * Traverses a TreeNode and its descendants and collects the IDs of all sources found.
 * Does NOT include the ID of the starting node itself.
 */
export const getDescendantSourceIds = (node: TreeNode): string[] => {
  let ids: string[] = [];
  for (const child of node.children) {
    if (child.source) {
      ids.push(child.source.id);
    }
    ids = ids.concat(getDescendantSourceIds(child));
  }
  return ids;
};


interface RecursiveNodeProps {
  node: TreeNode;
  renderNode: (node: TreeNode, isExpanded: boolean, toggleExpand: (e: React.MouseEvent) => void) => React.ReactNode;
  level: number;
}

const RecursiveNode: React.FC<RecursiveNodeProps> = ({ node, renderNode, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  return (
    <div>
      <div 
        className="flex items-center"
        style={{ paddingLeft: `${level * 1.25}rem`}}
      >
        <div className="w-6 flex-shrink-0 flex items-center justify-center">
          {node.children.length > 0 && (
            <button 
              onClick={toggleExpand} 
              className="p-1 rounded-full text-slate-400 hover:text-white"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
        <div className="flex-grow min-w-0">
          {renderNode(node, isExpanded, toggleExpand)}
        </div>
      </div>

      {isExpanded && node.children.map(child => (
        <RecursiveNode key={child.id} node={child} renderNode={renderNode} level={level + 1} />
      ))}
    </div>
  );
}

interface ContextTreeViewProps {
  contexts: IContextSource[];
  renderNode: (node: TreeNode, isExpanded: boolean, toggleExpand: (e: React.MouseEvent) => void) => React.ReactNode;
}

export const ContextTreeView: React.FC<ContextTreeViewProps> = ({ contexts, renderNode }) => {
  const tree = buildContextTree(contexts);
  return (
    <>
      {tree.map(node => (
        <RecursiveNode key={node.id} node={node} renderNode={renderNode} level={0} />
      ))}
    </>
  );
};
