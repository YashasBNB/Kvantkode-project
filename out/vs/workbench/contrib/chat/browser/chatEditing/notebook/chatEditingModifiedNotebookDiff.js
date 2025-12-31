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
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { computeDiff } from '../../../../notebook/common/notebookDiff.js';
import { INotebookEditorModelResolverService } from '../../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../../notebook/common/notebookLoggingService.js';
import { INotebookEditorWorkerService } from '../../../../notebook/common/services/notebookWorkerService.js';
let ChatEditingModifiedNotebookDiff = class ChatEditingModifiedNotebookDiff {
    static { this.NewModelCounter = 0; }
    constructor(original, modified, notebookEditorWorkerService, notebookLoggingService, notebookEditorModelService) {
        this.original = original;
        this.modified = modified;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.notebookLoggingService = notebookLoggingService;
        this.notebookEditorModelService = notebookEditorModelService;
    }
    async computeDiff() {
        let added = 0;
        let removed = 0;
        const disposables = new DisposableStore();
        try {
            const [modifiedRef, originalRef] = await Promise.all([
                this.notebookEditorModelService.resolve(this.modified.snapshotUri),
                this.notebookEditorModelService.resolve(this.original.snapshotUri),
            ]);
            disposables.add(modifiedRef);
            disposables.add(originalRef);
            const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.original.snapshotUri, this.modified.snapshotUri);
            const result = computeDiff(originalRef.object.notebook, modifiedRef.object.notebook, notebookDiff);
            result.cellDiffInfo.forEach((diff) => {
                switch (diff.type) {
                    case 'modified':
                    case 'insert':
                        added++;
                        break;
                    case 'delete':
                        removed++;
                        break;
                    default:
                        break;
                }
            });
        }
        catch (e) {
            this.notebookLoggingService.error('Notebook Chat', 'Error computing diff:\n' + e);
        }
        finally {
            disposables.dispose();
        }
        return {
            added,
            removed,
            identical: added === 0 && removed === 0,
            quitEarly: false,
            modifiedURI: this.modified.snapshotUri,
            originalURI: this.original.snapshotUri,
        };
    }
};
ChatEditingModifiedNotebookDiff = __decorate([
    __param(2, INotebookEditorWorkerService),
    __param(3, INotebookLoggingService),
    __param(4, INotebookEditorModelResolverService)
], ChatEditingModifiedNotebookDiff);
export { ChatEditingModifiedNotebookDiff };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ01vZGlmaWVkTm90ZWJvb2tEaWZmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDdkgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDL0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFJckcsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7YUFDcEMsb0JBQWUsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUNsQyxZQUNrQixRQUF3QixFQUN4QixRQUF3QixFQUV4QiwyQkFBeUQsRUFDaEMsc0JBQStDLEVBRXhFLDBCQUErRDtRQU4vRCxhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUV4QixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQThCO1FBQ2hDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFFeEUsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFxQztJQUM5RSxDQUFDO0lBRUosS0FBSyxDQUFDLFdBQVc7UUFDaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUM7WUFDSixNQUFNLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDcEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFDbEUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQzthQUNsRSxDQUFDLENBQUE7WUFDRixXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzVCLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDNUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUN0RSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQ3pCLENBQUE7WUFDRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQ3pCLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUMzQixXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDM0IsWUFBWSxDQUNaLENBQUE7WUFDRCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNwQyxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxVQUFVLENBQUM7b0JBQ2hCLEtBQUssUUFBUTt3QkFDWixLQUFLLEVBQUUsQ0FBQTt3QkFDUCxNQUFLO29CQUNOLEtBQUssUUFBUTt3QkFDWixPQUFPLEVBQUUsQ0FBQTt3QkFDVCxNQUFLO29CQUNOO3dCQUNDLE1BQUs7Z0JBQ1AsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSx5QkFBeUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRixDQUFDO2dCQUFTLENBQUM7WUFDVixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLO1lBQ0wsT0FBTztZQUNQLFNBQVMsRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLE9BQU8sS0FBSyxDQUFDO1lBQ3ZDLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVc7WUFDdEMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVztTQUN0QyxDQUFBO0lBQ0YsQ0FBQzs7QUE1RFcsK0JBQStCO0lBS3pDLFdBQUEsNEJBQTRCLENBQUE7SUFFNUIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLG1DQUFtQyxDQUFBO0dBUnpCLCtCQUErQixDQTZEM0MifQ==