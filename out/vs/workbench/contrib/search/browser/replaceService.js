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
var ReplaceService_1;
import * as nls from '../../../../nls.js';
import * as network from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IReplaceService } from './replace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditOperation, } from '../../../../editor/common/core/editOperation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { dirname } from '../../../../base/common/resources.js';
import { Promises } from '../../../../base/common/async.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { isSearchTreeFileMatch, isSearchTreeMatch, } from './searchTreeModel/searchTreeCommon.js';
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
const REPLACE_PREVIEW = 'replacePreview';
const toReplaceResource = (fileResource) => {
    return fileResource.with({
        scheme: network.Schemas.internal,
        fragment: REPLACE_PREVIEW,
        query: JSON.stringify({ scheme: fileResource.scheme }),
    });
};
const toFileResource = (replaceResource) => {
    return replaceResource.with({
        scheme: JSON.parse(replaceResource.query)['scheme'],
        fragment: '',
        query: '',
    });
};
let ReplacePreviewContentProvider = class ReplacePreviewContentProvider {
    static { this.ID = 'workbench.contrib.replacePreviewContentProvider'; }
    constructor(instantiationService, textModelResolverService) {
        this.instantiationService = instantiationService;
        this.textModelResolverService = textModelResolverService;
        this.textModelResolverService.registerTextModelContentProvider(network.Schemas.internal, this);
    }
    provideTextContent(uri) {
        if (uri.fragment === REPLACE_PREVIEW) {
            return this.instantiationService.createInstance(ReplacePreviewModel).resolve(uri);
        }
        return null;
    }
};
ReplacePreviewContentProvider = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextModelService)
], ReplacePreviewContentProvider);
export { ReplacePreviewContentProvider };
let ReplacePreviewModel = class ReplacePreviewModel extends Disposable {
    constructor(modelService, languageService, textModelResolverService, replaceService, searchWorkbenchService) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this.textModelResolverService = textModelResolverService;
        this.replaceService = replaceService;
        this.searchWorkbenchService = searchWorkbenchService;
    }
    async resolve(replacePreviewUri) {
        const fileResource = toFileResource(replacePreviewUri);
        const fileMatch = (this.searchWorkbenchService.searchModel.searchResult
            .matches(false)
            .filter((match) => match.resource.toString() === fileResource.toString())[0]);
        const ref = this._register(await this.textModelResolverService.createModelReference(fileResource));
        const sourceModel = ref.object.textEditorModel;
        const sourceModelLanguageId = sourceModel.getLanguageId();
        const replacePreviewModel = this.modelService.createModel(createTextBufferFactoryFromSnapshot(sourceModel.createSnapshot()), this.languageService.createById(sourceModelLanguageId), replacePreviewUri);
        this._register(fileMatch.onChange(({ forceUpdateModel }) => this.update(sourceModel, replacePreviewModel, fileMatch, forceUpdateModel)));
        this._register(this.searchWorkbenchService.searchModel.onReplaceTermChanged(() => this.update(sourceModel, replacePreviewModel, fileMatch)));
        this._register(fileMatch.onDispose(() => replacePreviewModel.dispose())); // TODO@Sandeep we should not dispose a model directly but rather the reference (depends on https://github.com/microsoft/vscode/issues/17073)
        this._register(replacePreviewModel.onWillDispose(() => this.dispose()));
        this._register(sourceModel.onWillDispose(() => this.dispose()));
        return replacePreviewModel;
    }
    update(sourceModel, replacePreviewModel, fileMatch, override = false) {
        if (!sourceModel.isDisposed() && !replacePreviewModel.isDisposed()) {
            this.replaceService.updateReplacePreview(fileMatch, override);
        }
    }
};
ReplacePreviewModel = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ITextModelService),
    __param(3, IReplaceService),
    __param(4, ISearchViewModelWorkbenchService)
], ReplacePreviewModel);
let ReplaceService = class ReplaceService {
    static { ReplaceService_1 = this; }
    static { this.REPLACE_SAVE_SOURCE = SaveSourceRegistry.registerSource('searchReplace.source', nls.localize('searchReplace.source', 'Search and Replace')); }
    constructor(textFileService, editorService, textModelResolverService, bulkEditorService, labelService, notebookEditorModelResolverService) {
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.textModelResolverService = textModelResolverService;
        this.bulkEditorService = bulkEditorService;
        this.labelService = labelService;
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
    }
    async replace(arg, progress = undefined, resource = null) {
        const edits = this.createEdits(arg, resource);
        await this.bulkEditorService.apply(edits, { progress });
        const rawTextPromises = edits.map(async (e) => {
            if (e.resource.scheme === network.Schemas.vscodeNotebookCell) {
                const notebookResource = CellUri.parse(e.resource)?.notebook;
                if (notebookResource) {
                    let ref;
                    try {
                        ref = await this.notebookEditorModelResolverService.resolve(notebookResource);
                        await ref.object.save({ source: ReplaceService_1.REPLACE_SAVE_SOURCE });
                    }
                    finally {
                        ref?.dispose();
                    }
                }
                return;
            }
            else {
                return this.textFileService.files
                    .get(e.resource)
                    ?.save({ source: ReplaceService_1.REPLACE_SAVE_SOURCE });
            }
        });
        return Promises.settled(rawTextPromises);
    }
    async openReplacePreview(element, preserveFocus, sideBySide, pinned) {
        const fileMatch = isSearchTreeMatch(element) ? element.parent() : element;
        const editor = await this.editorService.openEditor({
            original: { resource: fileMatch.resource },
            modified: { resource: toReplaceResource(fileMatch.resource) },
            label: nls.localize('fileReplaceChanges', '{0} ↔ {1} (Replace Preview)', fileMatch.name(), fileMatch.name()),
            description: this.labelService.getUriLabel(dirname(fileMatch.resource), { relative: true }),
            options: {
                preserveFocus,
                pinned,
                revealIfVisible: true,
            },
        });
        const input = editor?.input;
        const disposable = fileMatch.onDispose(() => {
            input?.dispose();
            disposable.dispose();
        });
        await this.updateReplacePreview(fileMatch);
        if (editor) {
            const editorControl = editor.getControl();
            if (isSearchTreeMatch(element) && editorControl) {
                editorControl.revealLineInCenter(element.range().startLineNumber, 1 /* ScrollType.Immediate */);
            }
        }
    }
    async updateReplacePreview(fileMatch, override = false) {
        const replacePreviewUri = toReplaceResource(fileMatch.resource);
        const [sourceModelRef, replaceModelRef] = await Promise.all([
            this.textModelResolverService.createModelReference(fileMatch.resource),
            this.textModelResolverService.createModelReference(replacePreviewUri),
        ]);
        const sourceModel = sourceModelRef.object.textEditorModel;
        const replaceModel = replaceModelRef.object.textEditorModel;
        // If model is disposed do not update
        try {
            if (sourceModel && replaceModel) {
                if (override) {
                    replaceModel.setValue(sourceModel.getValue());
                }
                else {
                    replaceModel.undo();
                }
                this.applyEditsToPreview(fileMatch, replaceModel);
            }
        }
        finally {
            sourceModelRef.dispose();
            replaceModelRef.dispose();
        }
    }
    applyEditsToPreview(fileMatch, replaceModel) {
        const resourceEdits = this.createEdits(fileMatch, replaceModel.uri);
        const modelEdits = [];
        for (const resourceEdit of resourceEdits) {
            modelEdits.push(EditOperation.replaceMove(Range.lift(resourceEdit.textEdit.range), resourceEdit.textEdit.text));
        }
        replaceModel.pushEditOperations([], modelEdits.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range)), () => []);
    }
    createEdits(arg, resource = null) {
        const edits = [];
        if (isSearchTreeMatch(arg)) {
            if (!arg.isReadonly) {
                if (isIMatchInNotebook(arg)) {
                    // only apply edits if it's not a webview match, since webview matches are read-only
                    const match = arg;
                    edits.push(this.createEdit(match, match.replaceString, match.cell?.uri));
                }
                else {
                    const match = arg;
                    edits.push(this.createEdit(match, match.replaceString, resource));
                }
            }
        }
        if (isSearchTreeFileMatch(arg)) {
            arg = [arg];
        }
        if (arg instanceof Array) {
            arg.forEach((element) => {
                const fileMatch = element;
                if (fileMatch.count() > 0) {
                    edits.push(...fileMatch.matches().flatMap((match) => this.createEdits(match, resource)));
                }
            });
        }
        return edits;
    }
    createEdit(match, text, resource = null) {
        const fileMatch = match.parent();
        return new ResourceTextEdit(resource ?? fileMatch.resource, { range: match.range(), text }, undefined, undefined);
    }
};
ReplaceService = ReplaceService_1 = __decorate([
    __param(0, ITextFileService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IBulkEditService),
    __param(4, ILabelService),
    __param(5, INotebookEditorModelResolverService)
], ReplaceService);
export { ReplaceService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9yZXBsYWNlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFdkcsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBSTlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsYUFBYSxF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