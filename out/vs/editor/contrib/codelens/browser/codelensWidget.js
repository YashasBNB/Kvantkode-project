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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlbGVucy9icm93c2VyL2NvZGVsZW5zV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFMUYsT0FBTyxzQkFBc0IsQ0FBQTtBQVM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFNckQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFJM0UsTUFBTSxnQkFBZ0I7SUFlckIsWUFBWSxlQUF1QixFQUFFLFVBQWtCLEVBQUUsUUFBb0I7UUFWN0U7OztXQUdHO1FBQ00sZ0JBQVcscURBQW1DO1FBT3RELElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBRTVCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUE7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxNQUFjO1FBQzlCLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQTtRQUMxQixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUE7SUFDdkYsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBcUI7YUFDWCxZQUFPLEdBQVcsQ0FBQyxBQUFaLENBQVk7SUFjbEMsWUFBWSxNQUF5QixFQUFFLElBQVk7UUFabkQsNENBQTRDO1FBQ25DLHdCQUFtQixHQUFZLEtBQUssQ0FBQTtRQUNwQyxzQkFBaUIsR0FBWSxJQUFJLENBQUE7UUFLekIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFBO1FBRy9DLGFBQVEsR0FBWSxJQUFJLENBQUE7UUFHL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxtQkFBbUIscUJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQTtRQUUvRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXpCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQTBDLEVBQUUsT0FBZ0I7UUFDeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUV0QixNQUFNLFFBQVEsR0FBa0IsRUFBRSxDQUFBO1FBQ2xDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsU0FBUTtZQUNULENBQUM7WUFDRCxTQUFTLEdBQUcsSUFBSSxDQUFBO1lBQ2hCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxHQUFHLElBQUkscUJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQTtvQkFDaEQsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQTtvQkFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3hFLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQTtnQkFDekQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLDBCQUEwQjtZQUMxQixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQzthQUFNLENBQUM7WUFDUCx1QkFBdUI7WUFDdkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUE7WUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdEMsQ0FBQztZQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLElBQXFCO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUN0RixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsY0FBYyxDQUFDLElBQVk7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsZUFBZSxHQUFHO1lBQ3RCLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUM5QyxVQUFVLEVBQUUsK0NBQXVDO1NBQ25ELENBQUE7SUFDRixDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU8sSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUE7SUFDcEMsQ0FBQzs7QUFPRixNQUFNLE9BQU8sY0FBYztJQUsxQjtRQUNDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLHdCQUF3QixHQUFHLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQWlDLEVBQUUsUUFBK0I7UUFDL0UsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsWUFBb0I7UUFDcEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsTUFBTSxDQUFDLGNBQStDO1FBQ3JELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUMzRCxJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLElBQUksQ0FBQyxlQUFlLENBQ3BCLENBQUE7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSx5QkFBeUIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7SUFDakUscUJBQXFCLEVBQUUsSUFBSTtJQUMzQixXQUFXLEVBQUUsVUFBVTtDQUN2QixDQUFDLENBQUE7QUFFRixNQUFNLE9BQU8sY0FBYztJQVUxQixZQUNDLElBQW9CLEVBQ3BCLE1BQXlCLEVBQ3pCLE1BQXNCLEVBQ3RCLHNCQUErQyxFQUMvQyxVQUFrQixFQUNsQixjQUEwQjtRQVJuQixnQkFBVyxHQUFZLEtBQUssQ0FBQTtRQVVuQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUVqQiw0REFBNEQ7UUFDNUQsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLElBQUksS0FBd0IsQ0FBQTtRQUM1QixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUE7UUFFN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxDQUFDLGFBQWEsQ0FDbkI7Z0JBQ0MsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDaEMsT0FBTyxFQUFFLHlCQUF5QjthQUNsQyxFQUNELENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQ3JDLENBQUE7WUFFRCw2Q0FBNkM7WUFDN0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzFELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFNLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDN0YsSUFBSSxDQUFDLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpFLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQTtZQUN0QyxJQUFJLENBQUMsY0FBZSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFTywrQkFBK0I7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUkscUJBQXFCLENBQzlDLElBQUksQ0FBQyxPQUFPLEVBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUNsQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbkQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxNQUFzQixFQUFFLHNCQUFnRDtRQUMvRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7UUFDeEIsc0JBQXNCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNwRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUNyRCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7SUFDeEIsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDNUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFDbkMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQscUJBQXFCLENBQUMsSUFBb0IsRUFBRSxNQUFzQjtRQUNqRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLGFBQWEsQ0FDbkI7Z0JBQ0MsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDaEMsT0FBTyxFQUFFLHlCQUF5QjthQUNsQyxFQUNELENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQ3JDLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYyxFQUFFLHNCQUErQztRQUMzRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUE7UUFDbEMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNuRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLEtBQWlCO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBMkM7UUFDekQsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLGNBQWUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNoQyxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQTtZQUNwRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBcUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsYUFBYTtRQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUE7UUFDN0IsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDVixDQUFDO0lBRUQsTUFBTSxDQUFDLHNCQUErQztRQUNyRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hGLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7Z0JBQzFELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBRW5ELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixDQUFDO0NBQ0QifQ==