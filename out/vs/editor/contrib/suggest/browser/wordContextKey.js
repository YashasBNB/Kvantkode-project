/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WordContextKey_1;
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../nls.js';
let WordContextKey = class WordContextKey {
    static { WordContextKey_1 = this; }
    static { this.AtEnd = new RawContextKey('atEndOfWord', false, {
        type: 'boolean',
        description: localize('desc', 'A context key that is true when at the end of a word. Note that this is only defined when tab-completions are enabled'),
    }); }
    constructor(_editor, contextKeyService) {
        this._editor = _editor;
        this._enabled = false;
        this._ckAtEnd = WordContextKey_1.AtEnd.bindTo(contextKeyService);
        this._configListener = this._editor.onDidChangeConfiguration((e) => e.hasChanged(128 /* EditorOption.tabCompletion */) && this._update());
        this._update();
    }
    dispose() {
        this._configListener.dispose();
        this._selectionListener?.dispose();
        this._ckAtEnd.reset();
    }
    _update() {
        // only update this when tab completions are enabled
        const enabled = this._editor.getOption(128 /* EditorOption.tabCompletion */) === 'on';
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        if (this._enabled) {
            const checkForWordEnd = () => {
                if (!this._editor.hasModel()) {
                    this._ckAtEnd.set(false);
                    return;
                }
                const model = this._editor.getModel();
                const selection = this._editor.getSelection();
                const word = model.getWordAtPosition(selection.getStartPosition());
                if (!word) {
                    this._ckAtEnd.set(false);
                    return;
                }
                this._ckAtEnd.set(word.endColumn === selection.getStartPosition().column &&
                    selection.getStartPosition().lineNumber === selection.getEndPosition().lineNumber);
            };
            this._selectionListener = this._editor.onDidChangeCursorSelection(checkForWordEnd);
            checkForWordEnd();
        }
        else if (this._selectionListener) {
            this._ckAtEnd.reset();
            this._selectionListener.dispose();
            this._selectionListener = undefined;
        }
    }
};
WordContextKey = WordContextKey_1 = __decorate([
    __param(1, IContextKeyService)
], WordContextKey);
export { WordContextKey };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZENvbnRleHRLZXkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci93b3JkQ29udGV4dEtleS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFdEMsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYzs7YUFDVixVQUFLLEdBQUcsSUFBSSxhQUFhLENBQVUsYUFBYSxFQUFFLEtBQUssRUFBRTtRQUN4RSxJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLE1BQU0sRUFDTix1SEFBdUgsQ0FDdkg7S0FDRCxDQUFDLEFBTm1CLENBTW5CO0lBUUYsWUFDa0IsT0FBb0IsRUFDakIsaUJBQXFDO1FBRHhDLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFKOUIsYUFBUSxHQUFZLEtBQUssQ0FBQTtRQU9oQyxJQUFJLENBQUMsUUFBUSxHQUFHLGdCQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FDM0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLHNDQUE0QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FDakUsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNmLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM5QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRU8sT0FBTztRQUNkLG9EQUFvRDtRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsc0NBQTRCLEtBQUssSUFBSSxDQUFBO1FBQzNFLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMvQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBRXZCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3hCLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO2dCQUM3QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtnQkFDbEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUN4QixPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ2hCLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsTUFBTTtvQkFDckQsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQ2xGLENBQUE7WUFDRixDQUFDLENBQUE7WUFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNsRixlQUFlLEVBQUUsQ0FBQTtRQUNsQixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNqQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDOztBQWpFVyxjQUFjO0lBaUJ4QixXQUFBLGtCQUFrQixDQUFBO0dBakJSLGNBQWMsQ0FrRTFCIn0=