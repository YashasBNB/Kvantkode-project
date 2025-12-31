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
import { PauseableEmitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidget } from '../../../notebook/browser/notebookEditorWidget.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource, isSearchTreeMatch, isTextSearchHeading, mergeSearchResultEvents, SEARCH_RESULT_PREFIX, } from './searchTreeCommon.js';
import { PlainTextSearchHeadingImpl } from './textSearchHeading.js';
import { AITextSearchHeadingImpl } from '../AISearch/aiSearchModel.js';
let SearchResultImpl = class SearchResultImpl extends Disposable {
    constructor(searchModel, instantiationService, modelService, notebookEditorService) {
        super();
        this.searchModel = searchModel;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.notebookEditorService = notebookEditorService;
        this._onChange = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents,
        }));
        this.onChange = this._onChange.event;
        this._plainTextSearchResult = this._register(this.instantiationService.createInstance(PlainTextSearchHeadingImpl, this));
        this._aiTextSearchResult = this._register(this.instantiationService.createInstance(AITextSearchHeadingImpl, this));
        this._register(this._plainTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this._register(this._aiTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this.modelService.getModels().forEach((model) => this.onModelAdded(model));
        this._register(this.modelService.onModelAdded((model) => this.onModelAdded(model)));
        this._register(this.notebookEditorService.onDidAddNotebookEditor((widget) => {
            if (widget instanceof NotebookEditorWidget) {
                this.onDidAddNotebookEditorWidget(widget);
            }
        }));
        this._id = SEARCH_RESULT_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    get plainTextSearchResult() {
        return this._plainTextSearchResult;
    }
    get aiTextSearchResult() {
        return this._aiTextSearchResult;
    }
    get children() {
        return this.textSearchResults;
    }
    get hasChildren() {
        return true; // should always have a Text Search Result for plain results.
    }
    get textSearchResults() {
        return [this._plainTextSearchResult, this._aiTextSearchResult];
    }
    async batchReplace(elementsToReplace) {
        try {
            this._onChange.pause();
            await Promise.all(elementsToReplace.map(async (elem) => {
                const parent = elem.parent();
                if ((isSearchTreeFolderMatch(parent) || isSearchTreeFileMatch(parent)) &&
                    arrayContainsElementOrParent(parent, elementsToReplace)) {
                    // skip any children who have parents in the array
                    return;
                }
                if (isSearchTreeFileMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeFolderMatch(elem)) {
                    await elem.replaceAll();
                }
            }));
        }
        finally {
            this._onChange.resume();
        }
    }
    batchRemove(elementsToRemove) {
        // need to check that we aren't trying to remove elements twice
        const removedElems = [];
        try {
            this._onChange.pause();
            elementsToRemove.forEach((currentElement) => {
                if (!arrayContainsElementOrParent(currentElement, removedElems)) {
                    if (isTextSearchHeading(currentElement)) {
                        currentElement.hide();
                    }
                    else if (!isSearchTreeFolderMatch(currentElement) ||
                        isSearchTreeFolderMatchWithResource(currentElement)) {
                        if (isSearchTreeFileMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeFolderMatchWithResource(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        removedElems.push(currentElement);
                    }
                }
            });
        }
        finally {
            this._onChange.resume();
        }
    }
    get isDirty() {
        return this._aiTextSearchResult.isDirty || this._plainTextSearchResult.isDirty;
    }
    get query() {
        return this._plainTextSearchResult.query;
    }
    set query(query) {
        this._plainTextSearchResult.query = query;
    }
    setAIQueryUsingTextQuery(query) {
        if (!query) {
            query = this.query;
        }
        this.aiTextSearchResult.query = aiTextQueryFromTextQuery(query);
    }
    onDidAddNotebookEditorWidget(widget) {
        this._onWillChangeModelListener?.dispose();
        this._onWillChangeModelListener = widget.onWillChangeModel((model) => {
            if (model) {
                this.onNotebookEditorWidgetRemoved(widget, model?.uri);
            }
        });
        this._onDidChangeModelListener?.dispose();
        // listen to view model change as we are searching on both inputs and outputs
        this._onDidChangeModelListener = widget.onDidAttachViewModel(() => {
            if (widget.hasModel()) {
                this.onNotebookEditorWidgetAdded(widget, widget.textModel.uri);
            }
        });
    }
    folderMatches(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.folderMatches();
        }
        return this._plainTextSearchResult.folderMatches();
    }
    onModelAdded(model) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(model.uri);
        folderMatch?.bindModel(model);
    }
    async onNotebookEditorWidgetAdded(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        await folderMatch?.bindNotebookEditorWidget(editor, resource);
    }
    onNotebookEditorWidgetRemoved(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        folderMatch?.unbindNotebookEditorWidget(editor, resource);
    }
    add(allRaw, searchInstanceID, ai, silent = false) {
        this._plainTextSearchResult.hidden = false;
        if (ai) {
            this._aiTextSearchResult.hidden = false;
        }
        if (ai) {
            this._aiTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
        else {
            this._plainTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
    }
    clear() {
        this._plainTextSearchResult.clear();
        this._aiTextSearchResult.clear();
    }
    remove(matches, ai = false) {
        if (ai) {
            this._aiTextSearchResult.remove(matches, ai);
        }
        this._plainTextSearchResult.remove(matches, ai);
    }
    replace(match) {
        return this._plainTextSearchResult.replace(match);
    }
    matches(ai) {
        if (ai === undefined) {
            return this._plainTextSearchResult.matches().concat(this._aiTextSearchResult.matches());
        }
        else if (ai === true) {
            return this._aiTextSearchResult.matches();
        }
        return this._plainTextSearchResult.matches();
    }
    isEmpty() {
        return this._plainTextSearchResult.isEmpty() && this._aiTextSearchResult.isEmpty();
    }
    fileCount() {
        return this._plainTextSearchResult.fileCount() + this._aiTextSearchResult.fileCount();
    }
    count() {
        return this._plainTextSearchResult.count() + this._aiTextSearchResult.count();
    }
    setCachedSearchComplete(cachedSearchComplete, ai) {
        if (ai) {
            this._aiTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
        else {
            this._plainTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
    }
    getCachedSearchComplete(ai) {
        if (ai) {
            return this._aiTextSearchResult.cachedSearchComplete;
        }
        return this._plainTextSearchResult.cachedSearchComplete;
    }
    toggleHighlights(value, ai = false) {
        if (ai) {
            this._aiTextSearchResult.toggleHighlights(value);
        }
        else {
            this._plainTextSearchResult.toggleHighlights(value);
        }
    }
    getRangeHighlightDecorations(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.rangeHighlightDecorations;
        }
        return this._plainTextSearchResult.rangeHighlightDecorations;
    }
    replaceAll(progress) {
        return this._plainTextSearchResult.replaceAll(progress);
    }
    async dispose() {
        this._aiTextSearchResult?.dispose();
        this._plainTextSearchResult?.dispose();
        this._onWillChangeModelListener?.dispose();
        this._onDidChangeModelListener?.dispose();
        super.dispose();
    }
};
SearchResultImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, INotebookEditorService)
], SearchResultImpl);
export { SearchResultImpl };
function aiTextQueryFromTextQuery(query) {
    return query === null
        ? null
        : { ...query, contentPattern: query.contentPattern.pattern, type: 3 /* QueryType.aiText */ };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL3NlYXJjaFJlc3VsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFHakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBUXBHLE9BQU8sRUFDTiw0QkFBNEIsRUFPNUIscUJBQXFCLEVBQ3JCLHVCQUF1QixFQUN2QixtQ0FBbUMsRUFDbkMsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUVuQix1QkFBdUIsRUFFdkIsb0JBQW9CLEdBQ3BCLE1BQU0sdUJBQXVCLENBQUE7QUFHOUIsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFL0QsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBYS9DLFlBQ2lCLFdBQXlCLEVBQ2xCLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUNuQyxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUE7UUFMUyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQWhCL0UsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pDLElBQUksZ0JBQWdCLENBQWU7WUFDbEMsS0FBSyxFQUFFLHVCQUF1QjtTQUM5QixDQUFDLENBQ0YsQ0FBQTtRQUNRLGFBQVEsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUE7UUFjNUQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzNDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQzFFLENBQUE7UUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDeEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FDdkUsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWhGLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDMUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM1RCxJQUFJLE1BQU0sWUFBWSxvQkFBb0IsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsNEJBQTRCLENBQXVCLE1BQU0sQ0FBQyxDQUFBO1lBQ2hFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDeEQsQ0FBQztJQUVELEVBQUU7UUFDRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQUkscUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFBLENBQUMsNkRBQTZEO0lBQzFFLENBQUM7SUFDRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFvQztRQUN0RCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3RCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUU1QixJQUNDLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUkscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2xFLDRCQUE0QixDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUN0RCxDQUFDO29CQUNGLGtEQUFrRDtvQkFDbEQsT0FBTTtnQkFDUCxDQUFDO2dCQUVELElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO3FCQUFNLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDcEMsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO3FCQUFNLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7Z0JBQ3hCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxnQkFBbUM7UUFDOUMsK0RBQStEO1FBQy9ELE1BQU0sWUFBWSxHQUFzQixFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN0QixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDO29CQUNqRSxJQUFJLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7d0JBQ3pDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDdEIsQ0FBQzt5QkFBTSxJQUNOLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDO3dCQUN4QyxtQ0FBbUMsQ0FBQyxjQUFjLENBQUMsRUFDbEQsQ0FBQzt3QkFDRixJQUFJLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7NEJBQzNDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7d0JBQy9DLENBQUM7NkJBQU0sSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDOzRCQUM5QyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO3dCQUMvQyxDQUFDOzZCQUFNLElBQUksbUNBQW1DLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQzs0QkFDaEUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTt3QkFDL0MsQ0FBQzt3QkFDRCxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO29CQUNsQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQTtJQUMvRSxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUF3QjtRQUNqQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtJQUMxQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsS0FBeUI7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDbkIsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVPLDRCQUE0QixDQUFDLE1BQTRCO1FBQ2hFLElBQUksQ0FBQywwQkFBMEIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDcEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDekMsNkVBQTZFO1FBQzdFLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFO1lBQ2pFLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLEtBQWMsS0FBSztRQUNoQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDaEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFTyxZQUFZLENBQUMsS0FBaUI7UUFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRSxXQUFXLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCLENBQ3hDLE1BQTRCLEVBQzVCLFFBQWE7UUFFYixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxXQUFXLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxNQUE0QixFQUFFLFFBQWE7UUFDaEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFFLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELEdBQUcsQ0FBQyxNQUFvQixFQUFFLGdCQUF3QixFQUFFLEVBQVcsRUFBRSxTQUFrQixLQUFLO1FBQ3ZGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQzFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUN4QyxDQUFDO1FBRUQsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUNMLE9BR29ELEVBQ3BELEVBQUUsR0FBRyxLQUFLO1FBRVYsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFDRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsT0FBTyxDQUFDLEtBQTJCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsT0FBTyxDQUFDLEVBQVk7UUFDbkIsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7YUFBTSxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMxQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDN0MsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkYsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDdEYsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDOUUsQ0FBQztJQUVELHVCQUF1QixDQUFDLG9CQUFpRCxFQUFFLEVBQVc7UUFDckYsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtRQUNyRSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVELHVCQUF1QixDQUFDLEVBQVc7UUFDbEMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFBO1FBQ3JELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsS0FBYyxFQUFFLEtBQWMsS0FBSztRQUNuRCxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsS0FBYyxLQUFLO1FBQy9DLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMseUJBQXlCLENBQUE7SUFDN0QsQ0FBQztJQUVELFVBQVUsQ0FBQyxRQUFrQztRQUM1QyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN6QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNELENBQUE7QUE1UlksZ0JBQWdCO0lBZTFCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHNCQUFzQixDQUFBO0dBakJaLGdCQUFnQixDQTRSNUI7O0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxLQUF3QjtJQUN6RCxPQUFPLEtBQUssS0FBSyxJQUFJO1FBQ3BCLENBQUMsQ0FBQyxJQUFJO1FBQ04sQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksMEJBQWtCLEVBQUUsQ0FBQTtBQUN0RixDQUFDIn0=