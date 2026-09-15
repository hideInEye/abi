/*
 * Copyright © 2023-2025 puyinzhen
 * All rights reserved.
 *
 * The copyright of this work (or idea/project/document) is owned by puyinzhen. Without explicit written permission, no part of this work may be reproduced, distributed, or modified in any form for commercial purposes.
 *
 * This copyright statement applies to, but is not limited to: concept descriptions, design documents, source code, images, presentation files, and any related content.
 *
 * For permission to use this work or any part of it, please contact 1182810784@qq.com to obtain written authorization.
 */

import {AbstractApi} from "./AbstractApi.ts";
import {IPage, IPageParam, IProject, IProjectInfo, ProjectDataType} from "../designer/DesignerType.ts";
import URLUtil from "../utils/URLUtil.ts";
import {globalMessage} from "../framework/message/GlobalMessage.tsx";
import {IImageData} from "../comps/lc/base-image/BaseImageComponent.tsx";
import FetchUtil from "../utils/FetchUtil.ts";

class BaseApi extends AbstractApi {

    async createProject(project: IProjectInfo): Promise<string> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/create', project);
        if (res.code !== 200) {
            globalMessage.messageApi?.error(res.msg);
            return '';
        }
        return res.data;
    }

    /**
     * 获取数据语义分组树（分组 + 数据语义统一节点树，一次性返回，含各级子分组与数据语义叶子）
     * @param spaceId 空间id
     */
    async fetchSemanticTree(spaceId: number): Promise<any[]> {
        const res = await FetchUtil.get(`/copilot/v1/schema/tree?spaceId=${spaceId}`);
        return res.code === 200 ? (res.data || []) : [];
    }

    /**
     * 新建对话会话（abi-chat）
     * 调用 /abi-chat/v1/app/session/add，返回后端生成的 sessionId 与 convUid，
     * 供大屏对话（chat/completions）作为 session_id / conv_uid 使用（与 chat 对话新建会话同源）。
     * @param params spaceId 必传；title/userId 可选
     */
    async addChatSession(params: {spaceId: number; title?: string; userId?: number}): Promise<{sessionId: string; convUid: string} | null> {
        const res = await FetchUtil.post('/abi-chat/v1/app/session/add', {
            appId: 1,
            spaceId: params.spaceId,
            title: params.title ?? '新建对话',
            userId: params.userId,
            groupId: '0',
        });
        if (res.code !== 200 || !res.data) return null;
        const d = res.data;
        const sessionId = d.sessionId ?? d.session_id ?? d.chat_id ?? d.chatId;
        const convUid = d.conv_uid ?? d.convUid;
        return sessionId && convUid ? {sessionId: String(sessionId), convUid: String(convUid)} : null;
    }

    /**
     * 拉取会话历史消息（abi-chat）
     * 调用 /abi-chat/v1/app/message/query（与 chat 对话历史同源），按 conv_uid 返回全部轮次消息。
     * 返回按轮次分组后展平的原始消息列表（含 roleType / messageDetail.data.content / roundIndex / createTime），
     * 由调用方（大屏对话面板）自行映射为展示所需结构。
     * @param convUid 会话 conv_uid
     */
    async fetchSessionMessages(convUid: string): Promise<any[]> {
        if (!convUid) return [];
        const res = await FetchUtil.post('/abi-chat/v1/app/message/query', {convUid});
        if (res.code !== 200) return [];
        const roundGroups: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
        return roundGroups.flatMap((g: any) => (Array.isArray(g?.messages) ? g.messages : []));
    }

    /**
     * 清空会话消息（abi-chat）
     * 调用 /abi-chat/v1/app/message/delete（与 chat 对话删除消息同源），按 convUid 删除该会话全部消息。
     * @param convUid 会话uid
     */
    async clearChatConv(convUid: string): Promise<boolean> {
        const res = await FetchUtil.post('/abi-chat/v1/app/message/delete', {convUid});
        return res.code === 200;
    }

    async copyProject(id: string): Promise<string> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/copy/${id}`);
        return res.code === 200 ? res.data : '';
    }

    async deleteProject(id: string): Promise<boolean> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/del/${id}`);
        return res.code === 200;
    }

    async getProjectData(id: string): Promise<ProjectDataType | null> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/getProjectData/${id}`);
        if (res.code === 200)
            return JSON.parse(res.data);
        else {
            globalMessage.messageApi?.error(res.msg);
            return null;
        }
    }

    /**
     * 获取项目信息（包含项目数据）
     * @param id 项目id
     * @param type 项目类型：大屏=dashboard，自主助手=react，工作流助手=workflow（默认大屏）
     */
    async getProjectInfo(id: string, type: 'dashboard' | 'react' | 'workflow' = 'dashboard'): Promise<IProject | null> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/getProjectInfo/${type}/${id}`);
        const {code, data} = res;
        if (code === 200)
            return data;
        else {
            globalMessage.messageApi?.error(res.msg);
            return null;
        }
    }

    /**
     * 获取项目分页列表
     */
    public async getProjectInfoPageList(pageParam: IPageParam): Promise<IPage<IProjectInfo>> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/pageList', pageParam);
        if (res.code === 200) 
            return res.data;
        else {
            globalMessage.messageApi?.error(res.msg);
            return {records: [], total: 0, current: 1, size: 10};
        }
    }

    public async updateProject(data: IProjectInfo): Promise<boolean> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/update', data);
        if (res.code !== 200) {
            globalMessage.messageApi?.error(res.msg);
            return false;
        }
        return true;
    }

    public async uploadImage(file: File): Promise<IImageData | boolean> {
        const {id} = URLUtil.parseUrlParams();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', id);
        formData.append('type', "1");
        formData.append('spaceId', localStorage.getItem('spaceId') ?? '');

        const res = await FetchUtil.post('/dashboard/api/v1/image/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}});
        return res.code === 200 ? {url: res.data} : false;
    }

    async getImageSourceList(): Promise<IImageData[]> {
        const res = await FetchUtil.post(`/dashboard/api/v1/image/pageList`, {
            current: 1,
            size: 1000
        });
        if (res.code === 200)
            return res.data.records;
        else {
            globalMessage.messageApi?.error(res.msg);
            return [];
        }
    }

    public async delImageSource(imageId: string): Promise<boolean> {
        const res = await FetchUtil.post(`/dashboard/api/v1/image/batchDelete`, [imageId]);
        if (res.code === 200) {
            globalMessage.messageApi?.success("操作成功");
            return true;
        } else {
            globalMessage.messageApi?.error(res.msg);
            return false;
        }
    }

    public async uploadCover(file: File): Promise<boolean> {
        const {id} = URLUtil.parseUrlParams();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', id);

        const res = await FetchUtil.post('/dashboard/api/v1/project/cover', formData, {headers: {'Content-Type': 'multipart/form-data'}});
        return res.code === 200;
    }

    public async exportProjectApi(projectDependency: any) {
        return await FetchUtil.post('/dashboard/api/v1/project/exportProject', projectDependency);
    }

    /**
     * 分享大屏项目
     * @param projectId 项目id
     * @param spaceId 空间id
     * @param sharePasswordFlag 是否设置密码
     * @param passwordExpirationDays 过期天数（1/7/30）
     * @param passwordExpirationDate 自定义过期时间，格式 "2026-03-27 00:00:00"
     */
    public async shareProject(
        projectId: number,
        spaceId: number,
        sharePasswordFlag: boolean,
        expirationDays?: number,
        expirationDate?: string
    ): Promise<{shareUrl: string; sharePassword?: string | null} | null> {
        const body: Record<string, unknown> = {projectId, spaceId, type: 'dashboard', sharePasswordFlag};
        if (expirationDays !== undefined) body.expirationDays = expirationDays;
        if (expirationDate !== undefined) body.expirationDate = expirationDate;
        const res = await FetchUtil.post('/dashboard/api/v1/project/share', body);
        if (res.code === 200) {
            return {
                shareUrl: res.data?.shareUrl ?? '',
                sharePassword: res.data?.sharePassword ?? null,
            };
        } else {
            globalMessage.messageApi?.error(res.msg);
            return null;
        }
    }

    /**
     * 分享记录分页查询（统一分享接口，type 区分：react=自主助手 / workflow=工作流助手 / dashboard=数据大屏）
     * @returns {records, total} 分页数据（兼容 records/rows/list 结构）
     */
    public async getShareProjectList(params: {type: 'react' | 'workflow' | 'dashboard'; spaceId?: number; current: number; size: number}): Promise<{records: any[]; total: number}> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/share/list', params);
        if (res.code === 200) {
            const page = res.data ?? {};
            const rows = Array.isArray(page) ? page : (page.records ?? page.rows ?? page.list ?? []);
            return {records: Array.isArray(rows) ? rows : [], total: Number(page.total ?? (Array.isArray(rows) ? rows.length : 0)) || 0};
        }
        globalMessage.messageApi?.error(res.msg);
        return {records: [], total: 0};
    }

    /**
     * 同步分享记录的应用状态（PUT /project/share/status，shareCodes 重复 query key + appStatus）。
     * appStatus: 0-已删除 1-启用中 2-已离线(历史版本) 3-编辑中
     */
    public async updateShareStatus(shareCodes: string[], appStatus: number | string): Promise<void> {
        const qs = [
            ...shareCodes.map(c => `shareCodes=${encodeURIComponent(c)}`),
            `appStatus=${encodeURIComponent(String(appStatus))}`,
        ].join('&');
        await FetchUtil.put(`/dashboard/api/v1/project/share/status?${qs}`);
    }

    /**
     * 大屏 status 变更后同步到分享记录：查本项目分享记录 → 一次 PUT 同步 appStatus。
     * fire-and-forget，失败仅 console。大屏 status→appStatus：'0'(当前启用)→1、'1'(编辑中)→3、'2'(历史版本)→2、删除→0。
     */
    public async syncShareAppStatus(projectId: number | string, appStatus: number | string): Promise<void> {
        try {
            const spaceId = localStorage.getItem('spaceId');
            const { records } = await this.getShareProjectList({ type: 'dashboard', spaceId: spaceId ? Number(spaceId) : undefined, current: 1, size: 999 });
            const codes = [...new Set(
                records.filter((r: any) => String(r?.projectId) === String(projectId)).map((r: any) => r?.shareCode).filter(Boolean),
            )] as string[];
            if (!codes.length) return;
            await this.updateShareStatus(codes, appStatus);
        } catch (e) {
            console.error('同步分享记录应用状态失败', e);
        }
    }

    /**
     * 分享详情单查（列表接口不含密码字段，密码在复制时按 shareCode 单独查询，助手与大屏统一）
     * @param shareCode 分享码
     * @returns 密码字符串（无密码返回空串）；null 表示查询失败
     */
    public async getSharePassword(shareCode: string): Promise<string | null> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/share/${shareCode}`);
        if (res.code !== 200) return null;
        const detail = res.data ?? {};
        return detail.sharePassword || '';
    }

    /**
     * 校验分享密码 / 获取分享信息
     * @param shareCode 分享码
     * @param sharePassword 分享密码（无密码时传空字符串）
     * @returns { passwordFlag: 是否需要密码, result: 密码校验结果 }
     */
    public async checkSharePassword(shareCode: string, sharePassword: string): Promise<{passwordFlag: boolean; result: boolean; projectId?: string | number} | null> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/checkSharePassword', {
            shareCode,
            sharePassword
        }, {headers: {'X-Skip-Auth': 'true'}});
        if (res.code === 200) {
            return {
                passwordFlag: res.data?.passwordFlag ?? false,
                result: res.data?.result ?? false,
                projectId: res.data?.projectId,
            };
        }
        return null;
    }

}

const baseApi = new BaseApi();
export default baseApi;