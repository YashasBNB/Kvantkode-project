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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTGluZU51bWJlck1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9lZGl0b3JMaW5lTnVtYmVyTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQU1qRSxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEdBR04sTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBUzNFLE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFDUyx1Q0FBa0MsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQXNCckYsQ0FBQztJQXBCQTs7Ozs7T0FLRztJQUNJLDhCQUE4QixDQUNwQyxzQkFBK0M7UUFFL0MsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ25FLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxN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