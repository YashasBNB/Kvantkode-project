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
var ReferencesController_1;
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../browser/services/codeEditorService.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { PeekContext } from '../../../peekView/browser/peekView.js';
import { getOuterEditor } from '../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import * as nls from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse, WorkbenchTreeElementCanExpand, } from '../../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { OneReference } from '../referencesModel.js';
import { LayoutData, ReferenceWidget } from './referencesWidget.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { InputFocusedContext } from '../../../../../platform/contextkey/common/contextkeys.js';
export const ctxReferenceSearchVisible = new RawContextKey('referenceSearchVisible', false, nls.localize('referenceSearchVisible', "Whether reference peek is visible, like 'Peek References' or 'Peek Definition'"));
let ReferencesController = class ReferencesController {
    static { ReferencesController_1 = this; }
    static { this.ID = 'editor.contrib.referencesController'; }
    static get(editor) {
        return editor.getContribution(ReferencesController_1.ID);
    }
    constructor(_defaultTreeKeyboardSupport, _editor, contextKeyService, _editorService, _notificationService, _instantiationService, _storageService, _configurationService) {
        this._defaultTreeKeyboardSupport = _defaultTreeKeyboardSupport;
        this._editor = _editor;
        this._editorService = _editorService;
        this._notificationService = _notificationService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._requestIdPool = 0;
        this._ignoreModelChangeEvent = false;
        this._referenceSearchVisible = ctxReferenceSearchVisible.bindTo(contextKeyService);
    }
    dispose() {
        this._referenceSearchVisible.reset();
        this._disposables.dispose();
        this._widget?.dispose();
        this._model?.dispose();
        this._widget = undefined;
        this._model = undefined;
    }
    toggleWidget(range, modelPromise, peekMode) {
        // close current widget and return early is position didn't change
        let widgetPosition;
        if (this._widget) {
            widgetPosition = this._widget.position;
        }
        this.closeWidget();
        if (!!widgetPosition && range.containsPosition(widgetPosition)) {
            return;
        }
        this._peekMode = peekMode;
        this._referenceSearchVisible.set(true);
        // close the widget on model/mode changes
        this._disposables.add(this._editor.onDidChangeModelLanguage(() => {
            this.closeWidget();
        }));
        this._disposables.add(this._editor.onDidChangeModel(() => {
            if (!this._ignoreModelChangeEvent) {
                this.closeWidget();
            }
        }));
        const storageKey = 'peekViewLayout';
        const data = LayoutData.fromJSON(this._storageService.get(storageKey, 0 /* StorageScope.PROFILE */, '{}'));
        this._widget = this._instantiationService.createInstance(ReferenceWidget, this._editor, this._defaultTreeKeyboardSupport, data);
        this._widget.setTitle(nls.localize('labelLoading', 'Loading...'));
        this._widget.show(range);
        this._disposables.add(this._widget.onDidClose(() => {
            modelPromise.cancel();
            if (this._widget) {
                this._storageService.store(storageKey, JSON.stringify(this._widget.layoutData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                if (!this._widget.isClosing) {
                    // to prevent calling this too many times, check whether it was already closing.
                    this.closeWidget();
                }
                this._widget = undefined;
            }
            else {
                this.closeWidget();
            }
        }));
        this._disposables.add(this._widget.onDidSelectReference((event) => {
            const { element, kind } = event;
            if (!element) {
                return;
            }
            switch (kind) {
                case 'open':
                    if (event.source !== 'editor' ||
                        !this._configurationService.getValue('editor.stablePeek')) {
                        // when stable peek is configured we don't close
                        // the peek window on selecting the editor
                        this.openReference(element, false, false);
                    }
                    break;
                case 'side':
                    this.openReference(element, true, false);
                    break;
                case 'goto':
                    if (peekMode) {
                        this._gotoReference(element, true);
                    }
                    else {
                        this.openReference(element, false, true);
                    }
                    break;
            }
        }));
        const requestId = ++this._requestIdPool;
        modelPromise.then((model) => {
            // still current request? widget still open?
            if (requestId !== this._requestIdPool || !this._widget) {
                model.dispose();
                return undefined;
            }
            this._model?.dispose();
            this._model = model;
            // show widget
            return this._widget.setModel(this._model).then(() => {
                if (this._widget && this._model && this._editor.hasModel()) {
                    // might have been closed
                    // set title
                    if (!this._model.isEmpty) {
                        this._widget.setMetaTitle(nls.localize('metaTitle.N', '{0} ({1})', this._model.title, this._model.references.length));
                    }
                    else {
                        this._widget.setMetaTitle('');
                    }
                    // set 'best' selection
                    const uri = this._editor.getModel().uri;
                    const pos = new Position(range.startLineNumber, range.startColumn);
                    const selection = this._model.nearestReference(uri, pos);
                    if (selection) {
                        return this._widget.setSelection(selection).then(() => {
                            if (this._widget &&
                                this._editor.getOption(91 /* EditorOption.peekWidgetDefaultFocus */) === 'editor') {
                                this._widget.focusOnPreviewEditor();
                            }
                        });
                    }
                }
                return undefined;
            });
        }, (error) => {
            this._notificationService.error(error);
        });
    }
    changeFocusBetweenPreviewAndReferences() {
        if (!this._widget) {
            // can be called while still resolving...
            return;
        }
        if (this._widget.isPreviewEditorFocused()) {
            this._widget.focusOnReferenceTree();
        }
        else {
            this._widget.focusOnPreviewEditor();
        }
    }
    async goToNextOrPreviousReference(fwd) {
        if (!this._editor.hasModel() || !this._model || !this._widget) {
            // can be called while still resolving...
            return;
        }
        const currentPosition = this._widget.position;
        if (!currentPosition) {
            return;
        }
        const source = this._model.nearestReference(this._editor.getModel().uri, currentPosition);
        if (!source) {
            return;
        }
        const target = this._model.nextOrPreviousReference(source, fwd);
        const editorFocus = this._editor.hasTextFocus();
        const previewEditorFocus = this._widget.isPreviewEditorFocused();
        await this._widget.setSelection(target);
        await this._gotoReference(target, false);
        if (editorFocus) {
            this._editor.focus();
        }
        else if (this._widget && previewEditorFocus) {
            this._widget.focusOnPreviewEditor();
        }
    }
    async revealReference(reference) {
        if (!this._editor.hasModel() || !this._model || !this._widget) {
            // can be called while still resolving...
            return;
        }
        await this._widget.revealReference(reference);
    }
    closeWidget(focusEditor = true) {
        this._widget?.dispose();
        this._model?.dispose();
        this._referenceSearchVisible.reset();
        this._disposables.clear();
        this._widget = undefined;
        this._model = undefined;
        if (focusEditor) {
            this._editor.focus();
        }
        this._requestIdPool += 1; // Cancel pending requests
    }
    _gotoReference(ref, pinned) {
        this._widget?.hide();
        this._ignoreModelChangeEvent = true;
        const range = Range.lift(ref.range).collapseToStart();
        return this._editorService
            .openCodeEditor({
            resource: ref.uri,
            options: { selection: range, selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */, pinned },
        }, this._editor)
            .then((openedEditor) => {
            this._ignoreModelChangeEvent = false;
            if (!openedEditor || !this._widget) {
                // something went wrong...
                this.closeWidget();
                return;
            }
            if (this._editor === openedEditor) {
                //
                this._widget.show(range);
                this._widget.focusOnReferenceTree();
            }
            else {
                // we opened a different editor instance which means a different controller instance.
                // therefore we stop with this controller and continue with the other
                const other = ReferencesController_1.get(openedEditor);
                const model = this._model.clone();
                this.closeWidget();
                openedEditor.focus();
                other?.toggleWidget(range, createCancelablePromise((_) => Promise.resolve(model)), this._peekMode ?? false);
            }
        }, (err) => {
            this._ignoreModelChangeEvent = false;
            onUnexpectedError(err);
        });
    }
    openReference(ref, sideBySide, pinned) {
        // clear stage
        if (!sideBySide) {
            this.closeWidget();
        }
        const { uri, range } = ref;
        this._editorService.openCodeEditor({
            resource: uri,
            options: { selection: range, selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */, pinned },
        }, this._editor, sideBySide);
    }
};
ReferencesController = ReferencesController_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, ICodeEditorService),
    __param(4, INotificationService),
    __param(5, IInstantiationService),
    __param(6, IStorageService),
    __param(7, IConfigurationService)
], ReferencesController);
export { ReferencesController };
function withController(accessor, fn) {
    const outerEditor = getOuterEditor(accessor);
    if (!outerEditor) {
        return;
    }
    const controller = ReferencesController.get(outerEditor);
    if (controller) {
        fn(controller);
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'togglePeekWidgetFocus',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 60 /* KeyCode.F2 */),
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, (controller) => {
            controller.changeFocusBetweenPreviewAndReferences();
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'goToNextReference',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
    primary: 62 /* KeyCode.F4 */,
    secondary: [70 /* KeyCode.F12 */],
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, (controller) => {
            controller.goToNextOrPreviousReference(true);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'goToPreviousReference',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
    primary: 1024 /* KeyMod.Shift */ | 62 /* KeyCode.F4 */,
    secondary: [1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */],
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, (controller) => {
            controller.goToNextOrPreviousReference(false);
        });
    },
});
// commands that aren't needed anymore because there is now ContextKeyExpr.OR
CommandsRegistry.registerCommandAlias('goToNextReferenceFromEmbeddedEditor', 'goToNextReference');
CommandsRegistry.registerCommandAlias('goToPreviousReferenceFromEmbeddedEditor', 'goToPreviousReference');
// close
CommandsRegistry.registerCommandAlias('closeReferenceSearchEditor', 'closeReferenceSearch');
CommandsRegistry.registerCommand('closeReferenceSearch', (accessor) => withController(accessor, (controller) => controller.closeWidget()));
KeybindingsRegistry.registerKeybindingRule({
    id: 'closeReferenceSearch',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 101,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(PeekContext.inPeekEditor, ContextKeyExpr.not('config.editor.stablePeek')),
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'closeReferenceSearch',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, ContextKeyExpr.not('config.editor.stablePeek'), ContextKeyExpr.or(EditorContextKeys.editorTextFocus, InputFocusedContext.negate())),
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'revealReference',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
    },
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse.negate(), WorkbenchTreeElementCanExpand.negate()),
    handler(accessor) {
        const listService = accessor.get(IListService);
        const focus = listService.lastFocusedList?.getFocus();
        if (Array.isArray(focus) && focus[0] instanceof OneReference) {
            withController(accessor, (controller) => controller.revealReference(focus[0]));
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'openReferenceToSide',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
    },
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse.negate(), WorkbenchTreeElementCanExpand.negate()),
    handler(accessor) {
        const listService = accessor.get(IListService);
        const focus = listService.lastFocusedList?.getFocus();
        if (Array.isArray(focus) && focus[0] instanceof OneReference) {
            withController(accessor, (controller) => controller.openReference(focus[0], true, true));
        }
    },
});
CommandsRegistry.registerCommand('openReference', (accessor) => {
    const listService = accessor.get(IListService);
    const focus = listService.lastFocusedList?.getFocus();
    if (Array.isArray(focus) && focus[0] instanceof OneReference) {
        withController(accessor, (controller) => controller.openReference(focus[0], false, true));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvcGVlay9yZWZlcmVuY2VzQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNsRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUNOLFlBQVksRUFDWiw0QkFBNEIsRUFDNUIsK0JBQStCLEVBQy9CLDZCQUE2QixHQUM3QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLHVCQUF1QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFOUYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQ3pELHdCQUF3QixFQUN4QixLQUFLLEVBQ0wsR0FBRyxDQUFDLFFBQVEsQ0FDWCx3QkFBd0IsRUFDeEIsZ0ZBQWdGLENBQ2hGLENBQ0QsQ0FBQTtBQUVNLElBQWUsb0JBQW9CLEdBQW5DLE1BQWUsb0JBQW9COzthQUN6QixPQUFFLEdBQUcscUNBQXFDLEFBQXhDLENBQXdDO0lBWTFELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF1QixzQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRUQsWUFDa0IsMkJBQW9DLEVBQ3BDLE9BQW9CLEVBQ2pCLGlCQUFxQyxFQUNyQyxjQUFtRCxFQUNqRCxvQkFBMkQsRUFDMUQscUJBQTZELEVBQ25FLGVBQWlELEVBQzNDLHFCQUE2RDtRQVBuRSxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQVM7UUFDcEMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUVBLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtRQUNoQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ3pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbEQsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzFCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUF0QnBFLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUs3QyxtQkFBYyxHQUFHLENBQUMsQ0FBQTtRQUNsQiw0QkFBdUIsR0FBRyxLQUFLLENBQUE7UUFrQnRDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN0QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFBWSxDQUNYLEtBQVksRUFDWixZQUFnRCxFQUNoRCxRQUFpQjtRQUVqQixrRUFBa0U7UUFDbEUsSUFBSSxjQUFvQyxDQUFBO1FBQ3hDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUN2QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUMxQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFBO1FBQ25DLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQy9CLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQVUsZ0NBQXdCLElBQUksQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN2RCxlQUFlLEVBQ2YsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsMkJBQTJCLEVBQ2hDLElBQUksQ0FDSixDQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV4QixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzVCLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNyQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQ3pCLFVBQVUsRUFDVixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLDhEQUd2QyxDQUFBO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM3QixnRkFBZ0Y7b0JBQ2hGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDbkIsQ0FBQztnQkFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMzQyxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQTtZQUMvQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTTtZQUNQLENBQUM7WUFDRCxRQUFRLElBQUksRUFBRSxDQUFDO2dCQUNkLEtBQUssTUFBTTtvQkFDVixJQUNDLEtBQUssQ0FBQyxNQUFNLEtBQUssUUFBUTt3QkFDekIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQ3hELENBQUM7d0JBQ0YsZ0RBQWdEO3dCQUNoRCwwQ0FBMEM7d0JBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDMUMsQ0FBQztvQkFDRCxNQUFLO2dCQUNOLEtBQUssTUFBTTtvQkFDVixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3hDLE1BQUs7Z0JBQ04sS0FBSyxNQUFNO29CQUNWLElBQUksUUFBUSxFQUFFLENBQUM7d0JBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ25DLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ3pDLENBQUM7b0JBQ0QsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxTQUFTLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFBO1FBRXZDLFlBQVksQ0FBQyxJQUFJLENBQ2hCLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDVCw0Q0FBNEM7WUFDNUMsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDeEQsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNmLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1lBRW5CLGNBQWM7WUFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNuRCxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQzVELHlCQUF5QjtvQkFFekIsWUFBWTtvQkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsYUFBYSxFQUNiLFdBQVcsRUFDWCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUM3QixDQUNELENBQUE7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO29CQUM5QixDQUFDO29CQUVELHVCQUF1QjtvQkFDdkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUE7b0JBQ3ZDLE1BQU0sR0FBRyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUNsRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtvQkFDeEQsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7NEJBQ3JELElBQ0MsSUFBSSxDQUFDLE9BQU87Z0NBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLDhDQUFxQyxLQUFLLFFBQVEsRUFDdkUsQ0FBQztnQ0FDRixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUE7NEJBQ3BDLENBQUM7d0JBQ0YsQ0FBQyxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxFQUNELENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDVCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELHNDQUFzQztRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLHlDQUF5QztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEdBQVk7UUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9ELHlDQUF5QztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQzdDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMvRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQy9DLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ2hFLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDckIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBdUI7UUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9ELHlDQUF5QztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELFdBQVcsQ0FBQyxXQUFXLEdBQUcsSUFBSTtRQUM3QixJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdEIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDdkIsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxJQUFJLENBQUMsQ0FBQSxDQUFDLDBCQUEwQjtJQUNwRCxDQUFDO0lBRU8sY0FBYyxDQUFDLEdBQWEsRUFBRSxNQUFlO1FBQ3BELElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFFcEIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQTtRQUNuQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUVyRCxPQUFPLElBQUksQ0FBQyxjQUFjO2FBQ3hCLGNBQWMsQ0FDZDtZQUNDLFFBQVEsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNqQixPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGVBQWUsa0RBQWdDLEVBQUUsTUFBTSxFQUFFO1NBQ3RGLEVBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FDWjthQUNBLElBQUksQ0FDSixDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ2hCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUE7WUFFcEMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsMEJBQTBCO2dCQUMxQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ2xCLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUNuQyxFQUFFO2dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUE7WUFDcEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHFGQUFxRjtnQkFDckYscUVBQXFFO2dCQUNyRSxNQUFNLEtBQUssR0FBRyxzQkFBb0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBRWxDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDbEIsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUVwQixLQUFLLEVBQUUsWUFBWSxDQUNsQixLQUFLLEVBQ0wsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDdEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQ3ZCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDUCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFBO1lBQ3BDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLENBQUMsQ0FDRCxDQUFBO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxHQUFhLEVBQUUsVUFBbUIsRUFBRSxNQUFlO1FBQ2hFLGNBQWM7UUFDZCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25CLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQTtRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FDakM7WUFDQyxRQUFRLEVBQUUsR0FBRztZQUNiLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsZUFBZSxrREFBZ0MsRUFBRSxNQUFNLEVBQUU7U0FDdEYsRUFDRCxJQUFJLENBQUMsT0FBTyxFQUNaLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQzs7QUE1VG9CLG9CQUFvQjtJQW9CdkMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0F6QkYsb0JBQW9CLENBNlR6Qzs7QUFFRCxTQUFTLGNBQWMsQ0FDdEIsUUFBMEIsRUFDMUIsRUFBOEM7SUFFOUMsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzVDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFNO0lBQ1AsQ0FBQztJQUNELE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN4RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNmLENBQUM7QUFDRixDQUFDO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLHVCQUF1QjtJQUMzQixNQUFNLDBDQUFnQztJQUN0QyxPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2QixzQkFBYTtJQUM1RCxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsRUFBRSxXQUFXLENBQUMsWUFBWSxDQUFDO0lBQzVFLE9BQU8sQ0FBQyxRQUFRO1FBQ2YsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3ZDLFVBQVUsQ0FBQyxzQ0FBc0MsRUFBRSxDQUFBO1FBQ3BELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsTUFBTSxFQUFFLDJDQUFpQyxFQUFFO0lBQzNDLE9BQU8scUJBQVk7SUFDbkIsU0FBUyxFQUFFLHNCQUFhO0lBQ3hCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUM7SUFDNUUsT0FBTyxDQUFDLFFBQVE7UUFDZixjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDdkMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsTUFBTSxFQUFFLDJDQUFpQyxFQUFFO0lBQzNDLE9BQU8sRUFBRSw2Q0FBeUI7SUFDbEMsU0FBUyxFQUFFLENBQUMsOENBQTBCLENBQUM7SUFDdkMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMseUJBQXlCLEVBQUUsV0FBVyxDQUFDLFlBQVksQ0FBQztJQUM1RSxPQUFPLENBQUMsUUFBUTtRQUNmLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUN2QyxVQUFVLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsNkVBQTZFO0FBQzdFLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLHFDQUFxQyxFQUFFLG1CQUFtQixDQUFDLENBQUE7QUFDakcsZ0JBQWdCLENBQUMsb0JBQW9CLENBQ3BDLHlDQUF5QyxFQUN6Qyx1QkFBdUIsQ0FDdkIsQ0FBQTtBQUVELFFBQVE7QUFDUixnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO0FBQzNGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3JFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNsRSxDQUFBO0FBQ0QsbUJBQW1CLENBQUMsc0JBQXNCLENBQUM7SUFDMUMsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixNQUFNLEVBQUUsMkNBQWlDLEdBQUc7SUFDNUMsT0FBTyx3QkFBZ0I7SUFDdkIsU0FBUyxFQUFFLENBQUMsZ0RBQTZCLENBQUM7SUFDMUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLFdBQVcsQ0FBQyxZQUFZLEVBQ3hCLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FDOUM7Q0FDRCxDQUFDLENBQUE7QUFDRixtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQztJQUMxQyxFQUFFLEVBQUUsc0JBQXNCO0lBQzFCLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxPQUFPLHdCQUFnQjtJQUN2QixTQUFTLEVBQUUsQ0FBQyxnREFBNkIsQ0FBQztJQUMxQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIseUJBQXlCLEVBQ3pCLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFDOUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDbEY7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsaUJBQWlCO0lBQ3JCLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sdUJBQWU7SUFDdEIsR0FBRyxFQUFFO1FBQ0osT0FBTyx1QkFBZTtRQUN0QixTQUFTLEVBQUUsQ0FBQyxzREFBa0MsQ0FBQztLQUMvQztJQUNELElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qix5QkFBeUIsRUFDekIsNEJBQTRCLEVBQzVCLCtCQUErQixDQUFDLE1BQU0sRUFBRSxFQUN4Qyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsQ0FDdEM7SUFDRCxPQUFPLENBQUMsUUFBMEI7UUFDakMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEtBQUssR0FBVSxXQUFXLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQzVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDOUQsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9FLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixNQUFNLDBDQUFnQztJQUN0QyxPQUFPLEVBQUUsaURBQThCO0lBQ3ZDLEdBQUcsRUFBRTtRQUNKLE9BQU8sRUFBRSxnREFBOEI7S0FDdkM7SUFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIseUJBQXlCLEVBQ3pCLDRCQUE0QixFQUM1QiwrQkFBK0IsQ0FBQyxNQUFNLEVBQUUsRUFDeEMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLENBQ3RDO0lBQ0QsT0FBTyxDQUFDLFFBQTBCO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxLQUFLLEdBQVUsV0FBVyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUM1RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQzlELGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO0lBQzlELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDOUMsTUFBTSxLQUFLLEdBQVUsV0FBVyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsQ0FBQTtJQUM1RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLFlBQVksRUFBRSxDQUFDO1FBQzlELGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQSJ9