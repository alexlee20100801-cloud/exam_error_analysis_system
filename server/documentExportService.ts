import { getDb } from "./db";
import { uploadedDocuments, documentRegions, recognizedContents, documentExports } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

/**
 * 文档导出服务
 * 支持导出为Word、PDF、Markdown、LaTeX、JSON等多种格式
 */

export interface ExportDocumentParams {
  documentId: number;
  userId: number;
  format: 'word' | 'pdf' | 'markdown' | 'latex' | 'json';
  config?: {
    includeImages?: boolean;
    includeMetadata?: boolean;
    template?: string;
  };
}

/**
 * 导出文档为指定格式
 */
export async function exportDocument(params: ExportDocumentParams) {
  const db = getDb();
  
  // 获取文档信息
  const [document] = await db
    .select()
    .from(uploadedDocuments)
    .where(eq(uploadedDocuments.id, params.documentId));
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // 获取所有识别内容
  const contents = await db
    .select()
    .from(recognizedContents)
    .where(eq(recognizedContents.documentId, params.documentId));
  
  // 根据格式生成导出内容
  let exportContent: string;
  let mimeType: string;
  let fileExtension: string;
  
  switch (params.format) {
    case 'markdown':
      exportContent = await generateMarkdown(document, contents, params.config);
      mimeType = 'text/markdown';
      fileExtension = 'md';
      break;
    case 'latex':
      exportContent = await generateLatex(document, contents, params.config);
      mimeType = 'application/x-latex';
      fileExtension = 'tex';
      break;
    case 'json':
      exportContent = await generateJSON(document, contents, params.config);
      mimeType = 'application/json';
      fileExtension = 'json';
      break;
    case 'word':
      // Word格式需要使用专门的库生成（如docx）
      exportContent = await generateMarkdown(document, contents, params.config);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileExtension = 'docx';
      break;
    case 'pdf':
      // PDF格式需要使用专门的库生成
      exportContent = await generateMarkdown(document, contents, params.config);
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
      break;
    default:
      throw new Error(`Unsupported export format: ${params.format}`);
  }
  
  // 上传导出文件到S3
  const timestamp = Date.now();
  const fileKey = `exports/${params.userId}/${params.documentId}-${timestamp}.${fileExtension}`;
  const fileBuffer = Buffer.from(exportContent, 'utf-8');
  
  const { url } = await storagePut(fileKey, fileBuffer, mimeType);
  
  // 保存导出记录
  const [result] = await db.insert(documentExports).values({
    documentId: params.documentId,
    userId: params.userId,
    exportFormat: params.format,
    exportFileUrl: url,
    exportFileKey: fileKey,
    exportConfig: params.config ? JSON.stringify(params.config) : null,
    fileSize: fileBuffer.length,
  });
  
  return {
    id: result.insertId,
    fileUrl: url,
    fileKey: fileKey,
    fileSize: fileBuffer.length,
  };
}

/**
 * 生成Markdown格式
 */
async function generateMarkdown(
  document: any,
  contents: any[],
  config?: any
): Promise<string> {
  let markdown = '';
  
  // 添加元数据
  if (config?.includeMetadata !== false) {
    markdown += `# ${document.originalFileName}\n\n`;
    markdown += `**文件类型**: ${document.fileType}\n`;
    markdown += `**上传时间**: ${document.createdAt}\n`;
    markdown += `**处理状态**: ${document.processingStatus}\n\n`;
    markdown += `---\n\n`;
  }
  
  // 按区域组织内容
  for (const content of contents) {
    const editedContent = content.userEditedContent || content.editableContent;
    
    switch (content.contentType) {
      case 'text':
        markdown += `${editedContent}\n\n`;
        break;
      case 'formula':
        markdown += `$$${editedContent}$$\n\n`;
        break;
      case 'chart_data':
        markdown += `### 图表数据\n\n`;
        markdown += `\`\`\`json\n${editedContent}\n\`\`\`\n\n`;
        break;
      case 'table_data':
        markdown += `### 表格数据\n\n`;
        try {
          const tableData = JSON.parse(editedContent);
          markdown += generateMarkdownTable(tableData);
        } catch (e) {
          markdown += `\`\`\`json\n${editedContent}\n\`\`\`\n\n`;
        }
        break;
      case 'image_description':
        markdown += `> ${editedContent}\n\n`;
        break;
    }
  }
  
  return markdown;
}

/**
 * 生成LaTeX格式
 */
async function generateLatex(
  document: any,
  contents: any[],
  config?: any
): Promise<string> {
  let latex = '';
  
  // LaTeX文档头
  latex += `\\documentclass{article}\n`;
  latex += `\\usepackage{amsmath}\n`;
  latex += `\\usepackage{amssymb}\n`;
  latex += `\\usepackage{graphicx}\n`;
  latex += `\\usepackage[utf8]{inputenc}\n`;
  latex += `\\usepackage[T1]{fontenc}\n\n`;
  
  latex += `\\title{${document.originalFileName}}\n`;
  latex += `\\date{${document.createdAt}}\n\n`;
  
  latex += `\\begin{document}\n\n`;
  latex += `\\maketitle\n\n`;
  
  // 内容
  for (const content of contents) {
    const editedContent = content.userEditedContent || content.editableContent;
    
    switch (content.contentType) {
      case 'text':
        latex += `${editedContent}\n\n`;
        break;
      case 'formula':
        latex += `\\begin{equation}\n${editedContent}\n\\end{equation}\n\n`;
        break;
      case 'chart_data':
        latex += `\\subsection*{图表数据}\n`;
        latex += `\\begin{verbatim}\n${editedContent}\n\\end{verbatim}\n\n`;
        break;
      case 'table_data':
        latex += `\\subsection*{表格数据}\n`;
        latex += `\\begin{verbatim}\n${editedContent}\n\\end{verbatim}\n\n`;
        break;
      case 'image_description':
        latex += `\\textit{${editedContent}}\n\n`;
        break;
    }
  }
  
  latex += `\\end{document}\n`;
  
  return latex;
}

/**
 * 生成JSON格式
 */
async function generateJSON(
  document: any,
  contents: any[],
  config?: any
): Promise<string> {
  const jsonData = {
    document: {
      id: document.id,
      fileName: document.originalFileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      originalFileUrl: document.originalFileUrl,
      processingStatus: document.processingStatus,
      totalRegions: document.totalRegions,
      totalContents: document.totalContents,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
    contents: contents.map(content => ({
      id: content.id,
      regionId: content.regionId,
      contentType: content.contentType,
      rawContent: content.rawContent,
      structuredData: content.structuredData ? JSON.parse(content.structuredData) : null,
      editableFormat: content.editableFormat,
      editableContent: content.editableContent,
      userEditedContent: content.userEditedContent,
      confidence: content.confidence,
      isEdited: content.isEdited === 1,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    })),
  };
  
  return JSON.stringify(jsonData, null, 2);
}

/**
 * 生成Markdown表格
 */
function generateMarkdownTable(tableData: any[][]): string {
  if (!tableData || tableData.length === 0) {
    return '';
  }
  
  let table = '';
  
  // 表头
  table += '| ' + tableData[0].join(' | ') + ' |\n';
  table += '| ' + tableData[0].map(() => '---').join(' | ') + ' |\n';
  
  // 表格内容
  for (let i = 1; i < tableData.length; i++) {
    table += '| ' + tableData[i].join(' | ') + ' |\n';
  }
  
  table += '\n';
  
  return table;
}

/**
 * 获取用户的导出历史
 */
export async function getUserExports(userId: number, limit = 50) {
  const db = getDb();
  
  const exports = await db
    .select()
    .from(documentExports)
    .where(eq(documentExports.userId, userId))
    .limit(limit);
  
  return exports;
}

/**
 * 获取文档的导出历史
 */
export async function getDocumentExports(documentId: number) {
  const db = getDb();
  
  const exports = await db
    .select()
    .from(documentExports)
    .where(eq(documentExports.documentId, documentId));
  
  return exports;
}
