/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { roundRangeToLines } from './sidebarActions.js';
import { VOID_CTRL_K_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IMetricsService } from '../common/metricsService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CTRL_K_ACTION_ID,
            f1: true,
            title: localize2('voidQuickEditAction', 'KvantKode: Quick Edit'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
                when: ContextKeyExpr.deserialize('editorFocus && !terminalFocus'),
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(ICodeEditorService);
        const metricsService = accessor.get(IMetricsService);
        metricsService.capture('Ctrl+K', {});
        const editor = editorService.getActiveCodeEditor();
        if (!editor)
            return;
        const model = editor.getModel();
        if (!model)
            return;
        const selection = roundRangeToLines(editor.getSelection(), { emptySelectionBehavior: 'line' });
        if (!selection)
            return;
        const { startLineNumber: startLine, endLineNumber: endLine } = selection;
        const editCodeService = accessor.get(IEditCodeService);
        editCodeService.addCtrlKZone({ startLine, endLine, editor });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tFZGl0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9xdWlja0VkaXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFrQnJGLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLHVCQUF1QixDQUFDO1lBQ2hFLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsaURBQTZCO2dCQUN0QyxNQUFNLDBDQUFnQztnQkFDdEMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUM7YUFDakU7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDdEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU07UUFDbkIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLO1lBQUUsT0FBTTtRQUNsQixNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTTtRQUV0QixNQUFNLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFBO1FBRXhFLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUM7Q0FDRCxDQUNELENBQUEifQ==