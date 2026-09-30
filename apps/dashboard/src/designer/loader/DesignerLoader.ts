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

import { AbstractDefinition } from '../../framework/core/AbstractDefinition'
import AbstractConvert from '../../framework/convert/AbstractConvert'
import { DesignerMode, ProjectDataType, SaveType } from '../DesignerType.ts'
import { globalMessage } from '../../framework/message/GlobalMessage.tsx'
import { action, makeObservable, observable } from 'mobx'
import { runProjectLoadFlow } from './projectLoadFlow.ts'
import { getRuntimeConvertNames, getRuntimeDefinitionNames } from './componentModuleSelection.ts'

type ComponentModule = Record<string, any>
type ComponentModuleLoader = () => Promise<ComponentModule>

const runtimeDefinitionLoaders = import.meta.glob('../../comps/**/*Definition.ts') as Record<string, ComponentModuleLoader>
const runtimeConvertLoaders = import.meta.glob('../../comps/**/*Convert.ts') as Record<string, ComponentModuleLoader>

function moduleName(path: string, suffix: 'Convert' | 'Definition'): string | null {
  return path.match(new RegExp(`/([^/]+)${suffix}\\.ts$`))?.[1] ?? null
}

async function loadSelectedModules(loaders: Record<string, ComponentModuleLoader>, names: readonly string[], suffix: 'Convert' | 'Definition'): Promise<ComponentModule[]> {
  const requestedNames = new Set(names)
  if (requestedNames.size === 0) return []

  const selected = Object.entries(loaders).filter(([path]) => {
    const name = moduleName(path, suffix)
    return Boolean(name && requestedNames.has(name))
  })
  const selectedNames = new Set(selected.map(([path]) => moduleName(path, suffix)))
  const missing = [...requestedNames].filter((name) => !selectedNames.has(name))
  if (missing.length > 0) {
    throw new Error(`缺少组件运行时定义: ${missing.join(', ')}`)
  }
  return Promise.all(selected.map(([, load]) => load()))
}

export class DesignerLoader {
  constructor(mode: DesignerMode) {
    this.mode = mode
    makeObservable(this, {
      loaded: observable,
      setLoaded: action,
    })
  }

  //设计器是否已加载完成
  public loaded: boolean = false
  //设计器所处模式：编辑、预览、发布
  public mode: DesignerMode = DesignerMode.EDIT
  //自定义组件信息映射
  public static definitionMap: Record<string, AbstractDefinition> = {}
  //数据转换器
  public convertMap: { [key: string]: AbstractConvert } = {}
  private loadGeneration = 0

  public setLoaded = (loaded: boolean) => (this.loaded = loaded)

  public cancelLoad = () => {
    this.loadGeneration += 1
    this.setLoaded(false)
  }

  protected getProjectData(id: string, type: SaveType): Promise<ProjectDataType | null> {
    throw new Error(`Method not implemented. ${id} - ${type}`)
  }

  protected getProjectDataAfter(id: string, type: SaveType, data: ProjectDataType): void {
    throw new Error(`Method not implemented. ${id} - ${type} - ${data}`)
  }

  protected registerDefinitionCategories(definition: AbstractDefinition): void {
    void definition
    // View/share loaders do not initialize component-panel metadata.
  }

  /**
   * 加载设计器
   */
  public async load(id: string, type: SaveType): Promise<boolean> {
    const generation = ++this.loadGeneration
    return runProjectLoadFlow({
      isCurrent: () => generation === this.loadGeneration,
      load: async () => {
        const data = await this.getProjectData(id, type)
        if (data) await this.scanComponents(data)
        return data
      },
      onSuccess: async (data) => {
        this.getProjectDataAfter(id, type, data)
        const { registerDashboardFonts } = await import('../resource/font/fontRuntime.ts')
        registerDashboardFonts(data, { includeCatalog: this.mode === DesignerMode.EDIT })
      },
      onLoaded: this.setLoaded,
      onError: (message) => globalMessage?.messageApi?.error(message),
    })
  }

  /**
   * 扫描设计器组件
   */
  protected async scanComponents(data: ProjectDataType): Promise<void> {
    const [definitions, converts] = await Promise.all([
      loadSelectedModules(runtimeDefinitionLoaders, getRuntimeDefinitionNames(data), 'Definition'),
      loadSelectedModules(runtimeConvertLoaders, getRuntimeConvertNames(data), 'Convert'),
    ])
    this.registerComponentModules([...definitions, ...converts])
  }

  protected registerComponentModules(modules: readonly ComponentModule[]): void {
    for (const module of modules) {
      const Clazz = module?.default
      if (Clazz && Object.prototype.isPrototypeOf.call(AbstractDefinition, Clazz)) {
        const definition: AbstractDefinition = new Clazz()
        //获取组件的基础信息
        if (typeof definition.getBaseInfo === 'function') {
          const compKey = definition.getBaseInfo().compKey
          if (compKey) DesignerLoader.definitionMap[compKey] = definition
        }
        this.registerDefinitionCategories(definition)
      } else if (Clazz && Object.prototype.isPrototypeOf.call(AbstractConvert, Clazz)) {
        const convert: AbstractConvert = new Clazz()
        const convertKey = convert.getKey()
        this.convertMap[convertKey] = convert
      }
    }
  }
}
