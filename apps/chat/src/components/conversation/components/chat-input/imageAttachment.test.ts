import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE,
  createImageAttachment,
  isImageFile,
  pickImageFiles,
  pickImagesFromClipboard,
  supportsImageInput,
  toImageListPayload,
  validateImageFile,
} from './imageAttachment';

// node 测试环境无 File，构造仅含所需字段的轻量替身。
function fakeFile(type: string, size = 1024, name = 'a.png'): File {
  return { type, size, name } as unknown as File;
}

describe('supportsImageInput', () => {
  it('isMultimodal 为 1 或 "1" 判为支持', () => {
    expect(supportsImageInput({ isMultimodal: 1 })).toBe(true);
    expect(supportsImageInput({ isMultimodal: '1' })).toBe(true);
  });

  it('0、"0"、缺失与空值判为不支持', () => {
    expect(supportsImageInput({ isMultimodal: 0 })).toBe(false);
    expect(supportsImageInput({ isMultimodal: '0' })).toBe(false);
    expect(supportsImageInput({})).toBe(false);
    expect(supportsImageInput(null)).toBe(false);
    expect(supportsImageInput(undefined)).toBe(false);
  });
});

describe('isImageFile', () => {
  it('image/* 判为图片，其它类型与空值判否', () => {
    expect(isImageFile(fakeFile('image/png'))).toBe(true);
    expect(isImageFile(fakeFile('image/jpeg'))).toBe(true);
    expect(isImageFile(fakeFile('text/plain'))).toBe(false);
    expect(isImageFile(fakeFile(''))).toBe(false);
    expect(isImageFile(null)).toBe(false);
    expect(isImageFile(undefined)).toBe(false);
  });
});

describe('pickImageFiles', () => {
  it('从混合文件里筛出图片', () => {
    const files = [fakeFile('image/png'), fakeFile('application/pdf'), fakeFile('image/webp')];
    expect(pickImageFiles(files)).toHaveLength(2);
  });

  it('空输入返回空数组', () => {
    expect(pickImageFiles(null)).toEqual([]);
    expect(pickImageFiles(undefined)).toEqual([]);
  });
});

describe('pickImagesFromClipboard', () => {
  it('只取 kind=file 且 image/* 的项', () => {
    const imageFile = fakeFile('image/png');
    const clipboardData = {
      items: [
        { kind: 'file', type: 'image/png', getAsFile: () => imageFile },
        { kind: 'string', type: 'text/plain', getAsFile: () => fakeFile('text/plain') },
        { kind: 'file', type: 'application/pdf', getAsFile: () => fakeFile('application/pdf') },
      ],
    } as unknown as DataTransfer;
    expect(pickImagesFromClipboard(clipboardData)).toEqual([imageFile]);
  });

  it('无 items 返回空数组', () => {
    expect(pickImagesFromClipboard(null)).toEqual([]);
    expect(pickImagesFromClipboard({} as DataTransfer)).toEqual([]);
  });
});

describe('validateImageFile', () => {
  it('合法图片返回 null', () => {
    expect(validateImageFile(fakeFile('image/png', 1024))).toBeNull();
  });

  it('非图片返回文案', () => {
    expect(validateImageFile(fakeFile('text/plain'))).toBe('仅支持图片文件');
  });

  it('超过 10MB 返回文案', () => {
    expect(validateImageFile(fakeFile('image/png', MAX_IMAGE_SIZE + 1))).toBe('图片大小不能超过 10MB');
  });

  it('达到数量上限返回文案', () => {
    expect(validateImageFile(fakeFile('image/png'), MAX_IMAGE_COUNT)).toBe(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
  });
});

describe('toImageListPayload', () => {
  it('映射为 { name, data } 结构', () => {
    const payload = toImageListPayload([
      { id: '1', name: 'a.png', dataUrl: 'data:image/png;base64,AAA', size: 3 },
      { id: '2', name: 'b.png', dataUrl: 'data:image/png;base64,BBB', size: 3 },
    ]);
    expect(payload).toEqual([
      { name: 'a.png', data: 'data:image/png;base64,AAA' },
      { name: 'b.png', data: 'data:image/png;base64,BBB' },
    ]);
  });

  it('空数组返回空', () => {
    expect(toImageListPayload([])).toEqual([]);
  });
});

describe('createImageAttachment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFileReader(result = 'data:image/png;base64,MOCK') {
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error: unknown = null;
      readAsDataURL() {
        this.result = result;
        // 异步触发 onload，模拟真实 FileReader 行为
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);
  }

  it('合法图片转 base64 附件', async () => {
    stubFileReader();
    const att = await createImageAttachment(fakeFile('image/png', 2048, 'pic.png'));
    expect(att.dataUrl).toBe('data:image/png;base64,MOCK');
    expect(att.name).toBe('pic.png');
    expect(att.size).toBe(2048);
    expect(att.id).toBeTruthy();
  });

  it('非图片抛错', async () => {
    stubFileReader();
    await expect(createImageAttachment(fakeFile('text/plain'))).rejects.toThrow('仅支持图片文件');
  });

  it('超限抛错', async () => {
    stubFileReader();
    await expect(createImageAttachment(fakeFile('image/png', MAX_IMAGE_SIZE + 1))).rejects.toThrow('图片大小不能超过 10MB');
  });
});
