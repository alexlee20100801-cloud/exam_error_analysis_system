/**
 * 结构化数据验证服务
 * 集成Google Rich Results Test API验证页面的结构化数据
 */

/**
 * 验证URL的结构化数据
 * 使用Google Rich Results Test API
 */
export async function validateStructuredData(url: string): Promise<{
  success: boolean;
  isValid: boolean;
  richResultsTypes: string[];
  errors: Array<{
    severity: string;
    message: string;
    path?: string;
  }>;
  warnings: Array<{
    severity: string;
    message: string;
    path?: string;
  }>;
  rawResponse?: any;
  error?: string;
}> {
  try {
    // Google Rich Results Test API endpoint
    // 注意: 这是一个简化的实现,实际使用需要Google API Key
    // 可以使用Google Search Console API或Rich Results Test API
    
    // 方案1: 使用Google Search Console API (需要OAuth认证)
    // 方案2: 使用第三方验证服务
    // 方案3: 本地解析和验证(基于schema.org规范)
    
    // 这里实现本地验证逻辑
    const response = await fetch(url);
    const html = await response.text();
    
    // 提取JSON-LD结构化数据
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    
    if (!jsonLdMatches || jsonLdMatches.length === 0) {
      return {
        success: true,
        isValid: false,
        richResultsTypes: [],
        errors: [
          {
            severity: "ERROR",
            message: "未找到JSON-LD结构化数据",
          },
        ],
        warnings: [],
      };
    }
    
    const structuredDataList: any[] = [];
    const errors: Array<{ severity: string; message: string; path?: string }> = [];
    const warnings: Array<{ severity: string; message: string; path?: string }> = [];
    const richResultsTypes: Set<string> = new Set();
    
    // 解析每个JSON-LD块
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script type="application\/ld\+json">/i, "").replace(/<\/script>/i, "");
        const data = JSON.parse(jsonContent);
        structuredDataList.push(data);
        
        // 识别类型
        if (data["@type"]) {
          if (Array.isArray(data["@type"])) {
            data["@type"].forEach((type: string) => richResultsTypes.add(type));
          } else {
            richResultsTypes.add(data["@type"]);
          }
        }
        
        // 基本验证
        if (!data["@context"]) {
          errors.push({
            severity: "ERROR",
            message: "@context字段缺失",
            path: data["@type"] || "unknown",
          });
        }
        
        if (!data["@type"]) {
          errors.push({
            severity: "ERROR",
            message: "@type字段缺失",
          });
        }
        
        // 根据类型进行特定验证
        if (data["@type"] === "WebSite") {
          if (!data.name) {
            warnings.push({
              severity: "WARNING",
              message: "WebSite缺少name字段",
              path: "WebSite",
            });
          }
          if (!data.url) {
            errors.push({
              severity: "ERROR",
              message: "WebSite缺少url字段",
              path: "WebSite",
            });
          }
        }
        
        if (data["@type"] === "Organization") {
          if (!data.name) {
            errors.push({
              severity: "ERROR",
              message: "Organization缺少name字段",
              path: "Organization",
            });
          }
          if (!data.logo) {
            warnings.push({
              severity: "WARNING",
              message: "Organization缺少logo字段",
              path: "Organization",
            });
          }
        }
        
        if (data["@type"] === "Question") {
          if (!data.name) {
            errors.push({
              severity: "ERROR",
              message: "Question缺少name字段",
              path: "Question",
            });
          }
          if (!data.acceptedAnswer) {
            warnings.push({
              severity: "WARNING",
              message: "Question缺少acceptedAnswer字段",
              path: "Question",
            });
          }
        }
        
      } catch (parseError) {
        errors.push({
          severity: "ERROR",
          message: `JSON-LD解析失败: ${parseError instanceof Error ? parseError.message : "未知错误"}`,
        });
      }
    }
    
    return {
      success: true,
      isValid: errors.length === 0,
      richResultsTypes: Array.from(richResultsTypes),
      errors,
      warnings,
      rawResponse: structuredDataList,
    };
    
  } catch (error) {
    console.error("Failed to validate structured data:", error);
    return {
      success: false,
      isValid: false,
      richResultsTypes: [],
      errors: [],
      warnings: [],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 批量验证多个URL的结构化数据
 */
export async function validateMultipleUrls(urls: string[]): Promise<{
  results: Array<{
    url: string;
    validation: Awaited<ReturnType<typeof validateStructuredData>>;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: number;
  };
}> {
  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      validation: await validateStructuredData(url),
    }))
  );
  
  const summary = {
    total: results.length,
    valid: results.filter((r) => r.validation.isValid).length,
    invalid: results.filter((r) => !r.validation.isValid).length,
    errors: results.reduce((sum, r) => sum + r.validation.errors.length, 0),
  };
  
  return {
    results,
    summary,
  };
}

/**
 * 获取Google Rich Results Test的URL
 */
export function getRichResultsTestUrl(url: string): string {
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`;
}
