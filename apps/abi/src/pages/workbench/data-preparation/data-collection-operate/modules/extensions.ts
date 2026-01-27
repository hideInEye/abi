// import { autocompletion } from '@codemirror/autocomplete';
// import { EditorView } from '@codemirror/view';

import { placeholdersPlugin } from '../placeholders.ts';

import type { CompletionsType, FunctionType, HintPathType, PlaceholderThemesType } from './interface.ts';
// import { baseTheme } from './plugin/base-theme';
// import { customCompletions } from './plugin/custom-completions';
// import { functionPlugin } from './plugin/functions';
// import { hintPlugin } from './plugin/hint';
// import { keywordsPlugin } from './plugin/keywords';

export const extensions = ({
  // completions,
  // functions,
  // hintPaths,
  // keywords,
  // keywordsClassName,
  // keywordsColor,
  fieldOptions,
  isExpr = false,
  mode,
  placeholderThemes
}: {
  completions: CompletionsType[];
  fieldOptions: any;
  functions: FunctionType[];
  hintPaths?: HintPathType[];
  isExpr?: boolean;
  keywords?: string[];
  keywordsClassName?: string;
  keywordsColor?: string;
  mode: string;
  placeholderThemes: PlaceholderThemesType;
}): any[] => {
  return [
    // keywords.length ? keywordsPlugin(keywords, keywordsColor, keywordsClassName) : null,
    // baseTheme,
    placeholdersPlugin(placeholderThemes, mode, fieldOptions, isExpr)
    // EditorView.lineWrapping,
    // autocompletion({
    //   override: [customCompletions(completions), hintPaths?.length ? hintPlugin(hintPaths) : null].filter(o =>
    //     Boolean(o)
    //   )
    // }),
    // functionPlugin(functions)
  ].filter(o => Boolean(o));
};
