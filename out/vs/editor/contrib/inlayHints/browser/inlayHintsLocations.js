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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0xvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGF5SGludHMvYnJvd3Nlci9pbmxheUhpbnRzTG9jYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQy9FLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLHNCQUFzQixHQUN0QixNQUFNLDBDQUEwQyxDQUFBO0FBR2pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sV0FBVyxFQUNYLE1BQU0sRUFDTixjQUFjLEVBQ2QsWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEw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