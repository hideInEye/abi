export interface CompletionsType {
  detail: string;
  label: string;
  template: string;
  type: string;
}

export interface PlaceholderThemesType {
  [K: string]: CommonPlaceholderTheme;
}

export interface FunctionType extends CompletionsType {
  handle: any;
}

export interface CommonPlaceholderTheme {
  backgroudColor: string;
  borderColor: string;
  textColor: string;
}

export interface ScriptEditorRef {
  clearText?: () => void;
  insertText?: (text: string, isTemplate: boolean) => void;
  setText?: (text: string) => void;
}

export interface HintPathType {
  children?: HintPathType[];
  detail: string;
  label: string;
  template: string;
  type: 'function' | 'keyword' | 'property' | 'text' | 'variable';
}
