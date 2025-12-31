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
var PostEditWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { EditorStateCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { createCombinedWorkspaceEdit } from './edit.js';
import './postEditWidget.css';
let PostEditWidget = class PostEditWidget extends Disposable {
    static { PostEditWidget_1 = this; }
    static { this.baseId = 'editor.widget.postEditWidget'; }
    constructor(typeId, editor, visibleContext, showCommand, range, edits, onSelectNewEdit, additionalActions, contextKeyService, _keybindingService, _actionWidgetService) {
        super();
        this.typeId = typeId;
        this.editor = editor;
        this.showCommand = showCommand;
        this.range = range;
        this.edits = edits;
        this.onSelectNewEdit = onSelectNewEdit;
        this.additionalActions = additionalActions;
        this._keybindingService = _keybindingService;
        this._actionWidgetService = _actionWidgetService;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = true;
        this.create();
        this.visibleContext = visibleContext.bindTo(contextKeyService);
        this.visibleContext.set(true);
        this._register(toDisposable(() => this.visibleContext.reset()));
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
        this._register(toDisposable(() => this.editor.removeContentWidget(this)));
        this._register(this.editor.onDidChangeCursorPosition((e) => {
            this.dispose();
        }));
        this._register(Event.runAndSubscribe(_keybindingService.onDidUpdateKeybindings, () => {
            this._updateButtonTitle();
        }));
    }
    _updateButtonTitle() {
        const binding = this._keybindingService.lookupKeybinding(this.showCommand.id)?.getLabel();
        this.button.element.title = this.showCommand.label + (binding ? ` (${binding})` : '');
    }
    create() {
        this.domNode = dom.$('.post-edit-widget');
        this.button = this._register(new Button(this.domNode, {
            supportIcons: true,
        }));
        this.button.label = '$(insert)';
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, () => this.showSelector()));
    }
    getId() {
        return PostEditWidget_1.baseId + '.' + this.typeId;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return {
            position: this.range.getEndPosition(),
            preference: [2 /* ContentWidgetPositionPreference.BELOW */],
        };
    }
    showSelector() {
        const pos = dom.getDomNodePagePosition(this.button.element);
        const anchor = { x: pos.left + pos.width, y: pos.top + pos.height };
        this._actionWidgetService.show('postEditWidget', false, this.edits.allEdits.map((edit, i) => {
            return {
                kind: "action" /* ActionListItemKind.Action */,
                item: edit,
                label: edit.title,
                disabled: false,
                canPreview: false,
                group: {
                    title: '',
                    icon: ThemeIcon.fromId(i === this.edits.activeEditIndex ? Codicon.check.id : Codicon.blank.id),
                },
            };
        }), {
            onHide: () => {
                this.editor.focus();
            },
            onSelect: (item) => {
                this._actionWidgetService.hide(false);
                const i = this.edits.allEdits.findIndex((edit) => edit === item);
                if (i !== this.edits.activeEditIndex) {
                    return this.onSelectNewEdit(i);
                }
            },
        }, anchor, this.editor.getDomNode() ?? undefined, this.additionalActions);
    }
};
PostEditWidget = PostEditWidget_1 = __decorate([
    __param(8, IContextKeyService),
    __param(9, IKeybindingService),
    __param(10, IActionWidgetService)
], PostEditWidget);
let PostEditWidgetManager = class PostEditWidgetManager extends Disposable {
    constructor(_id, _editor, _visibleContext, _showCommand, _getAdditionalActions, _instantiationService, _bulkEditService, _notificationService) {
        super();
        this._id = _id;
        this._editor = _editor;
        this._visibleContext = _visibleContext;
        this._showCommand = _showCommand;
        this._getAdditionalActions = _getAdditionalActions;
        this._instantiationService = _instantiationService;
        this._bulkEditService = _bulkEditService;
        this._notificationService = _notificationService;
        this._currentWidget = this._register(new MutableDisposable());
        this._register(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelContent)(() => this.clear()));
    }
    async applyEditAndShowIfNeeded(ranges, edits, canShowWidget, resolve, token) {
        if (!ranges.length || !this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const edit = edits.allEdits.at(edits.activeEditIndex);
        if (!edit) {
            return;
        }
        const onDidSelectEdit = async (newEditIndex) => {
            const model = this._editor.getModel();
            if (!model) {
                return;
            }
            await model.undo();
            this.applyEditAndShowIfNeeded(ranges, { activeEditIndex: newEditIndex, allEdits: edits.allEdits }, canShowWidget, resolve, token);
        };
        const handleError = (e, message) => {
            if (isCancellationError(e)) {
                return;
            }
            this._notificationService.error(message);
            if (canShowWidget) {
                this.show(ranges[0], edits, onDidSelectEdit);
            }
        };
        const editorStateCts = new EditorStateCancellationTokenSource(this._editor, 1 /* CodeEditorStateFlag.Value */ | 2 /* CodeEditorStateFlag.Selection */, undefined, token);
        let resolvedEdit;
        try {
            resolvedEdit = await raceCancellationError(resolve(edit, editorStateCts.token), editorStateCts.token);
        }
        catch (e) {
            return handleError(e, localize('resolveError', "Error resolving edit '{0}':\n{1}", edit.title, toErrorMessage(e)));
        }
        finally {
            editorStateCts.dispose();
        }
        if (token.isCancellationRequested) {
            return;
        }
        const combinedWorkspaceEdit = createCombinedWorkspaceEdit(model.uri, ranges, resolvedEdit);
        // Use a decoration to track edits around the trigger range
        const primaryRange = ranges[0];
        const editTrackingDecoration = model.deltaDecorations([], [
            {
                range: primaryRange,
                options: {
                    description: 'paste-line-suffix',
                    stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
                },
            },
        ]);
        this._editor.focus();
        let editResult;
        let editRange;
        try {
            editResult = await this._bulkEditService.apply(combinedWorkspaceEdit, {
                editor: this._editor,
                token,
            });
            editRange = model.getDecorationRange(editTrackingDecoration[0]);
        }
        catch (e) {
            return handleError(e, localize('applyError', "Error applying edit '{0}':\n{1}", edit.title, toErrorMessage(e)));
        }
        finally {
            model.deltaDecorations(editTrackingDecoration, []);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (canShowWidget && editResult.isApplied && edits.allEdits.length > 1) {
            this.show(editRange ?? primaryRange, edits, onDidSelectEdit);
        }
    }
    show(range, edits, onDidSelectEdit) {
        this.clear();
        if (this._editor.hasModel()) {
            this._currentWidget.value = this._instantiationService.createInstance((PostEditWidget), this._id, this._editor, this._visibleContext, this._showCommand, range, edits, onDidSelectEdit, this._getAdditionalActions());
        }
    }
    clear() {
        this._currentWidget.clear();
    }
    tryShowSelector() {
        this._currentWidget.value?.showSelector();
    }
};
PostEditWidgetManager = __decorate([
    __param(5, IInstantiationService),
    __param(6, IBulkEditService),
    __param(7, INotificationService)
], PostEditWidgetManager);
export { PostEditWidgetManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zdEVkaXRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9wb3N0RWRpdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBSzdDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtB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