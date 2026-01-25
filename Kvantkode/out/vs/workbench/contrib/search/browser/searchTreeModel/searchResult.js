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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hUcmVlTW9kZWwvc2VhcmNoUmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFRcEcsT0FBTyxFQUNOLDRCQUE0QixFQU81QixxQkFBcUIsRUFDckIsdUJBQXVCLEVBQ3ZCLG1DQUFtQyxFQUNuQyxpQkFBaUIsRUFDakIsbUJBQW1CLEVBRW5CLHVCQUF1QixFQUV2QixvQkFBb0IsR0FDcEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUc5QixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUvRCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFhL0MsWUFDaUIsV0FBeUIsRUFDbEIsb0JBQTRELEVBQ3BFLFlBQTRDLEVBQ25DLHFCQUE4RDtRQUV0RixLQUFLLEVBQUUsQ0FBQTtRQUxTLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ0QseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNsQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBaEIvRSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSxnQkFBZ0IsQ0FBZTtZQUNsQyxLQUFLLEVBQUUsdUJBQXVCO1NBQzlCLENBQUMsQ0FDRixDQUFBO1FBQ1EsYUFBUSxHQUF3QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtRQWM1RCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FDMUUsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUN2RSxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFaEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVuRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzVELElBQUksTUFBTSxZQUFZLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyw0QkFBNEIsQ0FBdUIsTUFBTSxDQUFDLENBQUE7WUFDaEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLG9CQUFvQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsRUFBRTtRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQixDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUEsQ0FBQyw2REFBNkQ7SUFDMUUsQ0FBQztJQUNELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQW9DO1FBQ3RELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDdEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixpQkFBaUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7Z0JBRTVCLElBQ0MsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbEUsNEJBQTRCLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLEVBQ3RELENBQUM7b0JBQ0Ysa0RBQWtEO29CQUNsRCxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNqQyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7cUJBQU0sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNwQyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7cUJBQU0sSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMxQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLGdCQUFtQztRQUM5QywrREFBK0Q7UUFDL0QsTUFBTSxZQUFZLEdBQXNCLEVBQUUsQ0FBQTtRQUUxQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3RCLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO2dCQUMzQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ2pFLElBQUksbUJBQW1CLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQzt3QkFDekMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO29CQUN0QixDQUFDO3lCQUFNLElBQ04sQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUM7d0JBQ3hDLG1DQUFtQyxDQUFDLGNBQWMsQ0FBQyxFQUNsRCxDQUFDO3dCQUNGLElBQUkscUJBQXFCLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQzs0QkFDM0MsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTt3QkFDL0MsQ0FBQzs2QkFBTSxJQUFJLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7NEJBQzlDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7d0JBQy9DLENBQUM7NkJBQU0sSUFBSSxtQ0FBbUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDOzRCQUNoRSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO3dCQUMvQyxDQUFDO3dCQUNELFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBQ2xDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFBO0lBQy9FLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7SUFDekMsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQXdCO1FBQ2pDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQzFDLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxLQUF5QjtRQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUNuQixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU8sNEJBQTRCLENBQUMsTUFBNEI7UUFDaEUsSUFBSSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN6Qyw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLHlCQUF5QixHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDakUsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQy9ELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsS0FBYyxLQUFLO1FBQ2hDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDbkQsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFpQjtRQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNFLFdBQVcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVPLEtBQUssQ0FBQywyQkFBMkIsQ0FDeEMsTUFBNEIsRUFDNUIsUUFBYTtRQUViLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxRSxNQUFNLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVPLDZCQUE2QixDQUFDLE1BQTRCLEVBQUUsUUFBYTtRQUNoRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUUsV0FBVyxFQUFFLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsR0FBRyxDQUFDLE1BQW9CLEVBQUUsZ0JBQXdCLEVBQUUsRUFBVyxFQUFFLFNBQWtCLEtBQUs7UUFDdkYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDMUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0QsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRSxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxNQUFNLENBQ0wsT0FHb0QsRUFDcEQsRUFBRSxHQUFHLEtBQUs7UUFFVixJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2hELENBQUM7SUFFRCxPQUFPLENBQUMsS0FBMkI7UUFDbEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxPQUFPLENBQUMsRUFBWTtRQUNuQixJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDeEYsQ0FBQzthQUFNLElBQUksRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzFDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuRixDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUN0RixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsdUJBQXVCLENBQUMsb0JBQWlELEVBQUUsRUFBVztRQUNyRixJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFBO1FBQ3JFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFBO1FBQ3hFLENBQUM7SUFDRixDQUFDO0lBRUQsdUJBQXVCLENBQUMsRUFBVztRQUNsQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLENBQUE7UUFDckQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFBO0lBQ3hELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxLQUFjLEVBQUUsS0FBYyxLQUFLO1FBQ25ELElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxLQUFjLEtBQUs7UUFDL0MsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLHlCQUF5QixDQUFBO1FBQzFELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsVUFBVSxDQUFDLFFBQWtDO1FBQzVDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDMUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3pDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQTVSWSxnQkFBZ0I7SUFlMUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsc0JBQXNCLENBQUE7R0FqQlosZ0JBQWdCLENBNFI1Qjs7QUFFRCxTQUFTLHdCQUF3QixDQUFDLEtBQXdCO0lBQ3pELE9BQU8sS0FBSyxLQUFLLElBQUk7UUFDcEIsQ0FBQyxDQUFDLElBQUk7UUFDTixDQUFDLENBQUMsRUFBRSxHQUFHLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSwwQkFBa0IsRUFBRSxDQUFBO0FBQ3RGLENBQUMifQ==