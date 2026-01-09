/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import './codelensWidget.css';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
class CodeLensViewZone {
    constructor(afterLineNumber, heightInPx, onHeight) {
        /**
         * We want that this view zone, which reserves space for a code lens appears
         * as close as possible to the next line, so we use a very large value here.
         */
        this.afterColumn = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.afterLineNumber = afterLineNumber;
        this.heightInPx = heightInPx;
        this._onHeight = onHeight;
        this.suppressMouseDown = true;
        this.domNode = document.createElement('div');
    }
    onComputedHeight(height) {
        if (this._lastHeight === undefined) {
            this._lastHeight = height;
        }
        else if (this._lastHeight !== height) {
            this._lastHeight = height;
            this._onHeight();
        }
    }
    isVisible() {
        return this._lastHeight !== 0 && this.domNode.hasAttribute('monaco-visible-view-zone');
    }
}
class CodeLensContentWidget {
    static { this._idPool = 0; }
    constructor(editor, line) {
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this._commands = new Map();
        this._isEmpty = true;
        this._editor = editor;
        this._id = `codelens.widget-${CodeLensContentWidget._idPool++}`;
        this.updatePosition(line);
        this._domNode = document.createElement('span');
        this._domNode.className = `codelens-decoration`;
    }
    withCommands(lenses, animate) {
        this._commands.clear();
        const children = [];
        let hasSymbol = false;
        for (let i = 0; i < lenses.length; i++) {
            const lens = lenses[i];
            if (!lens) {
                continue;
            }
            hasSymbol = true;
            if (lens.command) {
                const title = renderLabelWithIcons(lens.command.title.trim());
                if (lens.command.id) {
                    const id = `c${CodeLensContentWidget._idPool++}`;
                    children.push(dom.$('a', { id, title: lens.command.tooltip, role: 'button' }, ...title));
                    this._commands.set(id, lens.command);
                }
                else {
                    children.push(dom.$('span', { title: lens.command.tooltip }, ...title));
                }
                if (i + 1 < lenses.length) {
                    children.push(dom.$('span', undefined, '\u00a0|\u00a0'));
                }
            }
        }
        if (!hasSymbol) {
            // symbols but no commands
            dom.reset(this._domNode, dom.$('span', undefined, 'no commands'));
        }
        else {
            // symbols and commands
            dom.reset(this._domNode, ...children);
            if (this._isEmpty && animate) {
                this._domNode.classList.add('fadein');
            }
            this._isEmpty = false;
        }
    }
    getCommand(link) {
        return link.parentElement === this._domNode ? this._commands.get(link.id) : undefined;
    }
    getId() {
        return this._id;
    }
    getDomNode() {
        return this._domNode;
    }
    updatePosition(line) {
        const column = this._editor.getModel().getLineFirstNonWhitespaceColumn(line);
        this._widgetPosition = {
            position: { lineNumber: line, column: column },
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
    getPosition() {
        return this._widgetPosition || null;
    }
}
export class CodeLensHelper {
    constructor() {
        this._removeDecorations = [];
        this._addDecorations = [];
        this._addDecorationsCallbacks = [];
    }
    addDecoration(decoration, callback) {
        this._addDecorations.push(decoration);
        this._addDecorationsCallbacks.push(callback);
    }
    removeDecoration(decorationId) {
        this._removeDecorations.push(decorationId);
    }
    commit(changeAccessor) {
        const resultingDecorations = changeAccessor.deltaDecorations(this._removeDecorations, this._addDecorations);
        for (let i = 0, len = resultingDecorations.length; i < len; i++) {
            this._addDecorationsCallbacks[i](resultingDecorations[i]);
        }
    }
}
const codeLensDecorationOptions = ModelDecorationOptions.register({
    collapseOnReplaceEdit: true,
    description: 'codelens',
});
export class CodeLensWidget {
    constructor(data, editor, helper, viewZoneChangeAccessor, heightInPx, updateCallback) {
        this._isDisposed = false;
        this._editor = editor;
        this._data = data;
        // create combined range, track all ranges with decorations,
        // check if there is already something to render
        this._decorationIds = [];
        let range;
        const lenses = [];
        this._data.forEach((codeLensData, i) => {
            if (codeLensData.symbol.command) {
                lenses.push(codeLensData.symbol);
            }
            helper.addDecoration({
                range: codeLensData.symbol.range,
                options: codeLensDecorationOptions,
            }, (id) => (this._decorationIds[i] = id));
            // the range contains all lenses on this line
            if (!range) {
                range = Range.lift(codeLensData.symbol.range);
            }
            else {
                range = Range.plusRange(range, codeLensData.symbol.range);
            }
        });
        this._viewZone = new CodeLensViewZone(range.startLineNumber - 1, heightInPx, updateCallback);
        this._viewZoneId = viewZoneChangeAccessor.addZone(this._viewZone);
        if (lenses.length > 0) {
            this._createContentWidgetIfNecessary();
            this._contentWidget.withCommands(lenses, false);
        }
    }
    _createContentWidgetIfNecessary() {
        if (!this._contentWidget) {
            this._contentWidget = new CodeLensContentWidget(this._editor, this._viewZone.afterLineNumber + 1);
            this._editor.addContentWidget(this._contentWidget);
        }
        else {
            this._editor.layoutContentWidget(this._contentWidget);
        }
    }
    dispose(helper, viewZoneChangeAccessor) {
        this._decorationIds.forEach(helper.removeDecoration, helper);
        this._decorationIds = [];
        viewZoneChangeAccessor?.removeZone(this._viewZoneId);
        if (this._contentWidget) {
            this._editor.removeContentWidget(this._contentWidget);
            this._contentWidget = undefined;
        }
        this._isDisposed = true;
    }
    isDisposed() {
        return this._isDisposed;
    }
    isValid() {
        return this._decorationIds.some((id, i) => {
            const range = this._editor.getModel().getDecorationRange(id);
            const symbol = this._data[i].symbol;
            return !!(range && Range.isEmpty(symbol.range) === range.isEmpty());
        });
    }
    updateCodeLensSymbols(data, helper) {
        this._decorationIds.forEach(helper.removeDecoration, helper);
        this._decorationIds = [];
        this._data = data;
        this._data.forEach((codeLensData, i) => {
            helper.addDecoration({
                range: codeLensData.symbol.range,
                options: codeLensDecorationOptions,
            }, (id) => (this._decorationIds[i] = id));
        });
    }
    updateHeight(height, viewZoneChangeAccessor) {
        this._viewZone.heightInPx = height;
        viewZoneChangeAccessor.layoutZone(this._viewZoneId);
        if (this._contentWidget) {
            this._editor.layoutContentWidget(this._contentWidget);
        }
    }
    computeIfNecessary(model) {
        if (!this._viewZone.isVisible()) {
            return null;
        }
        // Read editor current state
        for (let i = 0; i < this._decorationIds.length; i++) {
            const range = model.getDecorationRange(this._decorationIds[i]);
            if (range) {
                this._data[i].symbol.range = range;
            }
        }
        return this._data;
    }
    updateCommands(symbols) {
        this._createContentWidgetIfNecessary();
        this._contentWidget.withCommands(symbols, true);
        for (let i = 0; i < this._data.length; i++) {
            const resolved = symbols[i];
            if (resolved) {
                const { symbol } = this._data[i];
                symbol.command = resolved.command || symbol.command;
            }
        }
    }
    getCommand(link) {
        return this._contentWidget?.getCommand(link);
    }
    getLineNumber() {
        const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
        if (range) {
            return range.startLineNumber;
        }
        return -1;
    }
    update(viewZoneChangeAccessor) {
        if (this.isValid()) {
            const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
            if (range) {
                this._viewZone.afterLineNumber = range.startLineNumber - 1;
                viewZoneChangeAccessor.layoutZone(this._viewZoneId);
                if (this._contentWidget) {
                    this._contentWidget.updatePosition(range.startLineNumber);
                    this._editor.layoutContentWidget(this._contentWidget);
                }
            }
        }
    }
    getItems() {
        return this._data;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVsZW5zL2Jyb3dzZXIvY29kZWxlbnNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUUxRixPQUFPLHNCQUFzQixDQUFBO0FBUzdCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQU1yRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUkzRSxNQUFNLGdCQUFnQjtJQWVyQixZQUFZLGVBQXVCLEVBQUUsVUFBa0IsRUFBRSxRQUFvQjtRQVY3RTs7O1dBR0c7UUFDTSxnQkFBVyxxREFBbUM7UUFPdEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFFNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQWM7UUFDOUIsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFBO1FBQzFCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDeEMsSUFBSSxD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