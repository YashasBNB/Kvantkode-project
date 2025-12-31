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
import { ReferenceCollection } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService, createDecorator, } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookCellOutlineDataSource } from './notebookOutlineDataSource.js';
let NotebookCellOutlineDataSourceReferenceCollection = class NotebookCellOutlineDataSourceReferenceCollection extends ReferenceCollection {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    createReferencedObject(_key, editor) {
        return this.instantiationService.createInstance(NotebookCellOutlineDataSource, editor);
    }
    destroyReferencedObject(_key, object) {
        object.dispose();
    }
};
NotebookCellOutlineDataSourceReferenceCollection = __decorate([
    __param(0, IInstantiationService)
], NotebookCellOutlineDataSourceReferenceCollection);
export const INotebookCellOutlineDataSourceFactory = createDecorator('INotebookCellOutlineDataSourceFactory');
let NotebookCellOutlineDataSourceFactory = class NotebookCellOutlineDataSourceFactory {
    constructor(instantiationService) {
        this._data = instantiationService.createInstance(NotebookCellOutlineDataSourceReferenceCollection);
    }
    getOrCreate(editor) {
        return this._data.acquire(editor.getId(), editor);
    }
};
NotebookCellOutlineDataSourceFactory = __decorate([
    __param(0, IInstantiationService)
], NotebookCellOutlineDataSourceFactory);
export { NotebookCellOutlineDataSourceFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9ub3RlYm9va091dGxpbmVEYXRhU291cmNlRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQW1CLE1BQU0seUNBQXlDLENBQUE7QUFDOUYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixlQUFlLEdBQ2YsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUU5RSxJQUFNLGdEQUFnRCxHQUF0RCxNQUFNLGdEQUFpRCxTQUFRLG1CQUFrRDtJQUNoSCxZQUFvRCxvQkFBMkM7UUFDOUYsS0FBSyxFQUFFLENBQUE7UUFENEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUUvRixDQUFDO0lBQ2tCLHNCQUFzQixDQUN4QyxJQUFZLEVBQ1osTUFBdUI7UUFFdkIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFDa0IsdUJBQXVCLENBQ3pDLElBQVksRUFDWixNQUFxQztRQUVyQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDakIsQ0FBQztDQUNELENBQUE7QUFoQkssZ0RBQWdEO0lBQ3hDLFdBQUEscUJBQXFCLENBQUE7R0FEN0IsZ0RBQWdELENBZ0JyRDtBQUVELE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUNqRCxlQUFlLENBQXdDLHVDQUF1QyxDQUFDLENBQUE7QUFNekYsSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBb0M7SUFFaEQsWUFBbUMsb0JBQTJDO1FBQzdFLElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUMvQyxnREFBZ0QsQ0FDaEQsQ0FBQTtJQUNGLENBQUM7SUFFRCxXQUFXLENBQUMsTUFBdUI7UUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEQsQ0FBQztDQUNELENBQUE7QUFYWSxvQ0FBb0M7SUFFbkMsV0FBQSxxQkFBcUIsQ0FBQTtHQUZ0QixvQ0FBb0MsQ0FXaEQifQ==