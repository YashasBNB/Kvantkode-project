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
var TextFileContentProvider_1;
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService, } from '../../../../editor/common/languages/language.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { InputFocusedContextKey } from '../../../../platform/contextkey/common/contextkeys.js';
import { Event } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
/**
 * Explorer viewlet id.
 */
export const VIEWLET_ID = 'workbench.view.explorer';
/**
 * Explorer file view id.
 */
export const VIEW_ID = 'workbench.explorer.fileView';
/**
 * Context Keys to use with keybindings for the Explorer and Open Editors view
 */
export const ExplorerViewletVisibleContext = new RawContextKey('explorerViewletVisible', true, {
    type: 'boolean',
    description: localize('explorerViewletVisible', 'True when the EXPLORER viewlet is visible.'),
});
export const FoldersViewVisibleContext = new RawContextKey('foldersViewVisible', true, {
    type: 'boolean',
    description: localize('foldersViewVisible', 'True when the FOLDERS view (the file tree within the explorer view container) is visible.'),
});
export const ExplorerFolderContext = new RawContextKey('explorerResourceIsFolder', false, {
    type: 'boolean',
    description: localize('explorerResourceIsFolder', 'True when the focused item in the EXPLORER is a folder.'),
});
export const ExplorerResourceReadonlyContext = new RawContextKey('explorerResourceReadonly', false, {
    type: 'boolean',
    description: localize('explorerResourceReadonly', 'True when the focused item in the EXPLORER is read-only.'),
});
export const ExplorerResourceWritableContext = ExplorerResourceReadonlyContext.toNegated();
export const ExplorerResourceParentReadOnlyContext = new RawContextKey('explorerResourceParentReadonly', false, {
    type: 'boolean',
    description: localize('explorerResourceParentReadonly', "True when the focused item in the EXPLORER's parent is read-only."),
});
/**
 * Comma separated list of editor ids that can be used for the selected explorer resource.
 */
export const ExplorerResourceAvailableEditorIdsContext = new RawContextKey('explorerResourceAvailableEditorIds', '');
export const ExplorerRootContext = new RawContextKey('explorerResourceIsRoot', false, {
    type: 'boolean',
    description: localize('explorerResourceIsRoot', 'True when the focused item in the EXPLORER is a root folder.'),
});
export const ExplorerResourceCut = new RawContextKey('explorerResourceCut', false, {
    type: 'boolean',
    description: localize('explorerResourceCut', 'True when an item in the EXPLORER has been cut for cut and paste.'),
});
export const ExplorerResourceMoveableToTrash = new RawContextKey('explorerResourceMoveableToTrash', false, {
    type: 'boolean',
    description: localize('explorerResourceMoveableToTrash', 'True when the focused item in the EXPLORER can be moved to trash.'),
});
export const FilesExplorerFocusedContext = new RawContextKey('filesExplorerFocus', true, {
    type: 'boolean',
    description: localize('filesExplorerFocus', 'True when the focus is inside the EXPLORER view.'),
});
export const OpenEditorsFocusedContext = new RawContextKey('openEditorsFocus', true, {
    type: 'boolean',
    description: localize('openEditorsFocus', 'True when the focus is inside the OPEN EDITORS view.'),
});
export const ExplorerFocusedContext = new RawContextKey('explorerViewletFocus', true, {
    type: 'boolean',
    description: localize('explorerViewletFocus', 'True when the focus is inside the EXPLORER viewlet.'),
});
export const ExplorerFindProviderActive = new RawContextKey('explorerFindProviderActive', false, {
    type: 'boolean',
    description: localize('explorerFindProviderActive', 'True when the explorer tree is using the explorer find provider.'),
});
// compressed nodes
export const ExplorerCompressedFocusContext = new RawContextKey('explorerViewletCompressedFocus', true, {
    type: 'boolean',
    description: localize('explorerViewletCompressedFocus', 'True when the focused item in the EXPLORER view is a compact item.'),
});
export const ExplorerCompressedFirstFocusContext = new RawContextKey('explorerViewletCompressedFirstFocus', true, {
    type: 'boolean',
    description: localize('explorerViewletCompressedFirstFocus', "True when the focus is inside a compact item's first part in the EXPLORER view."),
});
export const ExplorerCompressedLastFocusContext = new RawContextKey('explorerViewletCompressedLastFocus', true, {
    type: 'boolean',
    description: localize('explorerViewletCompressedLastFocus', "True when the focus is inside a compact item's last part in the EXPLORER view."),
});
export const ViewHasSomeCollapsibleRootItemContext = new RawContextKey('viewHasSomeCollapsibleItem', false, {
    type: 'boolean',
    description: localize('viewHasSomeCollapsibleItem', 'True when a workspace in the EXPLORER view has some collapsible root child.'),
});
export const FilesExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, FilesExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
export const ExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, ExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
/**
 * Text file editor id.
 */
export const TEXT_FILE_EDITOR_ID = 'workbench.editors.files.textFileEditor';
/**
 * File editor input id.
 */
export const FILE_EDITOR_INPUT_ID = 'workbench.editors.files.fileEditorInput';
/**
 * Binary file editor id.
 */
export const BINARY_FILE_EDITOR_ID = 'workbench.editors.files.binaryFileEditor';
/**
 * Language identifier for binary files opened as text.
 */
export const BINARY_TEXT_FILE_MODE = 'code-text-binary';
export var SortOrder;
(function (SortOrder) {
    SortOrder["Default"] = "default";
    SortOrder["Mixed"] = "mixed";
    SortOrder["FilesFirst"] = "filesFirst";
    SortOrder["Type"] = "type";
    SortOrder["Modified"] = "modified";
    SortOrder["FoldersNestsFiles"] = "foldersNestsFiles";
})(SortOrder || (SortOrder = {}));
export var UndoConfirmLevel;
(function (UndoConfirmLevel) {
    UndoConfirmLevel["Verbose"] = "verbose";
    UndoConfirmLevel["Default"] = "default";
    UndoConfirmLevel["Light"] = "light";
})(UndoConfirmLevel || (UndoConfirmLevel = {}));
export var LexicographicOptions;
(function (LexicographicOptions) {
    LexicographicOptions["Default"] = "default";
    LexicographicOptions["Upper"] = "upper";
    LexicographicOptions["Lower"] = "lower";
    LexicographicOptions["Unicode"] = "unicode";
})(LexicographicOptions || (LexicographicOptions = {}));
let TextFileContentProvider = TextFileContentProvider_1 = class TextFileContentProvider extends Disposable {
    constructor(textFileService, fileService, languageService, modelService) {
        super();
        this.textFileService = textFileService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.fileWatcherDisposable = this._register(new MutableDisposable());
    }
    static async open(resource, scheme, label, editorService, options) {
        await editorService.openEditor({
            original: { resource: TextFileContentProvider_1.resourceToTextFile(scheme, resource) },
            modified: { resource },
            label,
            options,
        });
    }
    static resourceToTextFile(scheme, resource) {
        return resource.with({
            scheme,
            query: JSON.stringify({ scheme: resource.scheme, query: resource.query }),
        });
    }
    static textFileToResource(resource) {
        const { scheme, query } = JSON.parse(resource.query);
        return resource.with({ scheme, query });
    }
    async provideTextContent(resource) {
        if (!resource.query) {
            // We require the URI to use the `query` to transport the original scheme and query
            // as done by `resourceToTextFile`
            return null;
        }
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        // Make sure our text file is resolved up to date
        const codeEditorModel = await this.resolveEditorModel(resource);
        // Make sure to keep contents up to date when it changes
        if (!this.fileWatcherDisposable.value) {
            const disposables = new DisposableStore();
            this.fileWatcherDisposable.value = disposables;
            disposables.add(this.fileService.onDidFilesChange((changes) => {
                if (changes.contains(savedFileResource, 0 /* FileChangeType.UPDATED */)) {
                    this.resolveEditorModel(resource, false /* do not create if missing */); // update model when resource changes
                }
            }));
            if (codeEditorModel) {
                disposables.add(Event.once(codeEditorModel.onWillDispose)(() => this.fileWatcherDisposable.clear()));
            }
        }
        return codeEditorModel;
    }
    async resolveEditorModel(resource, createAsNeeded = true) {
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        const content = await this.textFileService.readStream(savedFileResource);
        let codeEditorModel = this.modelService.getModel(resource);
        if (codeEditorModel) {
            this.modelService.updateModel(codeEditorModel, content.value);
        }
        else if (createAsNeeded) {
            const textFileModel = this.modelService.getModel(savedFileResource);
            let languageSelector;
            if (textFileModel) {
                languageSelector = this.languageService.createById(textFileModel.getLanguageId());
            }
            else {
                languageSelector = this.languageService.createByFilepathOrFirstLine(savedFileResource);
            }
            codeEditorModel = this.modelService.createModel(content.value, languageSelector, resource);
        }
        return codeEditorModel;
    }
};
TextFileContentProvider = TextFileContentProvider_1 = __decorate([
    __param(0, ITextFileService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], TextFileContentProvider);
export { TextFileContentProvider };
export class OpenEditor {
    static { this.COUNTER = 0; }
    constructor(_editor, _group) {
        this._editor = _editor;
        this._group = _group;
        this.id = OpenEditor.COUNTER++;
    }
    get editor() {
        return this._editor;
    }
    get group() {
        return this._group;
    }
    get groupId() {
        return this._group.id;
    }
    getId() {
        return `openeditor:${this.groupId}:${this.id}`;
    }
    isPreview() {
        return !this._group.isPinned(this.editor);
    }
    isSticky() {
        return this._group.isSticky(this.editor);
    }
    getResource() {
        return EditorResourceAccessor.getOriginalUri(this.editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9jb21tb24vZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFHTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUdOLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRzdDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUFBO0FBRW5EOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLDZCQUE2QixDQUFBO0FBRXBEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQzdELHdCQUF3QixFQUN4QixJQUFJLEVBQ0o7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLFdB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