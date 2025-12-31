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
var InlayHintsAccessibility_1;
import * as dom from '../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction2, registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { asCommandLink, } from '../../../../editor/contrib/inlayHints/browser/inlayHints.js';
import { InlayHintsController } from '../../../../editor/contrib/inlayHints/browser/inlayHintsController.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Link } from '../../../../platform/opener/browser/link.js';
let InlayHintsAccessibility = class InlayHintsAccessibility {
    static { InlayHintsAccessibility_1 = this; }
    static { this.IsReading = new RawContextKey('isReadingLineWithInlayHints', false, {
        type: 'boolean',
        description: localize('isReadingLineWithInlayHints', 'Whether the current line and its inlay hints are currently focused'),
    }); }
    static { this.ID = 'editor.contrib.InlayHintsAccessibility'; }
    static get(editor) {
        return editor.getContribution(InlayHintsAccessibility_1.ID) ?? undefined;
    }
    constructor(_editor, contextKeyService, _accessibilitySignalService, _instaService) {
        this._editor = _editor;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._instaService = _instaService;
        this._sessionDispoosables = new DisposableStore();
        this._ariaElement = document.createElement('span');
        this._ariaElement.style.position = 'fixed';
        this._ariaElement.className = 'inlayhint-accessibility-element';
        this._ariaElement.tabIndex = 0;
        this._ariaElement.setAttribute('aria-description', localize('description', 'Code with Inlay Hint Information'));
        this._ctxIsReading = InlayHintsAccessibility_1.IsReading.bindTo(contextKeyService);
    }
    dispose() {
        this._sessionDispoosables.dispose();
        this._ctxIsReading.reset();
        this._ariaElement.remove();
    }
    _reset() {
        dom.clearNode(this._ariaElement);
        this._sessionDispoosables.clear();
        this._ctxIsReading.reset();
    }
    async _read(line, hints) {
        this._sessionDispoosables.clear();
        if (!this._ariaElement.isConnected) {
            this._editor.getDomNode()?.appendChild(this._ariaElement);
        }
        if (!this._editor.hasModel() || !this._ariaElement.isConnected) {
            this._ctxIsReading.set(false);
            return;
        }
        const cts = new CancellationTokenSource();
        this._sessionDispoosables.add(cts);
        for (const hint of hints) {
            await hint.resolve(cts.token);
        }
        if (cts.token.isCancellationRequested) {
            return;
        }
        const model = this._editor.getModel();
        // const text = this._editor.getModel().getLineContent(line);
        const newChildren = [];
        let start = 0;
        let tooLongToRead = false;
        for (const item of hints) {
            // text
            const part = model.getValueInRange({
                startLineNumber: line,
                startColumn: start + 1,
                endLineNumber: line,
                endColumn: item.hint.position.column,
            });
            if (part.length > 0) {
                newChildren.push(part);
                start = item.hint.position.column - 1;
            }
            // check length
            if (start > 750) {
                newChildren.push('…');
                tooLongToRead = true;
                break;
            }
            // hint
            const em = document.createElement('em');
            const { label } = item.hint;
            if (typeof label === 'string') {
                em.innerText = label;
            }
            else {
                for (const part of label) {
                    if (part.command) {
                        const link = this._instaService.createInstance(Link, em, { href: asCommandLink(part.command), label: part.label, title: part.command.title }, undefined);
                        this._sessionDispoosables.add(link);
                    }
                    else {
                        em.innerText += part.label;
                    }
                }
            }
            newChildren.push(em);
        }
        // trailing text
        if (!tooLongToRead) {
            newChildren.push(model.getValueInRange({
                startLineNumber: line,
                startColumn: start + 1,
                endLineNumber: line,
                endColumn: Number.MAX_SAFE_INTEGER,
            }));
        }
        dom.reset(this._ariaElement, ...newChildren);
        this._ariaElement.focus();
        this._ctxIsReading.set(true);
        // reset on blur
        this._sessionDispoosables.add(dom.addDisposableListener(this._ariaElement, 'focusout', () => {
            this._reset();
        }));
    }
    startInlayHintsReading() {
        if (!this._editor.hasModel()) {
            return;
        }
        const line = this._editor.getPosition().lineNumber;
        const hints = InlayHintsController.get(this._editor)?.getInlayHintsForLine(line);
        if (!hints || hints.length === 0) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.noInlayHints);
        }
        else {
            this._read(line, hints);
        }
    }
    stopInlayHintsReading() {
        this._reset();
        this._editor.focus();
    }
};
InlayHintsAccessibility = InlayHintsAccessibility_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IAccessibilitySignalService),
    __param(3, IInstantiationService)
], InlayHintsAccessibility);
export { InlayHintsAccessibility };
registerAction2(class StartReadHints extends EditorAction2 {
    constructor() {
        super({
            id: 'inlayHints.startReadingLineWithHint',
            title: localize2('read.title', 'Read Line with Inline Hints'),
            precondition: EditorContextKeys.hasInlayHintsProvider,
            f1: true,
        });
    }
    runEditorCommand(_accessor, editor) {
        const ctrl = InlayHintsAccessibility.get(editor);
        ctrl?.startInlayHintsReading();
    }
});
registerAction2(class StopReadHints extends EditorAction2 {
    constructor() {
        super({
            id: 'inlayHints.stopReadingLineWithHint',
            title: localize2('stop.title', 'Stop Inlay Hints Reading'),
            precondition: InlayHintsAccessibility.IsReading,
            f1: true,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        const ctrl = InlayHintsAccessibility.get(editor);
        ctrl?.stopInlayHintsReading();
    }
});
registerEditorContribution(InlayHintsAccessibility.ID, InlayHintsAccessibility, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0FjY2Vzc2liaWx0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGF5SGludHMvYnJvd3Nlci9pbmxheUhpbnRzQWNjZXNzaWJpbHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxPQUFPLEVBQ04sYUFBYSxFQUViLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFFTixhQUFhLEdBQ2IsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUzRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1Qjs7YUFDbkIsY0FBUyxH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