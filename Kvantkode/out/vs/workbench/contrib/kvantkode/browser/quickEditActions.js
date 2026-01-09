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
