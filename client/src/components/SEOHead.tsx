import { useEffect } from "react";

/**
 * SEO Head组件
 * 动态设置页面的meta标签,包括OG图片、标题、描述等
 */

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  keywords?: string[];
  canonicalUrl?: string;
  structuredData?: Record<string, any>;
}

export function SEOHead({
  title,
  description,
  ogImage,
  ogType = "website",
  keywords = [],
  canonicalUrl,
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    // 设置页面标题
    if (title) {
      document.title = title;
      updateMetaTag("property", "og:title", title);
      updateMetaTag("name", "twitter:title", title);
    }

    // 设置页面描述
    if (description) {
      updateMetaTag("name", "description", description);
      updateMetaTag("property", "og:description", description);
      updateMetaTag("name", "twitter:description", description);
    }

    // 设置OG图片
    if (ogImage) {
      updateMetaTag("property", "og:image", ogImage);
      updateMetaTag("name", "twitter:image", ogImage);
      updateMetaTag("name", "twitter:card", "summary_large_image");
    }

    // 设置OG类型
    updateMetaTag("property", "og:type", ogType);

    // 设置关键词
    if (keywords.length > 0) {
      updateMetaTag("name", "keywords", keywords.join(", "));
    }

    // 设置canonical URL
    if (canonicalUrl) {
      updateLinkTag("canonical", canonicalUrl);
    }

    // 设置结构化数据
    if (structuredData) {
      updateStructuredData(structuredData);
    }

    // 清理函数
    return () => {
      // 可选: 重置为默认值
    };
  }, [title, description, ogImage, ogType, keywords, canonicalUrl, structuredData]);

  return null; // 这个组件不渲染任何内容
}

/**
 * 更新或创建meta标签
 */
function updateMetaTag(
  attribute: "name" | "property",
  attributeValue: string,
  content: string
) {
  let element = document.querySelector(
    `meta[${attribute}="${attributeValue}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

/**
 * 更新或创建link标签
 */
function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(
    `link[rel="${rel}"]`
  ) as HTMLLinkElement;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

/**
 * 更新结构化数据
 */
function updateStructuredData(data: Record<string, any>) {
  const scriptId = "structured-data";
  let element = document.getElementById(scriptId) as HTMLScriptElement;

  if (!element) {
    element = document.createElement("script");
    element.id = scriptId;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}
