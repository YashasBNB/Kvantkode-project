/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../common/core/range.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { DefinitionAction, SymbolNavigationAction, SymbolNavigationAnchor, } from '../../gotoSymbol/browser/goToCommands.js';
import { PeekContext } from '../../peekView/browser/peekView.js';
import { isIMenuItem, MenuId, MenuItemAction, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
export async function showGoToContextMenu(accessor, editor, anchor, part) {
    const resolverService = accessor.get(ITextModelService);
    const contextMenuService = accessor.get(IContextMenuService);
    const commandService = accessor.get(ICommandService);
    const instaService = accessor.get(IInstantiationService);
    const notificationService = accessor.get(INotificationService);
    await part.item.resolve(CancellationToken.None);
    if (!part.part.location) {
        return;
    }
    const location = part.part.location;
    const menuActions = [];
    // from all registered (not active) context menu actions select those
    // that are a symbol navigation actions
    const filter = new Set(MenuRegistry.getMenuItems(MenuId.EditorContext).map((item) => isIMenuItem(item) ? item.command.id : generateUuid()));
    for (const delegate of SymbolNavigationAction.all()) {
        if (filter.has(delegate.desc.id)) {
            menuActions.push(new Action(delegate.desc.id, MenuItemAction.label(delegate.desc, { renderShortTitle: true }), undefined, true, async () => {
                const ref = await resolverService.createModelReference(location.uri);
                try {
                    const symbolAnchor = new SymbolNavigationAnchor(ref.object.textEditorModel, Range.getStartPosition(location.range));
                    const range = part.item.anchor.range;
                    await instaService.invokeFunction(delegate.runEditorCommand.bind(delegate), editor, symbolAnchor, range);
                }
                finally {
                    ref.dispose();
                }
            }));
        }
    }
    if (part.part.command) {
        const { command } = part.part;
        menuActions.push(new Separator());
        menuActions.push(new Action(command.id, command.title, undefined, true, async () => {
            try {
                await commandService.executeCommand(command.id, ...(command.arguments ?? []));
            }
            catch (err) {
                notificationService.notify({
                    severity: Severity.Error,
                    source: part.item.provider.displayName,
                    message: err,
                });
            }
        }));
    }
    // show context menu
    const useShadowDOM = editor.getOption(132 /* EditorOption.useShadowDOM */);
    contextMenuService.showContextMenu({
        domForShadowRoot: useShadowDOM ? (editor.getDomNode() ?? undefined) : undefined,
        getAnchor: () => {
            const box = dom.getDomNodePagePosition(anchor);
            return { x: box.left, y: box.top + box.height + 8 };
        },
        getActions: () => menuActions,
        onHide: () => {
            editor.focus();
        },
        autoSelectFirstItem: true,
    });
}
export async function goToDefinitionWithLocation(accessor, event, editor, location) {
    const resolverService = accessor.get(ITextModelService);
    const ref = await resolverService.createModelReference(location.uri);
    await editor.invokeWithinContext(async (accessor) => {
        const openToSide = event.hasSideBySideModifier;
        const contextKeyService = accessor.get(IContextKeyService);
        const isInPeek = PeekContext.inPeekEditor.getValue(contextKeyService);
        const canPeek = !openToSide && editor.getOption(93 /* EditorOption.definitionLinkOpensInPeek */) && !isInPeek;
        const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
        return action.run(accessor, new SymbolNavigationAnchor(ref.object.textEditorModel, Range.getStartPosition(location.range)), Range.lift(location.range));
    });
    ref.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0xvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHNMb2NhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUc5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsc0JBQXNCLEdBQ3RCLE1BQU0sMENBQTBDLENBQUE7QUFHakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixXQUFXLEVBQ1gsTUFBTSxFQUNOLGNBQWMsRUFDZCxZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0s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