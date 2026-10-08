import Editor, {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorSimpleWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JSONWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

import Loading from '../loading/Loading';

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') return new JSONWorker();
        if (label === 'typescript' || label === 'javascript') return new TypeScriptWorker();
        return new EditorSimpleWorker();
    },
};

loader.config({monaco: monaco as any});

export interface MonacoRuntimeEditorProps {
    defaultValue?: string;
    language?: 'javascript' | 'json' | 'sql';
    onChange?: (value?: string) => void;
    quickSuggestions?: boolean;
    readonly?: boolean;
    value?: string;
}

export default function MonacoRuntimeEditor(props: MonacoRuntimeEditorProps) {
    const {defaultValue, language, onChange, quickSuggestions, readonly, value} = props;

    return (
        <Editor
            defaultLanguage={language || 'json'}
            theme="light"
            onChange={onChange}
            height="100%"
            width="100%"
            options={{
                minimap: {enabled: false},
                quickSuggestions: !!quickSuggestions,
                folding: false,
                readOnly: readonly || false,
                renderValidationDecorations: 'off',
                mouseWheelZoom: true,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'none',
                hideCursorInOverviewRuler: true,
                overviewRulerLanes: 0,
                overviewRulerBorder: false,
            }}
            loading={<Loading/>}
            value={value}
            defaultValue={defaultValue}
        />
    );
}
