import { useLanguage } from '../i18n';
import React from 'react';
import { View } from '../types';
import { MLIcon } from './icons/MLIcon';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

type IconName = 'workspace' | 'functions' | 'sources' | 'history' | 'settings';

const RailIcon: React.FC<{ name: IconName }> = ({ name }) => {
  const paths: Record<IconName, React.ReactNode> = {
    workspace: <><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="M3.5 9h17M8 14h8m-8 3h5" /></>,
    functions: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" /></>,
    sources: <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" />,
    history: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M10 2.8h4l.6 2.1 1.5.9 2.1-.5 2 3.4-1.5 1.6v1.8l1.5 1.6-2 3.4-2.1-.5-1.5.9-.6 2.1h-4l-.6-2.1-1.5-.9-2.1.5-2-3.4 1.5-1.6v-1.8L3.8 8.7l2-3.4 2.1.5 1.5-.9z" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="rail-icon">{paths[name]}</svg>;
};

const items: { view: View; label: string; icon: IconName }[] = [
  { view: View.Runner, label: 'Workspace', icon: 'workspace' },
  { view: View.FunctionManager, label: 'Functions', icon: 'functions' },
  { view: View.Context, label: 'Sources', icon: 'sources' },
  { view: View.History, label: 'History', icon: 'history' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    const { t } = useLanguage();
  const renderItem = ({ view, label, icon }: { view: View; label: string; icon: IconName }) => (
    <button
      key={view}
      type="button"
      className={`sidebar-link ${currentView === view ? 'is-active' : ''}`}
      onClick={() => setCurrentView(view)}
      aria-label={t(label)}
      aria-current={currentView === view ? 'page' : undefined}
    >
      <RailIcon name={icon} />
      <span className="sidebar-tooltip" aria-hidden="true">{t(label)}</span>
    </button>
  );

  return (
    <aside className="app-sidebar" aria-label={t('EpiTelos navigation')}>
      <button type="button" className="sidebar-brand" onClick={() => setCurrentView(View.Runner)} aria-label={t('EpiTelos, go to workspace')}>
        <span className="brand-mark" aria-hidden="true"><MLIcon className="brand-icon" /></span>
        <span className="brand-tooltip" aria-hidden="true">EpiTelos</span>
      </button>
      <nav className="sidebar-nav" aria-label={t('Main navigation')}>{items.map(renderItem)}</nav>
      <div className="sidebar-bottom">{renderItem({ view: View.Settings, label: 'Settings', icon: 'settings' })}</div>
    </aside>
  );
};
