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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUdOLHNCQUFzQixFQUN0QixnQkFBZ0IsR0FDaEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBR04sWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVwRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTlGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHN0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUE7QUFFbkQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsNkJBQTZCLENBQUE7QUFFcEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FDN0Qsd0JBQXdCLEVBQ3hCLElBQUksRUFDSjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSw0Q0FBNEMsQ0FBQztDQUM3RixDQUNELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxvQkFBb0IsRUFBRSxJQUFJLEVBQUU7SUFDL0YsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixvQkFBb0IsRUFDcEIsMkZBQTJGLENBQzNGO0NBQ0QsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxhQUFhLENBQVUsMEJBQTBCLEVBQUUsS0FBSyxFQUFFO0lBQ2xHLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsMEJBQTBCLEVBQzFCLHlEQUF5RCxDQUN6RDtDQUNELENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLElBQUksYUFBYSxDQUMvRCwwQkFBMEIsRUFDMUIsS0FBSyxFQUNMO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQiwwQkFBMEIsRUFDMUIsMERBQTBELENBQzFEO0NBQ0QsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsK0JBQStCLENBQUMsU0FBUyxFQUFFLENBQUE7QUFDMUYsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsSUFBSSxhQUFhLENBQ3JFLGdDQUFnQyxFQUNoQyxLQUFLLEVBQ0w7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdDQUFnQyxFQUNoQyxtRUFBbUUsQ0FDbkU7Q0FDRCxDQUNELENBQUE7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLElBQUksYUFBYSxDQUN6RSxvQ0FBb0MsRUFDcEMsRUFBRSxDQUNGLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSx3QkFBd0IsRUFBRSxLQUFLLEVBQUU7SUFDOUYsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQix3QkFBd0IsRUFDeEIsOERBQThELENBQzlEO0NBQ0QsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsS0FBSyxFQUFFO0lBQzNGLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIscUJBQXFCLEVBQ3JCLG1FQUFtRSxDQUNuRTtDQUNELENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLElBQUksYUFBYSxDQUMvRCxpQ0FBaUMsRUFDakMsS0FBSyxFQUNMO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixpQ0FBaUMsRUFDakMsbUVBQW1FLENBQ25FO0NBQ0QsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQVUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFO0lBQ2pHLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxrREFBa0QsQ0FBQztDQUMvRixDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxrQkFBa0IsRUFBRSxJQUFJLEVBQUU7SUFDN0YsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNEQUFzRCxDQUFDO0NBQ2pHLENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLElBQUksRUFBRTtJQUM5RixJQUFJLEVBQUUsU0FBUztJQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHNCQUFzQixFQUN0QixxREFBcUQsQ0FDckQ7Q0FDRCxDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGFBQWEsQ0FDMUQsNEJBQTRCLEVBQzVCLEtBQUssRUFDTDtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNEJBQTRCLEVBQzVCLGtFQUFrRSxDQUNsRTtDQUNELENBQ0QsQ0FBQTtBQUVELG1CQUFtQjtBQUNuQixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsZ0NBQWdDLEVBQ2hDLElBQUksRUFDSjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0NBQWdDLEVBQ2hDLG9FQUFvRSxDQUNwRTtDQUNELENBQ0QsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLElBQUksYUFBYSxDQUNuRSxxQ0FBcUMsRUFDckMsSUFBSSxFQUNKO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixxQ0FBcUMsRUFDckMsaUZBQWlGLENBQ2pGO0NBQ0QsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxhQUFhLENBQ2xFLG9DQUFvQyxFQUNwQyxJQUFJLEVBQ0o7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9DQUFvQyxFQUNwQyxnRkFBZ0YsQ0FDaEY7Q0FDRCxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyxJQUFJLGFBQWEsQ0FDckUsNEJBQTRCLEVBQzVCLEtBQUssRUFDTDtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNEJBQTRCLEVBQzVCLDZFQUE2RSxDQUM3RTtDQUNELENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQzVELHlCQUF5QixFQUN6QiwyQkFBMkIsRUFDM0IsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUMxQyxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDdkQseUJBQXlCLEVBQ3pCLHNCQUFzQixFQUN0QixjQUFjLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQzFDLENBQUE7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLHdDQUF3QyxDQUFBO0FBRTNFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcseUNBQXlDLENBQUE7QUFFN0U7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRywwQ0FBMEMsQ0FBQTtBQUUvRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFBO0FBeUN2RCxNQUFNLENBQU4sSUFBa0IsU0FPakI7QUFQRCxXQUFrQixTQUFTO0lBQzFCLGdDQUFtQixDQUFBO0lBQ25CLDRCQUFlLENBQUE7SUFDZixzQ0FBeUIsQ0FBQTtJQUN6QiwwQkFBYSxDQUFBO0lBQ2Isa0NBQXFCLENBQUE7SUFDckIsb0RBQXVDLENBQUE7QUFDeEMsQ0FBQyxFQVBpQixTQUFTLEtBQVQsU0FBUyxRQU8xQjtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMsdUNBQW1CLENBQUE7SUFDbkIsdUNBQW1CLENBQUE7SUFDbkIsbUNBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJakM7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBS2pCO0FBTEQsV0FBa0Isb0JBQW9CO0lBQ3JDLDJDQUFtQixDQUFBO0lBQ25CLHVDQUFlLENBQUE7SUFDZix1Q0FBZSxDQUFBO0lBQ2YsMkNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBS3JDO0FBUU0sSUFBTSx1QkFBdUIsK0JBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUd0RCxZQUNtQixlQUFrRCxFQUN0RCxXQUEwQyxFQUN0QyxlQUFrRCxFQUNyRCxZQUE0QztRQUUzRCxLQUFLLEVBQUUsQ0FBQTtRQUw0QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDckMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDckIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3BDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBTjNDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFTaEYsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNoQixRQUFhLEVBQ2IsTUFBYyxFQUNkLEtBQWEsRUFDYixhQUE2QixFQUM3QixPQUE0QjtRQUU1QixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7WUFDOUIsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLHlCQUF1QixDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRTtZQUNwRixRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUU7WUFDdEIsS0FBSztZQUNMLE9BQU87U0FDUCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxRQUFhO1FBQzlELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztZQUNwQixNQUFNO1lBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3pFLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxNQUFNLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUM5QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXBELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JCLG1GQUFtRjtZQUNuRixrQ0FBa0M7WUFDbEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyx5QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU5RSxpREFBaUQ7UUFDakQsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFL0Qsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN6QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQTtZQUM5QyxXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixpQ0FBeUIsRUFBRSxDQUFDO29CQUNqRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBLENBQUMscUNBQXFDO2dCQUM5RyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ3JCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQ25GLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sZUFBZSxDQUFBO0lBQ3ZCLENBQUM7SUFJTyxLQUFLLENBQUMsa0JBQWtCLENBQy9CLFFBQWEsRUFDYixpQkFBMEIsSUFBSTtRQUU5QixNQUFNLGlCQUFpQixHQUFHLHlCQUF1QixDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV4RSxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxRCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUQsQ0FBQzthQUFNLElBQUksY0FBYyxFQUFFLENBQUM7WUFDM0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUVuRSxJQUFJLGdCQUFvQyxDQUFBO1lBQ3hDLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLDJCQUEyQixDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUVELGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0NBQ0QsQ0FBQTtBQXRHWSx1QkFBdUI7SUFJakMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxhQUFhLENBQUE7R0FQSCx1QkFBdUIsQ0FzR25DOztBQUVELE1BQU0sT0FBTyxVQUFVO2FBRVAsWUFBTyxHQUFHLENBQUMsQ0FBQTtJQUUxQixZQUNTLE9BQW9CLEVBQ3BCLE1BQW9CO1FBRHBCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsV0FBTSxHQUFOLE1BQU0sQ0FBYztRQUU1QixJQUFJLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLGNBQWMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUE7SUFDL0MsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3pELGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLE9BQU87U0FDM0MsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyJ9