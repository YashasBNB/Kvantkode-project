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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0FjY2Vzc2liaWx0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHNBY2Nlc3NpYmlsdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFDTixhQUFhLEVBRWIsMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUVOLGFBQWEsR0FDYixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkYsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTNELElBQU0sdUJBQXVCLEdBQTdCLE1B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