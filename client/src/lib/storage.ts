/**
 * 客户端存储工具函数
 * 通过tRPC调用后端存储服务
 */

export async function storagePut(
  key: string,
  data: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  // 这里直接返回data URL，因为我们会在后端处理实际的S3上传
  // 前端只需要提供base64数据
  return {
    url: data,
    key: key,
  };
}
