/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../base/browser/dom.js';
import { structuralEquals } from '../../../../base/common/equals.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, derivedObservableWithCache, derivedOpts, derivedWithStore, } from '../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
/**
 * Use the editor option to set the placeholder text.
 */
export class PlaceholderTextContribution extends Disposable {
    static get(editor) {
        return editor.getContribution(PlaceholderTextContribution.ID);
    }
    static { this.ID = 'editor.contrib.placeholderText'; }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._editorObs = observableCodeEditor(this._editor);
        this._placeholderText = this._editorObs.getOption(92 /* EditorOption.placeholder */);
        this._state = derivedOpts({ owner: this, equalsFn: structuralEquals }, (reader) => {
            const p = this._placeholderText.read(reader);
            if (!p) {
                return undefined;
            }
            if (!this._editorObs.valueIsEmpty.read(reader)) {
                return undefined;
            }
            return { placeholder: p };
        });
        this._shouldViewBeAlive = isOrWasTrue(this, (reader) => this._state.read(reader)?.placeholder !== undefined);
        this._view = derivedWithStore((reader, store) => {
            if (!this._shouldViewBeAlive.read(reader)) {
                return;
            }
            const element = h('div.editorPlaceholder');
            store.add(autorun((reader) => {
                const data = this._state.read(reader);
                const shouldBeVisibile = data?.placeholder !== undefined;
                element.root.style.display = shouldBeVisibile ? 'block' : 'none';
                element.root.innerText = data?.placeholder ?? '';
            }));
            store.add(autorun((reader) => {
                const info = this._editorObs.layoutInfo.read(reader);
                element.root.style.left = `${info.contentLeft}px`;
                element.root.style.width = info.contentWidth - info.verticalScrollbarWidth + 'px';
                element.root.style.top = `${this._editor.getTopForLineNumber(0)}px`;
            }));
            store.add(autorun((reader) => {
                element.root.style.fontFamily = this._editorObs
                    .getOption(51 /* EditorOption.fontFamily */)
                    .read(reader);
                element.root.style.fontSize =
                    this._editorObs.getOption(54 /* EditorOption.fontSize */).read(reader) + 'px';
                element.root.style.lineHeight =
                    this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader) + 'px';
            }));
            store.add(this._editorObs.createOverlayWidget({
                allowEditorOverflow: false,
                minContentWidthInPx: constObservable(0),
                position: constObservable(null),
                domNode: element.root,
            }));
        });
        this._view.recomputeInitiallyAndOnChange(this._store);
    }
}
function isOrWasTrue(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => {
        if (lastValue === true) {
            return true;
        }
        return fn(reader);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGxhY2Vob2xkZXJUZXh0L2Jyb3dzZXIvcGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBRWYsMEJBQTBCLEVBQzFCLFdBQVcsRUFDWCxnQkFBZ0IsR0FHaEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUkvRTs7R0FFRztBQUNILE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO0lBQ25ELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUE4QiwyQkFBMkIsQ0FBQyxFQUFFLENBQUUsQ0FBQTtJQUM1RixDQUFDO2FBRXNCLE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBbUM7SUFvRTVELFlBQTZCLE9BQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFuRWhDLGVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFL0MscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLG1DQUEwQixDQUFBO1FBRXRFLFdBQU0sR0FBRyxXQUFXLENBQ3BDLEVBQUUsS0FBSyxFQUFF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