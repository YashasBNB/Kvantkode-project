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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3JlcGxhY2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV2RyxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0sdURBQXVELENBQUE7QUFJOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUNOLGFBQWEsR0FFYixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxh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