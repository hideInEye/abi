// import { snippet } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
// import { githubLight } from '@uiw/codemirror-theme-github';
import ReactCodeMirror from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import type { ForwardRefRenderFunction } from 'react';

import { extensions } from './extensions';
import type { FunctionType, HintPathType, PlaceholderThemesType, ScriptEditorRef } from './interface.ts';

interface PropsType {
  readonly extensions?: Extension[];
  readonly fieldOptions: any;
  readonly functions: FunctionType[];
  readonly height?: string;
  readonly hintPaths?: HintPathType[];
  readonly isExpr?: boolean;
  readonly keywords?: string[];
  readonly keywordsClassName?: string;
  readonly keywordsColor?: string;
  readonly mode: string;
  readonly onChange?: (value: string) => void;
  readonly placeholderThemes: PlaceholderThemesType;
  readonly value?: string;
  readonly width?: string;
}

const Editor: ForwardRefRenderFunction<ScriptEditorRef, PropsType> = (
  {
    extensions: extensionsProps,
    fieldOptions,
    height,
    isExpr,
    mode,
    onChange,
    placeholderThemes = {
      d: {
        backgroudColor: 'rgba(51, 112, 255, 0.2)',
        textColor: 'rgb(43, 95, 217)'
      },
      dates: {
        backgroudColor: 'rgba(255, 153, 0, 0.2)',
        textColor: 'rgb(255, 102, 0)'
      },
      dimensions: {
        backgroudColor: 'rgba(51, 112, 255, 0.2)',
        textColor: 'rgb(43, 95, 217)'
      },
      measures: {
        backgroudColor: 'rgba(0, 214, 185, 0.2)',
        textColor: 'rgb(4, 180, 156)'
      },
      q: {
        backgroudColor: 'rgba(0, 214, 185, 0.2)',
        textColor: 'rgb(4, 180, 156)'
      }
    },
    value,
    width
  },
  ref
) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const insertText = useCallback((text: string) => {
    const { view } = editorRef.current!;
    if (!view) return;

    const { state } = view;
    if (!state) return;

    const [range] = state?.selection?.ranges || [];

    view.focus();

    // if (isTemplate) {
    //   snippet(text)(
    //     {
    //       dispatch: view.dispatch,
    //       state
    //     },
    //     {
    //       detail: text,
    //       label: text
    //     },
    //     range.from,
    //     range.to
    //   );
    // } else {
    view.dispatch({
      changes: {
        from: range.from,
        insert: text,
        to: range.to
      },
      selection: {
        anchor: range.from + text.length
      }
    });
    // }
  }, []);

  const clearText = useCallback(() => {
    const { view } = editorRef.current;
    view.dispatch({
      changes: {
        from: 0,
        insert: '',
        to: view.state.doc.length
      },
      selection: {
        anchor: 0
      }
    });
    view.focus();
  }, []);

  const setText = useCallback((text: string) => {
    const { view } = editorRef.current;
    view.dispatch({
      changes: {
        from: 0,
        insert: text,
        to: view.state.doc.length
      },
      selection: {
        anchor: text.length
      }
    });
    view.focus();
  }, []);

  useImperativeHandle(ref, () => {
    return {
      clearText,
      insertText,
      originEditorRef: editorRef,
      setText
    };
  }, [insertText, clearText, setText]);

  const extensionsMemo = useMemo(
    () => [
      ...extensions({
        fieldOptions,
        isExpr,
        mode,
        placeholderThemes
      }),
      ...(extensionsProps || [])
    ],
    [fieldOptions, mode, placeholderThemes]
  );

  const onChangeHandle = useCallback(
    (value: string) => {
      onChange && onChange(value);
    },
    [onChange]
  );

  return (
    <ReactCodeMirror
      extensions={extensionsMemo}
      height={height}
      ref={editorRef}
      // theme={githubLight}
      value={value}
      width={width}
      onChange={onChangeHandle}
    />
  );
};

export default forwardRef<ScriptEditorRef, PropsType>(Editor);
