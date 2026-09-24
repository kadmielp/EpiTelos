import React, { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { useLanguage } from '../i18n';

// Match generated diagrams to the monochrome application palette.
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    logLevel: 'error',
    // @ts-ignore
    suppressErrorConsole: true,
    themeVariables: {
        fontFamily: 'Inter, sans-serif',
        primaryColor: '#292929',
        primaryTextColor: '#f3f3f3',
        primaryBorderColor: '#777777',
        lineColor: '#bdbdbd',
        secondaryColor: '#252525',
        tertiaryColor: '#1d1d1d',
        mainBkg: '#292929',
        nodeBorder: '#777777',
        clusterBkg: '#252525',
        titleColor: '#f3f3f3',
        edgeLabelBackground: '#252525',
        nodeTextColor: '#f3f3f3'
    }
});

interface MermaidDiagramProps {
    content: string;
}

export const MermaidDiagramSizeWrapper: React.FC<MermaidDiagramProps> = React.memo(({ content }) => {
    const { t } = useLanguage();
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!content || content.length < 10) return;

            if (content.trim().endsWith('-') || content.trim().endsWith('|')) return;

            try {
                const cleanContent = content.trim();
                const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;

                const isValid = await mermaid.parse(cleanContent, { suppressErrors: true });
                if (!isValid) {
                    setError(true);
                    return;
                }

                const { svg } = await mermaid.render(id, cleanContent);
                setSvg(svg);
                setError(false);
            } catch (err) {
                setError(true);
            }
        };

        renderDiagram();
    }, [content]);

    if (error && !svg) return null;

    if (!svg) return (
        <div className="flex flex-col items-center justify-center h-32 w-full bg-white/5 rounded-2xl border border-dashed border-white/10 my-6 animate-pulse">
            <div className="w-8 h-8 border-2 border-neutral-500/30 border-t-neutral-200 rounded-full animate-spin mb-3" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">{t('Constructing Diagram...')}</span>
        </div>
    );

    return (
        <div
            className="flex justify-center my-6 overflow-x-auto rounded-3xl bg-neutral-900/40 backdrop-blur-sm p-8 border border-white/5 shadow-2xl transition-all hover:border-neutral-500/20 group relative custom-scrollbar"
        >
            <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-bold text-neutral-200/50 uppercase tracking-widest">{t('Interactive Diagram')}</span>
            </div>
            <div
                className="mermaid-monochrome w-full h-full flex justify-center"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        </div>
    );
});
