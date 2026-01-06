/**
 * LaTeX公式预览组件
 * 使用KaTeX渲染LaTeX公式
 */

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexPreviewProps {
  latex: string;
  displayMode?: boolean; // true为块级公式，false为行内公式
  className?: string;
}

export function LatexPreview({ latex, displayMode = false, className = '' }: LatexPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: 'warn',
          trust: false,
        });
      } catch (error) {
        console.error('KaTeX渲染错误:', error);
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={className} />;
}

/**
 * 在文本中渲染LaTeX公式
 * 支持行内公式 $...$ 和块级公式 $$...$$
 */
interface LatexTextProps {
  text: string;
  className?: string;
}

export function LatexText({ text, className = '' }: LatexTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && text) {
      // 先设置文本内容
      containerRef.current.textContent = text;
      
      try {
        // 使用KaTeX的自动渲染功能
        const renderMathInElement = require('katex/dist/contrib/auto-render.js');
        
        renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
          ],
          throwOnError: false,
          errorColor: '#cc0000',
          strict: 'warn',
          trust: false,
        });
      } catch (error) {
        console.error('KaTeX自动渲染错误:', error);
      }
    }
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={className}
    />
  );
}
