import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
  canonical?: string;
}

export function SEO({
  title,
  description,
  keywords,
  ogImage,
  ogType = "website",
  structuredData,
  canonical,
}: SEOProps) {
  useEffect(() => {
    // 更新页面标题
    if (title) {
      document.title = `${title} - 深圳初高中错题分析学习系统`;
    }

    // 更新meta标签
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    };

    if (description) {
      updateMetaTag("description", description);
      updateMetaTag("og:description", description, true);
      updateMetaTag("twitter:description", description);
    }

    if (keywords) {
      updateMetaTag("keywords", keywords);
    }

    if (title) {
      updateMetaTag("og:title", `${title} - 深圳初高中错题分析学习系统`, true);
      updateMetaTag("twitter:title", `${title} - 深圳初高中错题分析学习系统`);
    }

    if (ogImage) {
      updateMetaTag("og:image", ogImage, true);
      updateMetaTag("twitter:image", ogImage);
    }

    if (ogType) {
      updateMetaTag("og:type", ogType, true);
    }

    // 更新canonical链接
    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.setAttribute("rel", "canonical");
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute("href", canonical);
    }

    // 添加结构化数据
    if (structuredData) {
      let scriptElement = document.querySelector('script[type="application/ld+json"][data-page-seo]');
      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.setAttribute("type", "application/ld+json");
        scriptElement.setAttribute("data-page-seo", "true");
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(structuredData);
    }

    // 清理函数
    return () => {
      // 移除页面级结构化数据
      const scriptElement = document.querySelector('script[type="application/ld+json"][data-page-seo]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [title, description, keywords, ogImage, ogType, structuredData, canonical]);

  return null;
}
