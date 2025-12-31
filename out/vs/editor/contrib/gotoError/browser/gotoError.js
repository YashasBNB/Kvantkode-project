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
var MarkerController_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IMarkerNavigationService } from './markerNavigationService.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { MarkerNavigationWidget } from './gotoErrorWidget.js';
let MarkerController = class MarkerController {
    static { MarkerController_1 = this; }
    static { this.ID = 'editor.contrib.markerController'; }
    static get(editor) {
        return editor.getContribution(MarkerController_1.ID);
    }
    constructor(editor, _markerNavigationService, _contextKeyService, _editorService, _instantiationService) {
        this._markerNavigationService = _markerNavigationService;
        this._contextKeyService = _contextKeyService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._sessionDispoables = new DisposableStore();
        this._editor = editor;
        this._widgetVisible = CONTEXT_MARKERS_NAVIGATION_VISIBLE.bindTo(this._contextKeyService);
    }
    dispose() {
        this._cleanUp();
        this._sessionDispoables.dispose();
    }
    _cleanUp() {
        this._widgetVisible.reset();
        this._sessionDispoables.clear();
        this._widget = undefined;
        this._model = undefined;
    }
    _getOrCreateModel(uri) {
        if (this._model && this._model.matches(uri)) {
            return this._model;
        }
        let reusePosition = false;
        if (this._model) {
            reusePosition = true;
            this._cleanUp();
        }
        this._model = this._markerNavigationService.getMarkerList(uri);
        if (reusePosition) {
            this._model.move(true, this._editor.getModel(), this._editor.getPosition());
        }
        this._widget = this._instantiationService.createInstance(MarkerNavigationWidget, this._editor);
        this._widget.onDidClose(() => this.close(), this, this._sessionDispoables);
        this._widgetVisible.set(true);
        this._sessionDispoables.add(this._model);
        this._sessionDispoables.add(this._widget);
        // follow cursor
        this._sessionDispoables.add(this._editor.onDidChangeCursorPosition((e) => {
            if (!this._model?.selected ||
                !Range.containsPosition(this._model?.selected.marker, e.position)) {
                this._model?.resetIndex();
            }
        }));
        // update markers
        this._sessionDispoables.add(this._model.onDidChange(() => {
            if (!this._widget || !this._widget.position || !this._model) {
                return;
            }
            const info = this._model.find(this._editor.getModel().uri, this._widget.position);
            if (info) {
                this._widget.updateMarker(info.marker);
            }
            else {
                this._widget.showStale();
            }
        }));
        // open related
        this._sessionDispoables.add(this._widget.onDidSelectRelatedInformation((related) => {
            this._editorService.openCodeEditor({
                resource: related.resource,
                options: {
                    pinned: true,
                    revealIfOpened: true,
                    selection: Range.lift(related).collapseToStart(),
                },
            }, this._editor);
            this.close(false);
        }));
        this._sessionDispoables.add(this._editor.onDidChangeModel(() => this._cleanUp()));
        return this._model;
    }
    close(focusEditor = true) {
        this._cleanUp();
        if (focusEditor) {
            this._editor.focus();
        }
    }
    showAtMarker(marker) {
        if (!this._editor.hasModel()) {
            return;
        }
        const textModel = this._editor.getModel();
        const model = this._getOrCreateModel(textModel.uri);
        model.resetIndex();
        model.move(true, textModel, new Position(marker.startLineNumber, marker.startColumn));
        if (model.selected) {
            this._widget.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
        }
    }
    async navigate(next, multiFile) {
        if (!this._editor.hasModel()) {
            return;
        }
        const textModel = this._editor.getModel();
        const model = this._getOrCreateModel(multiFile ? undefined : textModel.uri);
        model.move(next, textModel, this._editor.getPosition());
        if (!model.selected) {
            return;
        }
        if (model.selected.marker.resource.toString() !== textModel.uri.toString()) {
            // show in different editor
            this._cleanUp();
            const otherEditor = await this._editorService.openCodeEditor({
                resource: model.selected.marker.resource,
                options: {
                    pinned: false,
                    revealIfOpened: true,
                    selectionRevealType: 2 /* TextEditorSelectionRevealType.NearTop */,
                    selection: model.selected.marker,
                },
            }, this._editor);
            if (otherEditor) {
                MarkerController_1.get(otherEditor)?.close();
                MarkerController_1.get(otherEditor)?.navigate(next, multiFile);
            }
        }
        else {
            // show in this editor
            this._widget.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
        }
    }
};
MarkerController = MarkerController_1 = __decorate([
    __param(1, IMarkerNavigationService),
    __param(2, IContextKeyService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], MarkerController);
export { MarkerController };
class MarkerNavigationAction extends EditorAction {
    constructor(_next, _multiFile, opts) {
        super(opts);
        this._next = _next;
        this._multiFile = _multiFile;
    }
    async run(_accessor, editor) {
        if (editor.hasModel()) {
            await MarkerController.get(editor)?.navigate(this._next, this._multiFile);
        }
    }
}
export class NextMarkerAction extends MarkerNavigationAction {
    static { this.ID = 'editor.action.marker.next'; }
    static { this.LABEL = nls.localize2('markerAction.next.label', 'Go to Next Problem (Error, Warning, Info)'); }
    constructor() {
        super(true, false, {
            id: NextMarkerAction.ID,
            label: NextMarkerAction.LABEL,
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MarkerNavigationWidget.TitleMenu,
                title: NextMarkerAction.LABEL.value,
                icon: registerIcon('marker-navigation-next', Codicon.arrowDown, nls.localize('nextMarkerIcon', 'Icon for goto next marker.')),
                group: 'navigation',
                order: 1,
            },
        });
    }
}
class PrevMarkerAction extends MarkerNavigationAction {
    static { this.ID = 'editor.action.marker.prev'; }
    static { this.LABEL = nls.localize2('markerAction.previous.label', 'Go to Previous Problem (Error, Warning, Info)'); }
    constructor() {
        super(false, false, {
            id: PrevMarkerAction.ID,
            label: PrevMarkerAction.LABEL,
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MarkerNavigationWidget.TitleMenu,
                title: PrevMarkerAction.LABEL.value,
                icon: registerIcon('marker-navigation-previous', Codicon.arrowUp, nls.localize('previousMarkerIcon', 'Icon for goto previous marker.')),
                group: 'navigation',
                order: 2,
            },
        });
    }
}
class NextMarkerInFilesAction extends MarkerNavigationAction {
    constructor() {
        super(true, true, {
            id: 'editor.action.marker.nextInFiles',
            label: nls.localize2('markerAction.nextInFiles.label', 'Go to Next Problem in Files (Error, Warning, Info)'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarGoMenu,
                title: nls.localize({ key: 'miGotoNextProblem', comment: ['&& denotes a mnemonic'] }, 'Next &&Problem'),
                group: '6_problem_nav',
                order: 1,
            },
        });
    }
}
class PrevMarkerInFilesAction extends MarkerNavigationAction {
    constructor() {
        super(false, true, {
            id: 'editor.action.marker.prevInFiles',
            label: nls.localize2('markerAction.previousInFiles.label', 'Go to Previous Problem in Files (Error, Warning, Info)'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 1024 /* KeyMod.Shift */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarGoMenu,
                title: nls.localize({ key: 'miGotoPreviousProblem', comment: ['&& denotes a mnemonic'] }, 'Previous &&Problem'),
                group: '6_problem_nav',
                order: 2,
            },
        });
    }
}
registerEditorContribution(MarkerController.ID, MarkerController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(NextMarkerAction);
registerEditorAction(PrevMarkerAction);
registerEditorAction(NextMarkerInFilesAction);
registerEditorAction(PrevMarkerInFilesAction);
const CONTEXT_MARKERS_NAVIGATION_VISIBLE = new RawContextKey('markersNavigationVisible', false);
const MarkerCommand = EditorCommand.bindToContribution(MarkerController.get);
registerEditorCommand(new MarkerCommand({
    id: 'closeMarkersNavigation',
    precondition: CONTEXT_MARKERS_NAVIGATION_VISIBLE,
    handler: (x) => x.close(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 50,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0Vycm9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b0Vycm9yL2Jyb3dzZXIvZ290b0Vycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3RFLE9BQU8sRUFDTixZQUFZLEVBQ1osYUFBYSxFQUdiLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQWMsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUV0RCxJQUFNLGdCQUFnQixHQUF0QixN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