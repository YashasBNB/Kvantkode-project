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
import { Separator } from '../../../../base/common/actions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { IMenuService, MenuId, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export class GutterActionsRegistryImpl {
    constructor() {
        this._registeredGutterActionsGenerators = new Set();
    }
    /**
     *
     * This exists solely to allow the debug and test contributions to add actions to the gutter context menu
     * which cannot be trivially expressed using when clauses and therefore cannot be statically registered.
     * If you want an action to show up in the gutter context menu, you should generally use MenuId.EditorLineNumberMenu instead.
     */
    registerGutterActionsGenerator(gutterActionsGenerator) {
        this._registeredGutterActionsGenerators.add(gutterActionsGenerator);
        return {
            dispose: () => {
                this._registeredGutterActionsGenerators.delete(gutterActionsGenerator);
            },
        };
    }
    getGutterActionsGenerators() {
        return Array.from(this._registeredGutterActionsGenerators.values());
    }
}
Registry.add('gutterActionsRegistry', new GutterActionsRegistryImpl());
export const GutterActionsRegistry = Registry.as('gutterActionsRegistry');
let EditorLineNumberContextMenu = class EditorLineNumberContextMenu extends Disposable {
    static { this.ID = 'workbench.contrib.editorLineNumberContextMenu'; }
    constructor(editor, contextMenuService, menuService, contextKeyService, instantiationService) {
        super();
        this.editor = editor;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this._register(this.editor.onMouseDown((e) => this.doShow(e, false)));
    }
    show(e) {
        this.doShow(e, true);
    }
    doShow(e, force) {
        const model = this.editor.getModel();
        // on macOS ctrl+click is interpreted as right click
        if ((!e.event.rightButton && !(isMacintosh && e.event.leftButton && e.event.ctrlKey) && !force) ||
            (e.target.type !== 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ &&
                e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) ||
            !e.target.position ||
            !model) {
            return;
        }
        const lineNumber = e.target.position.lineNumber;
        const contextKeyService = this.contextKeyService.createOverlay([
            ['editorLineNumber', lineNumber],
        ]);
        const menu = this.menuService.createMenu(MenuId.EditorLineNumberContext, contextKeyService);
        const allActions = [];
        this.instantiationService.invokeFunction((accessor) => {
            for (const generator of GutterActionsRegistry.getGutterActionsGenerators()) {
                const collectedActions = new Map();
                generator({ lineNumber, editor: this.editor, accessor }, {
                    push: (action, group = 'navigation') => {
                        const actions = collectedActions.get(group) ?? [];
                        actions.push(action);
                        collectedActions.set(group, actions);
                    },
                });
                for (const [group, actions] of collectedActions.entries()) {
                    allActions.push([group, actions]);
                }
            }
            allActions.sort((a, b) => a[0].localeCompare(b[0]));
            const menuActions = menu.getActions({
                arg: { lineNumber, uri: model.uri },
                shouldForwardArgs: true,
            });
            allActions.push(...menuActions);
            // if the current editor selections do not contain the target line number,
            // set the selection to the clicked line number
            if (e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) {
                const currentSelections = this.editor.getSelections();
                const lineRange = {
                    startLineNumber: lineNumber,
                    endLineNumber: lineNumber,
                    startColumn: 1,
                    endColumn: model.getLineLength(lineNumber) + 1,
                };
                const containsSelection = currentSelections?.some((selection) => !selection.isEmpty() && selection.intersectRanges(lineRange) !== null);
                if (!containsSelection) {
                    this.editor.setSelection(lineRange, "api" /* TextEditorSelectionSource.PROGRAMMATIC */);
                }
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.event,
                getActions: () => Separator.join(...allActions.map((a) => a[1])),
                onHide: () => menu.dispose(),
            });
        });
    }
};
EditorLineNumberContextMenu = __decorate([
    __param(1, IContextMenuService),
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], EditorLineNumberContextMenu);
export { EditorLineNumberContextMenu };
registerEditorContribution(EditorLineNumberContextMenu.ID, EditorLineNumberContextMenu, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTGluZU51bWJlck1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZWRpdG9yTGluZU51bWJlck1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFNakUsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxHQUdOLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQVMzRSxNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBQ1MsdUNBQWtDLEdBQWlDLElBQUksR0FBRyxFQUFFLENBQUE7SUFzQnJGLENBQUM7SUFwQkE7Ozs7O09BS0c7SUFDSSw4QkFBOEIsQ0FDcEMsc0JBQStDO1FBRS9DLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNuRSxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsa0NBQWtDLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENB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