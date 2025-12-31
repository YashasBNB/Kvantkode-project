/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction, } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
registerEditorAction(class FormatDocumentMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument.none',
            label: nls.localize2('formatDocument.label.multiple', 'Format Document'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasDocumentFormattingProvider.toNegated()),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const commandService = accessor.get(ICommandService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const notificationService = accessor.get(INotificationService);
        const dialogService = accessor.get(IDialogService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        const formatterCount = languageFeaturesService.documentFormattingEditProvider.all(model).length;
        if (formatterCount > 1) {
            return commandService.executeCommand('editor.action.formatDocument.multiple');
        }
        else if (formatterCount === 1) {
            return commandService.executeCommand('editor.action.formatDocument');
        }
        else if (model.isTooLargeForSyncing()) {
            notificationService.warn(nls.localize('too.large', 'This file cannot be formatted because it is too large'));
        }
        else {
            const langName = model.getLanguageId();
            const message = nls.localize('no.provider', "There is no formatter for '{0}' files installed.", langName);
            const { confirmed } = await dialogService.confirm({
                message,
                primaryButton: nls.localize({ key: 'install.formatter', comment: ['&& denotes a mnemonic'] }, '&&Install Formatter...'),
            });
            if (confirmed) {
                extensionsWorkbenchService.openSearch(`category:formatters ${langName}`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9uc05vbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9mb3JtYXQvYnJvd3Nlci9mb3JtYXRBY3Rpb25zTm9uZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUVwQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFakcsb0JBQW9CLENBQ25CLE1BQU0sNEJBQTZCLFNBQVEsWUFBWTtJQUN0RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0JBQStCLEVBQUUsaUJBQWlCLENBQUM7WUFDeEUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGlCQUFpQixDQUFDLFFBQVEsRUFDMUIsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLENBQzNEO1lBQ0QsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxlQUFlO2dCQUN6QyxPQUFPLEVBQUUsOENBQXlCLHdCQUFlO2dCQUNqRCxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsbURBQTZCLHdCQUFlLEVBQUU7Z0JBQ2hFLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFFdEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLE1BQU0sY0FBYyxHQUNuQix1QkFBdUIsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRXpFLElBQUksY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBO1FBQzlFLENBQUM7YUFBTSxJQUFJLGNBQWMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLGNBQWMsQ0FBQyxjQUFjLENBQUMsOEJBQThCLENBQUMsQ0FBQTtRQUNyRSxDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLG1CQUFtQixDQUFDLElBQUksQ0FDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsdURBQXVELENBQUMsQ0FDbEYsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3RDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzNCLGFBQWEsRUFDYixrREFBa0QsRUFDbEQsUUFBUSxDQUNSLENBQUE7WUFDRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNqRCxPQUFPO2dCQUNQLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUMxQixFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ2hFLHdCQUF3QixDQUN4QjthQUNELENBQUMsQ0FBQTtZQUNGLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsMEJBQTBCLENBQUMsVUFBVSxDQUFDLHVCQUF1QixRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9