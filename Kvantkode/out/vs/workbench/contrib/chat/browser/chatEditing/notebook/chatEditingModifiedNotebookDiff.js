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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTW9kaWZpZWROb3RlYm9va0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUlyRyxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjthQUNwQyxvQkFBZSxHQUFXLENBQUMsQUFBWixDQUFZO0lBQ2xDLFlBQ2tCLFFBQXdCLEVBQ3hCLFFBQXdCLEVBRXhCLDJCQUF5RCxFQUNoQyxzQkFBK0MsRUFFeEUsMEJBQStEO1FBTi9ELGFBQVEsR0FBUixRQUFRLENBQWdCO1FBQ3hCLGFBQVEsR0FBUixRQUFRLENBQWdCO1FBRXhCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7UUFDaEMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUV4RSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXFDO0lBQzlFLENBQUM7SUFFSixLQUFLLENBQUMsV0FBVztRQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDYixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFFZixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLElBQUksQ0FBQztZQUNKLE1BQU0sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO2dCQUNsRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO2FBQ2xFLENBQUMsQ0FBQTtZQUNGLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDNUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM1QixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQ3RFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FDekIsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FDekIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQzNCLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUMzQixZQUFZLENBQ1osQ0FBQTtZQUNELE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3BDLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNuQixLQUFLLFVBQVUsQ0FBQztvQkFDaEIsS0FBSyxRQUFRO3dCQUNaLEtBQUssRUFBRSxDQUFBO3dCQUNQLE1BQUs7b0JBQ04sS0FBSyxRQUFRO3dCQUNaLE9BQU8sRUFBRSxDQUFBO3dCQUNULE1BQUs7b0JBQ047d0JBQ0MsTUFBSztnQkFDUCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLHlCQUF5QixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsT0FBTztZQUNOLEtBQUs7WUFDTCxPQUFPO1lBQ1AsU0FBUyxFQUFFLEtBQUssS0FBSyxDQUFDLElBQUksT0FBTyxLQUFLLENBQUM7WUFDdkMsU0FBUyxFQUFFLEtBQUs7WUFDaEIsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVztZQUN0QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXO1NBQ3RDLENBQUE7SUFDRixDQUFDOztBQTVEVywrQkFBK0I7SUFLekMsV0FBQSw0QkFBNEIsQ0FBQTtJQUU1QixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsbUNBQW1DLENBQUE7R0FSekIsK0JBQStCLENBNkQzQyJ9