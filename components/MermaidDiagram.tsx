import React, { useState, useEffect } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid with premium styling
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    logLevel: 'error',
    // @ts-ignore
    suppressErrorConsole: true,
    themeVariables: {
        fontFamily: '"Outfit", "Inter", sans-serif',
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        mainBkg: '#0f172a',
        nodeBorder: '#334155',
        clusterBkg: '#1e293b',
        titleColor: '#94a3b8',
        edgeLabelBackground: '#1e293b',
        nodeTextColor: '#f1f5f9'
    }
});

interface MermaidDiagramProps {
    content: string;
}

export const MermaidDiagramSizeWrapper: React.FC<MermaidDiagramProps> = React.memo(({ content }) => {
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
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Constructing Diagram...</span>
        </div>
    );

    return (
        <div
            className="flex justify-center my-6 overflow-x-auto rounded-3xl bg-slate-900/40 backdrop-blur-sm p-8 border border-white/5 shadow-2xl transition-all hover:border-blue-500/20 group relative custom-scrollbar"
        >
            <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest">Interactive Diagram</span>
            </div>
            <div
                className="w-full h-full flex justify-center"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        </div>
    );
});
