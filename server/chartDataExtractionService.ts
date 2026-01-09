import { invokeLLM } from './_core/llm';

interface ExtractedTableData {
  headers: string[];
  rows: string[][];
  title?: string;
  description?: string;
}

interface ExtractedChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  title?: string;
  description?: string;
  data: any;
  xAxis?: string[];
  yAxis?: string;
  series?: {
    name: string;
    data: number[];
  }[];
}

/**
 * 从图片中提取表格数据
 */
export async function extractTableDataFromImage(imageUrl: string): Promise<ExtractedTableData> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: '你是一个专业的表格数据提取助手。请仔细分析图片中的表格，提取所有数据并以结构化的JSON格式返回。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请提取图片中的表格数据，包括表头和所有行数据。如果有标题或描述，也请一并提取。'
          }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'table_extraction',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '表格标题（如果有）'
            },
            description: {
              type: 'string',
              description: '表格描述或说明（如果有）'
            },
            headers: {
              type: 'array',
              items: { type: 'string' },
              description: '表头列名'
            },
            rows: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'string' }
              },
              description: '表格数据行'
            }
          },
          required: ['headers', 'rows'],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('无法提取表格数据');
  }

  // @ts-ignore
  return JSON.parse(content);
}

/**
 * 从图片中提取图表数据
 */
export async function extractChartDataFromImage(imageUrl: string): Promise<ExtractedChartData> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: '你是一个专业的图表数据提取助手。请仔细分析图片中的图表，识别图表类型并提取所有数据点。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请分析图片中的图表，识别图表类型（柱状图、折线图、饼图、散点图等），提取所有数据点、坐标轴标签和图例信息。'
          }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'chart_extraction',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['bar', 'line', 'pie', 'scatter', 'table'],
              description: '图表类型'
            },
            title: {
              type: 'string',
              description: '图表标题'
            },
            description: {
              type: 'string',
              description: '图表描述或说明'
            },
            xAxis: {
              type: 'array',
              items: { type: 'string' },
              description: 'X轴标签或类别'
            },
            yAxis: {
              type: 'string',
              description: 'Y轴标签或单位'
            },
            series: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  data: {
                    type: 'array',
                    items: { type: 'number' }
                  }
                },
                required: ['name', 'data'],
                additionalProperties: false
              },
              description: '数据系列'
            }
          },
          required: ['type', 'series'],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('无法提取图表数据');
  }

  // @ts-ignore
  const extracted = JSON.parse(content);
  return {
    ...extracted,
    data: extracted.series
  };
}

/**
 * 智能识别图片类型并提取数据
 */
export async function smartExtractData(imageUrl: string): Promise<{
  type: 'table' | 'chart' | 'mixed' | 'unknown';
  tableData?: ExtractedTableData;
  chartData?: ExtractedChartData;
  rawAnalysis?: string;
}> {
  // 首先让AI分析图片内容
  const analysisResponse = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: '你是一个专业的图表分析助手。请分析图片中包含的内容类型。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请分析这张图片包含什么类型的数据：1) 表格 2) 图表（柱状图、折线图、饼图等） 3) 混合（既有表格又有图表） 4) 其他'
          }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'content_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              enum: ['table', 'chart', 'mixed', 'unknown'],
              description: '图片内容类型'
            },
            hasTable: {
              type: 'boolean',
              description: '是否包含表格'
            },
            hasChart: {
              type: 'boolean',
              description: '是否包含图表'
            },
            chartType: {
              type: 'string',
              description: '图表类型（如果有）'
            },
            description: {
              type: 'string',
              description: '内容描述'
            }
          },
          required: ['contentType', 'hasTable', 'hasChart', 'description'],
          additionalProperties: false
        }
      }
    }
  });

  const analysisContent = analysisResponse.choices[0].message.content;
  if (!analysisContent) {
    return { type: 'unknown' };
  }

  // @ts-ignore
  const analysis = JSON.parse(analysisContent);

  // 根据分析结果提取数据
  const result: any = {
    type: analysis.contentType,
    rawAnalysis: analysis.description
  };

  if (analysis.hasTable) {
    try {
      result.tableData = await extractTableDataFromImage(imageUrl);
    } catch (error) {
      console.error('提取表格数据失败:', error);
    }
  }

  if (analysis.hasChart) {
    try {
      result.chartData = await extractChartDataFromImage(imageUrl);
    } catch (error) {
      console.error('提取图表数据失败:', error);
    }
  }

  return result;
}

/**
 * 将提取的数据转换为CSV格式
 */
export function convertToCSV(data: ExtractedTableData): string {
  const rows = [data.headers, ...data.rows];
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * 将提取的数据转换为Excel友好的JSON格式
 */
export function convertToExcelFormat(data: ExtractedTableData): any[] {
  return data.rows.map(row => {
    const obj: any = {};
    data.headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}
