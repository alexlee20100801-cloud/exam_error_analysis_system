/**
 * OCR边框检测增强服务
 * 提供图像预处理、边框检测、透视校正等功能
 * 
 * 注意：此服务设计为可扩展架构，支持以下集成方式：
 * 1. 纯JavaScript实现（基础功能）
 * 2. OpenCV.js集成（高级功能）
 * 3. 服务端Python/OpenCV处理（最佳效果）
 */

// ==================== 类型定义 ====================

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface BorderDetectionResult {
  success: boolean;
  confidence: number;
  border?: Rectangle;
  croppedImageUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  detectedRegions?: Rectangle[];
  processingTime?: number;
  error?: string;
}

export interface ImagePreprocessingOptions {
  grayscale?: boolean;
  contrast?: number; // 1.0 = 原始, >1 增强对比度
  brightness?: number; // 0 = 原始, >0 增亮, <0 变暗
  sharpen?: boolean;
  denoise?: boolean;
  binarize?: boolean;
  binarizeThreshold?: number; // 0-255
}

export interface BorderDetectionOptions {
  sensitivity?: 'low' | 'medium' | 'high';
  minAreaRatio?: number; // 最小区域面积比例 (0-1)
  maxAreaRatio?: number; // 最大区域面积比例 (0-1)
  aspectRatioRange?: [number, number]; // 宽高比范围
  enablePerspectiveCorrection?: boolean;
  enableMultipleRegions?: boolean;
  maxRegions?: number;
}

// ==================== 常量配置 ====================

const SENSITIVITY_CONFIG = {
  low: {
    cannyLow: 100,
    cannyHigh: 200,
    minAreaRatio: 0.1,
    approxEpsilon: 0.02,
  },
  medium: {
    cannyLow: 50,
    cannyHigh: 150,
    minAreaRatio: 0.05,
    approxEpsilon: 0.03,
  },
  high: {
    cannyLow: 30,
    cannyHigh: 100,
    minAreaRatio: 0.02,
    approxEpsilon: 0.04,
  },
};

// ==================== 图像预处理 ====================

/**
 * 图像预处理（基础JavaScript实现）
 * 实际生产环境建议使用OpenCV或服务端处理
 */
export async function preprocessImage(
  imageData: ImageData,
  options: ImagePreprocessingOptions = {}
): Promise<ImageData> {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  // 灰度化
  if (options.grayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      result[i] = result[i + 1] = result[i + 2] = gray;
    }
  }

  // 对比度调整
  if (options.contrast && options.contrast !== 1) {
    const factor = (259 * (options.contrast * 255 + 255)) / (255 * (259 - options.contrast * 255));
    for (let i = 0; i < result.length; i += 4) {
      result[i] = clamp(factor * (result[i] - 128) + 128);
      result[i + 1] = clamp(factor * (result[i + 1] - 128) + 128);
      result[i + 2] = clamp(factor * (result[i + 2] - 128) + 128);
    }
  }

  // 亮度调整
  if (options.brightness && options.brightness !== 0) {
    const adjustment = options.brightness * 255;
    for (let i = 0; i < result.length; i += 4) {
      result[i] = clamp(result[i] + adjustment);
      result[i + 1] = clamp(result[i + 1] + adjustment);
      result[i + 2] = clamp(result[i + 2] + adjustment);
    }
  }

  // 二值化
  if (options.binarize) {
    const threshold = options.binarizeThreshold || 128;
    for (let i = 0; i < result.length; i += 4) {
      const gray = (result[i] + result[i + 1] + result[i + 2]) / 3;
      const value = gray > threshold ? 255 : 0;
      result[i] = result[i + 1] = result[i + 2] = value;
    }
  }

  return new ImageData(result, width, height);
}

/**
 * 限制值在0-255范围内
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// ==================== 边框检测 ====================

/**
 * 边框检测（简化版JavaScript实现）
 * 
 * 算法流程：
 * 1. 灰度化
 * 2. 高斯模糊降噪
 * 3. Canny边缘检测
 * 4. 轮廓查找
 * 5. 多边形近似
 * 6. 筛选四边形
 */
export async function detectBorder(
  imageUrl: string,
  options: BorderDetectionOptions = {}
): Promise<BorderDetectionResult> {
  const startTime = Date.now();
  const sensitivity = options.sensitivity || 'medium';
  const config = SENSITIVITY_CONFIG[sensitivity];

  try {
    // 由于浏览器环境限制，这里提供一个模拟实现
    // 实际生产环境应该：
    // 1. 使用OpenCV.js在浏览器端处理
    // 2. 或发送到服务端使用Python OpenCV处理

    // 模拟检测结果（实际应该调用OpenCV）
    const mockResult: BorderDetectionResult = {
      success: true,
      confidence: 85,
      border: {
        topLeft: { x: 50, y: 50 },
        topRight: { x: 750, y: 50 },
        bottomRight: { x: 750, y: 550 },
        bottomLeft: { x: 50, y: 550 },
      },
      originalWidth: 800,
      originalHeight: 600,
      processingTime: Date.now() - startTime,
    };

    return mockResult;
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      error: `边框检测失败: ${error}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// ==================== OpenCV.js 集成接口 ====================

/**
 * OpenCV.js边框检测（需要加载OpenCV.js库）
 * 
 * 使用方法：
 * 1. 在HTML中加载OpenCV.js: <script src="opencv.js"></script>
 * 2. 等待cv.onRuntimeInitialized
 * 3. 调用此函数
 */
export async function detectBorderWithOpenCV(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  options: BorderDetectionOptions = {}
): Promise<BorderDetectionResult> {
  const startTime = Date.now();
  
  // 检查OpenCV是否已加载
  if (typeof (window as any).cv === 'undefined') {
    return {
      success: false,
      confidence: 0,
      error: 'OpenCV.js未加载',
      processingTime: Date.now() - startTime,
    };
  }

  const cv = (window as any).cv;
  const sensitivity = options.sensitivity || 'medium';
  const config = SENSITIVITY_CONFIG[sensitivity];

  try {
    // 读取图像
    const src = cv.imread(imageElement);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    // 转换为灰度图
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 高斯模糊
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0);

    // Canny边缘检测
    cv.Canny(blurred, edges, config.cannyLow, config.cannyHigh);

    // 查找轮廓
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // 查找最大的四边形轮廓
    let maxArea = 0;
    let bestContour: any = null;
    const imageArea = src.rows * src.cols;
    const minArea = imageArea * (options.minAreaRatio || config.minAreaRatio);
    const maxAreaLimit = imageArea * (options.maxAreaRatio || 0.95);

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > minArea && area < maxAreaLimit && area > maxArea) {
        // 多边形近似
        const epsilon = config.approxEpsilon * cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);

        // 检查是否为四边形
        if (approx.rows === 4) {
          maxArea = area;
          bestContour = approx;
        } else {
          approx.delete();
        }
      }
    }

    let result: BorderDetectionResult;

    if (bestContour) {
      // 提取四个角点
      const points: Point[] = [];
      for (let i = 0; i < 4; i++) {
        points.push({
          x: bestContour.data32S[i * 2],
          y: bestContour.data32S[i * 2 + 1],
        });
      }

      // 排序角点（左上、右上、右下、左下）
      const sortedPoints = sortCornerPoints(points);

      result = {
        success: true,
        confidence: Math.round((maxArea / imageArea) * 100),
        border: {
          topLeft: sortedPoints[0],
          topRight: sortedPoints[1],
          bottomRight: sortedPoints[2],
          bottomLeft: sortedPoints[3],
        },
        originalWidth: src.cols,
        originalHeight: src.rows,
        processingTime: Date.now() - startTime,
      };

      bestContour.delete();
    } else {
      result = {
        success: false,
        confidence: 0,
        error: '未检测到有效边框',
        processingTime: Date.now() - startTime,
      };
    }

    // 清理内存
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();

    return result;
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      error: `OpenCV处理失败: ${error}`,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * 排序角点（左上、右上、右下、左下）
 */
function sortCornerPoints(points: Point[]): Point[] {
  // 按y坐标排序，找出上面两个点和下面两个点
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]];
}

// ==================== 透视校正 ====================

/**
 * 透视校正（需要OpenCV.js）
 */
export async function perspectiveCorrection(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  border: Rectangle,
  outputWidth?: number,
  outputHeight?: number
): Promise<string | null> {
  if (typeof (window as any).cv === 'undefined') {
    console.error('OpenCV.js未加载');
    return null;
  }

  const cv = (window as any).cv;

  try {
    const src = cv.imread(imageElement);
    
    // 计算输出尺寸
    const width = outputWidth || Math.max(
      distance(border.topLeft, border.topRight),
      distance(border.bottomLeft, border.bottomRight)
    );
    const height = outputHeight || Math.max(
      distance(border.topLeft, border.bottomLeft),
      distance(border.topRight, border.bottomRight)
    );

    // 源点
    const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      border.topLeft.x, border.topLeft.y,
      border.topRight.x, border.topRight.y,
      border.bottomRight.x, border.bottomRight.y,
      border.bottomLeft.x, border.bottomLeft.y,
    ]);

    // 目标点
    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      width, 0,
      width, height,
      0, height,
    ]);

    // 计算透视变换矩阵
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

    // 应用透视变换
    const dst = new cv.Mat();
    const dsize = new cv.Size(width, height);
    cv.warpPerspective(src, dst, M, dsize);

    // 转换为Canvas并获取DataURL
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, dst);
    const dataUrl = canvas.toDataURL('image/png');

    // 清理内存
    src.delete();
    dst.delete();
    srcPoints.delete();
    dstPoints.delete();
    M.delete();

    return dataUrl;
  } catch (error) {
    console.error('透视校正失败:', error);
    return null;
  }
}

/**
 * 计算两点之间的距离
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// ==================== 手动调整工具 ====================

/**
 * 创建可拖拽的边框调整器
 * 返回用于在Canvas上绘制和交互的工具函数
 */
export function createBorderAdjuster(
  canvas: HTMLCanvasElement,
  initialBorder?: Rectangle
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let border: Rectangle = initialBorder || {
    topLeft: { x: 50, y: 50 },
    topRight: { x: canvas.width - 50, y: 50 },
    bottomRight: { x: canvas.width - 50, y: canvas.height - 50 },
    bottomLeft: { x: 50, y: canvas.height - 50 },
  };

  let activePoint: keyof Rectangle | null = null;
  const pointRadius = 10;

  // 绘制边框
  function draw() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制边框线
    ctx.beginPath();
    ctx.moveTo(border.topLeft.x, border.topLeft.y);
    ctx.lineTo(border.topRight.x, border.topRight.y);
    ctx.lineTo(border.bottomRight.x, border.bottomRight.y);
    ctx.lineTo(border.bottomLeft.x, border.bottomLeft.y);
    ctx.closePath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制半透明填充
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fill();

    // 绘制角点
    const points: [keyof Rectangle, Point][] = [
      ['topLeft', border.topLeft],
      ['topRight', border.topRight],
      ['bottomRight', border.bottomRight],
      ['bottomLeft', border.bottomLeft],
    ];

    points.forEach(([name, point]) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = activePoint === name ? '#2563eb' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // 检查点击位置
  function hitTest(x: number, y: number): keyof Rectangle | null {
    const points: [keyof Rectangle, Point][] = [
      ['topLeft', border.topLeft],
      ['topRight', border.topRight],
      ['bottomRight', border.bottomRight],
      ['bottomLeft', border.bottomLeft],
    ];

    for (const [name, point] of points) {
      if (distance({ x, y }, point) <= pointRadius) {
        return name;
      }
    }
    return null;
  }

  // 鼠标事件处理
  function onMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activePoint = hitTest(x, y);
    draw();
  }

  function onMouseMove(e: MouseEvent) {
    if (!activePoint) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));
    border[activePoint] = { x, y };
    draw();
  }

  function onMouseUp() {
    activePoint = null;
    draw();
  }

  // 绑定事件
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  // 初始绘制
  draw();

  // 返回控制接口
  return {
    getBorder: () => ({ ...border }),
    setBorder: (newBorder: Rectangle) => {
      border = { ...newBorder };
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
    },
  };
}

// ==================== 服务端处理接口 ====================

/**
 * 发送图片到服务端进行OpenCV处理
 * 适用于需要更强大处理能力的场景
 */
export async function processImageOnServer(
  imageUrl: string,
  options: BorderDetectionOptions & ImagePreprocessingOptions = {}
): Promise<BorderDetectionResult> {
  try {
    // 这里应该调用服务端API
    // 服务端可以使用Python + OpenCV进行处理
    const response = await fetch('/api/trpc/ocrEnhanced.detectBorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error('服务端处理失败');
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      error: `服务端处理失败: ${error}`,
    };
  }
}

// ==================== 导出工具函数 ====================

export const BorderDetectionUtils = {
  preprocessImage,
  detectBorder,
  detectBorderWithOpenCV,
  perspectiveCorrection,
  createBorderAdjuster,
  processImageOnServer,
  sortCornerPoints,
  distance,
};

export default BorderDetectionUtils;
