import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { Decoration, EditorView, MatchDecorator, ViewPlugin, WidgetType } from '@codemirror/view';

interface CommonPlaceholderTheme {
  backgroudColor: string;
  borderColor: string;
  textColor: string;
}

interface PlaceholderThemesType {
  [K: string]: CommonPlaceholderTheme;
}

export const placeholdersPlugin = (themes: PlaceholderThemesType, mode: string = 'name', fieldOptions, isExpr) => {
  class PlaceholderWidget extends WidgetType {
    curFlag: string;
    text: string;

    constructor(text: string) {
      super();
      if (text) {
        const cur = fieldOptions.find((item: any) => item.tfieldId === text || item.techId === text);
        // const texts = text.split('.');
        // if (texts.length) {
        // this.text = texts.map(t => t.split(':')[mode === 'code' ? 1 : 0]).join('.');
        if (cur) {
          this.text = cur.tfieldShowName || cur.fieldName;
          this.curFlag = cur.tfieldType;
        } else {
          this.text = text;
          this.curFlag = 'q';
        }
        // }
      }
    }

    eq(other: PlaceholderWidget) {
      return this.text == other.text;
    }

    toDOM() {
      const elt = document.createElement('span');
      if (!this.text) return elt;

      const curTheme = themes[this.curFlag];
      if (curTheme) {
        const { backgroudColor, borderColor, textColor } = curTheme;
        elt.style.cssText = `
        border-radius: 4px;
        line-height: 20px;
        background: ${backgroudColor};
        color: ${textColor};
        font-size: 12px;
        padding: 2px 7px;
        user-select: none;
        `;
      }

      elt.textContent = this.text;
      return elt;
    }
    ignoreEvent() {
      return true;
    }
  }

  const placeholderMatcher = new MatchDecorator({
    decoration: match => {
      return Decoration.replace({
        widget: new PlaceholderWidget(match[1])
      });
    },
    regexp: isExpr ? /##(.+?)##/g : /\[(.+?)\]/g
  });

  return ViewPlugin.fromClass(
    class {
      placeholders: DecorationSet;
      constructor(view: EditorView) {
        this.placeholders = placeholderMatcher.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.placeholders = placeholderMatcher.updateDeco(update, this.placeholders);
      }
    },
    {
      decorations: (instance: any) => {
        return instance.placeholders;
      },
      provide: (plugin: any) =>
        EditorView.atomicRanges.of((view: any) => {
          return view.plugin(plugin)?.placeholders || Decoration.none;
        })
    }
  );
};
