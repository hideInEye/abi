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

import {SyntheticEvent, useRef} from 'react';
import Dialog from "../../../../json-schema/ui/dialog/Dialog";
import './ProjectHdItemImpl.less';
import {IProjectInfo, SaveType} from "../../../DesignerType";
import {Grid} from "../../../../json-schema/ui/grid/Grid";
import Input from "../../../../json-schema/ui/input/Input";
import Radio from "../../../../json-schema/ui/radio/Radio";
import Select from "../../../../json-schema/ui/select/Select";
import Button from "../../../../json-schema/ui/button/Button";
import projectHdStore from "./ProjectManager.ts";
import projectManager from "./ProjectManager.ts";
import baseApi from "../../../../api/BaseApi.ts";
import URLUtil from "../../../../utils/URLUtil.ts";


const ProjectHdItemImpl = () => {
    const configRef = useRef<IProjectInfo | null>({...projectManager.projectConfig});
    const {projectVisible, setProjectVisible} = projectHdStore;
    const {name, des, status, saveType} = configRef.current!;

    const onClose = () => setProjectVisible(false);

    const doSave = (e: SyntheticEvent) => {
        e.preventDefault();
        const {updateProjectConfig} = projectManager;
        updateProjectConfig(configRef.current!);
        // 项目状态持久化到后端（弹窗改 status，与列表/发布/保存统一读后端 status；并同步分享记录 appStatus）
        const {id} = URLUtil.parseUrlParams();
        const nextStatus = configRef.current!.status;
        if (id != null && nextStatus != null) {
            baseApi.updateProject({id, status: nextStatus}).then(ok => {
                if (ok) baseApi.syncShareAppStatus(id, nextStatus === '0' ? 1 : nextStatus === '2' ? 2 : 3);
            });
        }
        onClose();
    }

    return (
        <Dialog title={'项目设置'} className={'lc-header-project-set'} visible={projectVisible}
                onClose={onClose}>
            <form onSubmit={doSave}>
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    <Grid gridGap={'15px'} columns={2}>
                        <Input label={'项目名称'} defaultValue={name}
                               onChange={(name) => configRef.current!.name = name}/>
                        <Input label={'项目描述'} defaultValue={des}
                               onChange={(des) => configRef.current!.des = des}/>
                        <Radio label={'项目状态'} onChange={value => configRef.current!.status = value as string}
                               containerStyle={{gridColumn: '1/3'}}
                               defaultValue={status}
                               options={[
                                   {label: '编辑中', value: '1'},
                                   {label: '当前启用', value: '0'},
                                   {label: '历史版本', value: '2'}
                               ]}/>
                        <Select label={'存储类型'} options={[{value: SaveType.LOCAL, label: '本地存储'}]}
                                defaultValue={saveType}/>
                    </Grid>

                </div>
                <div className={'lc-header-project-footer'}>
                    <Button onClick={doSave}>保存</Button>
                    <Button onClick={onClose} type={'default'}>取消</Button>
                </div>
            </form>
        </Dialog>
    );
}

export default ProjectHdItemImpl;