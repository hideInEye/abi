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
        return res.code === 200 ? res.data : '';
    }

    /**
     * 创建会话应用（chat-proxy）
     * @param data 应用配置数据
     */
    async createChatApp(data: Record<string, any>): Promise<{success: boolean; data?: any}> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/app/add', data);
        return {success: res.code === 200, data: res.data};
    }

    /**
     * 验证对话应用名称是否可用（chat-proxy）
     * 接口返回 true 表示名称可用，false 表示已存在
     */
    async validateChatAppName(bizName: string, spaceId: number): Promise<boolean> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/app/validate_name', {biz_name: bizName, space_id: spaceId});
        return res.code === 200 ? !!res.data : false;
    }

    /**
     * 获取助手列表
     * @param spaceId 空间id
     */
    async fetchAgentList(spaceId: number): Promise<any[]> {
        const res = await FetchUtil.get(`/copilot/v1/agentConfig/list?pageNum=1&pageSize=20&spaceId=${spaceId}`);
        return res.code === 200 ? ((res as any).rows || []) : [];
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
     * 创建会话（chat-proxy）
     * @param data 会话配置数据，需包含 chat_id 等
     */

    async createChatConv(data: Record<string, any>): Promise<{success: boolean; data?: any}> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/conv/new', data);
        return {success: res.code === 200, data: res.data};
    }

    /**
     * 查询会话列表（chat-proxy）
     * @param data 查询条件，需包含 chat_id、chat_mode、space_id
     */
    async fetchChatConvList(data: Record<string, any>): Promise<any[]> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/conv/list', data);
        return res.data?.data || [];
    }

    /**
     * 获取提示词列表（chat-proxy）
     * 用于创建对话时传入 chat_config
     */
    async fetchRecommendQuestions(): Promise<any[]> {
        const res = await FetchUtil.post('/chat-proxy/prompt/list?map_required=true', {});
        const list = res.data?.data ?? res.data;
        return Array.isArray(list) ? list : [];
    }

    /**
     * 删除会话（chat-proxy）
     * @param convUid 会话uid
     */
    async deleteChatConv(convUid: string): Promise<boolean> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/conv/delete', {conv_uid: convUid});
        return res.code === 200;
    }

    /**
     * 清空会话消息（chat-proxy）
     * @param convUid 会话uid
     * @param chartId 当前图表id
     * @param chatMode 聊天模式，默认 chat_with_dashboard
     */
    async clearChatConv(convUid: string, chartId = '', chatMode = 'chat_with_dashboard'): Promise<boolean> {
        const res = await FetchUtil.post('/chat-proxy/api/v1/chat/conv/clear', {
            conv_uid: convUid,
            chart_id: chartId,
            chat_mode: chatMode,
        });
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
     * @param id
     */
    async getProjectInfo(id: string): Promise<IProject | null> {
        const res = await FetchUtil.get(`/dashboard/api/v1/project/getProjectInfo/${id}`);
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

    public async updateProject(data: IProjectInfo): Promise<void> {
        const res = await FetchUtil.post('/dashboard/api/v1/project/update', data);
        if (res.code !== 200)
            globalMessage.messageApi?.error(res.msg);
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
        const body: Record<string, unknown> = {projectId, spaceId, sharePasswordFlag};
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