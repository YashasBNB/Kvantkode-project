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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZENvbnRleHRLZXkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvd29yZENvbnRleHRLZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXRDLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7O2FBQ1YsVUFBSyxHQUFHLElBQUksYUFBYSxDQUFVLGFBQWEsRUFBRSxLQUFLLEVBQUU7UUFDeEUsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixNQUFNLEVBQ04sdUhBQXVILENBQ3ZIO0tBQ0QsQ0FBQyxBQU5tQixDQU1uQjtJQVFGLFlBQ2tCLE9BQW9CLEVBQ2pCLGlCQUFxQztRQUR4QyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBSjlCLGFBQVEsR0FBWSxLQUFLLENBQUE7UUFPaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxnQkFBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQzNELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxzQ0FBNEIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQ2pFLENBQUE7UUFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVPLE9BQU87UUFDZCxvREFBb0Q7UUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHNDQUE0QixLQUFLLElBQUksQ0FBQTtRQUMzRSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDL0IsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUV2QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUN4QixPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDckMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtnQkFDN0MsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7Z0JBQ2xFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEIsT0FBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUNoQixJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU07b0JBQ3JELFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUNsRixDQUFBO1lBQ0YsQ0FBQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDbEYsZUFBZSxFQUFFLENBQUE7UUFDbEIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNyQixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDakMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQzs7QUFqRVcsY0FBYztJQWlCeEIsV0FBQSxrQkFBa0IsQ0FBQTtHQWpCUixjQUFjLENBa0UxQiJ9