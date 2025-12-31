/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { NotebookSetting } from '../../common/notebookCommon.js';
import { isNotebookEditorInput } from '../../common/notebookEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export class NotebookIndentUsingTabs extends Action2 {
    static { this.ID = 'notebook.action.indentUsingTabs'; }
    constructor() {
        super({
            id: NotebookIndentUsingTabs.ID,
            title: nls.localize('indentUsingTabs', 'Indent Using Tabs'),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, false, false);
    }
}
export class NotebookIndentUsingSpaces extends Action2 {
    static { this.ID = 'notebook.action.indentUsingSpaces'; }
    constructor() {
        super({
            id: NotebookIndentUsingSpaces.ID,
            title: nls.localize('indentUsingSpaces', 'Indent Using Spaces'),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, true, false);
    }
}
export class NotebookChangeTabDisplaySize extends Action2 {
    static { this.ID = 'notebook.action.changeTabDisplaySize'; }
    constructor() {
        super({
            id: NotebookChangeTabDisplaySize.ID,
            title: nls.localize('changeTabDisplaySize', 'Change Tab Display Size'),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, true, true);
    }
}
export class NotebookIndentationToSpacesAction extends Action2 {
    static { this.ID = 'notebook.action.convertIndentationToSpaces'; }
    constructor() {
        super({
            id: NotebookIndentationToSpacesAction.ID,
            title: nls.localize('convertIndentationToSpaces', 'Convert Indentation to Spaces'),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        convertNotebookIndentation(accessor, true);
    }
}
export class NotebookIndentationToTabsAction extends Action2 {
    static { this.ID = 'notebook.action.convertIndentationToTabs'; }
    constructor() {
        super({
            id: NotebookIndentationToTabsAction.ID,
            title: nls.localize('convertIndentationToTabs', 'Convert Indentation to Tabs'),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        convertNotebookIndentation(accessor, false);
    }
}
function changeNotebookIndentation(accessor, insertSpaces, displaySizeOnly) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const notebookEditorService = accessor.get(INotebookEditorService);
    const quickInputService = accessor.get(IQuickInputService);
    // keep this check here to pop on non-notebook actions
    const activeInput = editorService.activeEditorPane?.input;
    const isNotebook = isNotebookEditorInput(activeInput);
    if (!isNotebook) {
        return;
    }
    // get notebook editor to access all codeEditors
    const notebookEditor = notebookEditorService.retrieveExistingWidgetFromURI(activeInput.resource)?.value;
    if (!notebookEditor) {
        return;
    }
    const picks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
        id: n.toString(),
        label: n.toString(),
    }));
    // store the initial values of the configuration
    const initialConfig = configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations);
    const initialInsertSpaces = initialConfig['editor.insertSpaces'];
    // remove the initial values from the configuration
    delete initialConfig['editor.indentSize'];
    delete initialConfig['editor.tabSize'];
    delete initialConfig['editor.insertSpaces'];
    setTimeout(() => {
        quickInputService
            .pick(picks, {
            placeHolder: nls.localize({ key: 'selectTabWidth', comment: ['Tab corresponds to the tab key'] }, 'Select Tab Size for Current File'),
        })
            .then((pick) => {
            if (pick) {
                const pickedVal = parseInt(pick.label, 10);
                if (displaySizeOnly) {
                    configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                        ...initialConfig,
                        'editor.tabSize': pickedVal,
                        'editor.indentSize': pickedVal,
                        'editor.insertSpaces': initialInsertSpaces,
                    });
                }
                else {
                    configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                        ...initialConfig,
                        'editor.tabSize': pickedVal,
                        'editor.indentSize': pickedVal,
                        'editor.insertSpaces': insertSpaces,
                    });
                }
            }
        });
    }, 50 /* quick input is sensitive to being opened so soon after another */);
}
function convertNotebookIndentation(accessor, tabsToSpaces) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const logService = accessor.get(ILogService);
    const textModelService = accessor.get(ITextModelService);
    const notebookEditorService = accessor.get(INotebookEditorService);
    const bulkEditService = accessor.get(IBulkEditService);
    // keep this check here to pop on non-notebook
    const activeInput = editorService.activeEditorPane?.input;
    const isNotebook = isNotebookEditorInput(activeInput);
    if (!isNotebook) {
        return;
    }
    // get notebook editor to access all codeEditors
    const notebookTextModel = notebookEditorService.retrieveExistingWidgetFromURI(activeInput.resource)?.value?.textModel;
    if (!notebookTextModel) {
        return;
    }
    const disposable = new DisposableStore();
    try {
        Promise.all(notebookTextModel.cells.map(async (cell) => {
            const ref = await textModelService.createModelReference(cell.uri);
            disposable.add(ref);
            const textEditorModel = ref.object.textEditorModel;
            const modelOpts = cell.textModel?.getOptions();
            if (!modelOpts) {
                return;
            }
            const edits = getIndentationEditOperations(textEditorModel, modelOpts.tabSize, tabsToSpaces);
            bulkEditService.apply(edits, {
                label: nls.localize('convertIndentation', 'Convert Indentation'),
                code: 'undoredo.convertIndentation',
            });
        })).then(() => {
            // store the initial values of the configuration
            const initialConfig = configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations);
            const initialIndentSize = initialConfig['editor.indentSize'];
            const initialTabSize = initialConfig['editor.tabSize'];
            // remove the initial values from the configuration
            delete initialConfig['editor.indentSize'];
            delete initialConfig['editor.tabSize'];
            delete initialConfig['editor.insertSpaces'];
            configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                ...initialConfig,
                'editor.tabSize': initialTabSize,
                'editor.indentSize': initialIndentSize,
                'editor.insertSpaces': tabsToSpaces,
            });
            disposable.dispose();
        });
    }
    catch {
        logService.error('Failed to convert indentation to spaces for notebook cells.');
    }
}
function getIndentationEditOperations(model, tabSize, tabsToSpaces) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return [];
    }
    let spaces = '';
    for (let i = 0; i < tabSize; i++) {
        spaces += ' ';
    }
    const spacesRegExp = new RegExp(spaces, 'gi');
    const edits = [];
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        let lastIndentationColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (lastIndentationColumn === 0) {
            lastIndentationColumn = model.getLineMaxColumn(lineNumber);
        }
        if (lastIndentationColumn === 1) {
            continue;
        }
        const originalIndentationRange = new Range(lineNumber, 1, lineNumber, lastIndentationColumn);
        const originalIndentation = model.getValueInRange(originalIndentationRange);
        const newIndentation = tabsToSpaces
            ? originalIndentation.replace(/\t/gi, spaces)
            : originalIndentation.replace(spacesRegExp, '\t');
        edits.push(new ResourceTextEdit(model.uri, { range: originalIndentationRange, text: newIndentation }));
    }
    return edits;
}
registerAction2(NotebookIndentUsingSpaces);
registerAction2(NotebookIndentUsingTabs);
registerAction2(NotebookChangeTabDisplaySize);
registerAction2(NotebookIndentationToSpacesAction);
registerAction2(NotebookIndentationToTabsAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmRlbnRhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvbm90ZWJvb2tJbmRlbnRhdGlvbkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsT0FBTzthQUM1QixPQUFFLEdBQUcsaUNBQWlDLENBQUE7SUFFN0Q7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