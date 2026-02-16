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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL25vdGVib29rT3V0bGluZURhdGFTb3VyY2VGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGVBQWUsR0FDZixNQUFNLCtEQUErRCxDQUFBO0FBRXRFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTlFLElBQU0sZ0RBQWdELEdBQXRELE1BQU0sZ0RBQWlELFNBQVEsbUJBQWtEO0lBQ2hILFlBQW9ELG9CQUEyQztRQUM5RixLQUFLLEVBQUUsQ0FBQTtRQUQ0Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBRS9GLENBQUM7SUFDa0Isc0JBQXNCLENBQ3hDLElBQVksRUFDWixNQUF1QjtRQUV2QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUNrQix1QkFBdUIsQ0FDekMsSUFBWSxFQUNaLE1BQXFDO1FBRXJDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQWhCSyxnREFBZ0Q7SUFDeEMsV0FBQSxxQkFBcUIsQ0FBQTtHQUQ3QixnREFBZ0QsQ0FnQnJEO0FBRUQsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQ2pELGVBQWUsQ0FBd0MsdUNBQXVDLENBQUMsQ0FBQTtBQU16RixJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFvQztJQUVoRCxZQUFtQyxvQkFBMkM7UUFDN0UsSUFBSSxDQUFDLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQy9DLGdEQUFnRCxDQUNoRCxDQUFBO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUF1QjtRQUNsQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0QsQ0FBQTtBQVhZLG9DQUFvQztJQUVuQyxXQUFBLHFCQUFxQixDQUFBO0dBRnRCLG9DQUFvQyxDQVdoRCJ9