/**
 * 输入框图片附件工具：本地转 base64 供预览，并随消息写入请求体。
 * 后端图片/多模态接口未就绪，这里只做前端侧的采集、校验与序列化。
 */

export interface ImageAttachment {
  id: string;
  name: string;
  /** base64 dataURL，既用于预览 img.src 又用于写入请求。 */
  dataUrl: string;
  size: number;
}

/** 写入请求体的图片结构（前端约定，后端对接时按需调整字段名）。 */
export interface ImageListPayloadItem {
  name: string;
  data: string;
}

/** 单张图片大小上限，对齐 excel 上传的 10MB。 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
/** 单条消息最多携带图片数。 */
export const MAX_IMAGE_COUNT = 5;

/** 模型是否支持图片（多模态）输入；isMultimodal 为 1 或 '1' 视为支持。 */
export function supportsImageInput(model: { isMultimodal?: number | string } | null | undefined): boolean {
  return model?.isMultimodal === 1 || model?.isMultimodal === '1';
}

export function isImageFile(file: Pick<File, 'type'> | null | undefined): boolean {
  return typeof file?.type === 'string' && file.type.startsWith('image/');
}

/** 从 FileList / 文件数组里筛出图片文件。 */
export function pickImageFiles(files: ArrayLike<File> | null | undefined): File[] {
  if (!files) return [];
  return Array.from(files).filter(isImageFile);
}

/** 从粘贴事件剪贴板提取图片文件（截图/复制的图片）。 */
export function pickImagesFromClipboard(clipboardData: DataTransfer | null | undefined): File[] {
  const items = clipboardData?.items;
  if (!items) return [];
  const files: File[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

/**
 * 校验单张图片；合法返回 null，否则返回错误文案。
 * currentCount 为已选数量，用于限制单条消息图片总数。
 */
export function validateImageFile(file: Pick<File, 'type' | 'size'>, currentCount = 0): string | null {
  if (!isImageFile(file)) return '仅支持图片文件';
  if (file.size > MAX_IMAGE_SIZE) return '图片大小不能超过 10MB';
  if (currentCount >= MAX_IMAGE_COUNT) return `最多上传 ${MAX_IMAGE_COUNT} 张图片`;
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

let idSeed = 0;
function nextImageId(): string {
  idSeed += 1;
  return `img-${Date.now()}-${idSeed}`;
}

/** 校验并把 File 转为 ImageAttachment；校验不通过时抛错，由调用方提示。 */
export async function createImageAttachment(file: File, currentCount = 0): Promise<ImageAttachment> {
  const error = validateImageFile(file, currentCount);
  if (error) throw new Error(error);
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: nextImageId(),
    name: file.name || `image-${Date.now()}.png`,
    dataUrl,
    size: file.size,
  };
}

/** 把图片附件序列化为写入请求体的约定结构。 */
export function toImageListPayload(images: ImageAttachment[]): ImageListPayloadItem[] {
  return images.map((image) => ({ name: image.name, data: image.dataUrl }));
}
