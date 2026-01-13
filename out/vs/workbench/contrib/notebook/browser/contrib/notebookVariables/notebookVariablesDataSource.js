/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { localize } from '../../../../../../nls.js';
import { variablePageSize, } from '../../../common/notebookKernelService.js';
export class NotebookVariableDataSource {
    constructor(notebookKernelService) {
        this.notebookKernelService = notebookKernelService;
        this.cancellationTokenSource = new CancellationTokenSource();
    }
    hasChildren(element) {
        return element.kind === 'root' || element.hasNamedChildren || element.indexedChildrenCount > 0;
    }
    cancel() {
        this.cancellationTokenSource.cancel();
        this.cancellationTokenSource.dispose();
        this.cancellationTokenSource = new CancellationTokenSource();
    }
    async getChildren(element) {
        if (element.kind === 'empty') {
            return [];
        }
        else if (element.kind === 'root') {
            return this.getRootVariables(element.notebook);
        }
        else {
            return this.getVariables(element);
        }
    }
    async getVariables(parent) {
        const selectedKernel = this.notebookKernelService.getMatchingKernel(parent.notebook).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            let children = [];
            if (parent.hasNamedChildren) {
                const variables = selectedKernel.provideVariables(parent.notebook.uri, parent.extHostId, 'named', 0, this.cancellationTokenSource.token);
                const childNodes = await variables
                    .map((variable) => {
                    return this.createVariableElement(variable, parent.notebook);
                })
                    .toPromise();
                children = children.concat(childNodes);
            }
            if (parent.indexedChildrenCount > 0) {
                const childNodes = await this.getIndexedChildren(parent, selectedKernel);
                children = children.concat(childNodes);
            }
            return children;
        }
        return [];
    }
    async getIndexedChildren(parent, kernel) {
        const childNodes = [];
        if (parent.indexedChildrenCount > variablePageSize) {
            const nestedPageSize = Math.floor(Math.max(parent.indexedChildrenCount / variablePageSize, 100));
            const indexedChildCountLimit = 1_000_000;
            let start = parent.indexStart ?? 0;
            const last = start + Math.min(parent.indexedChildrenCount, indexedChildCountLimit);
            for (; start < last; start += nestedPageSize) {
                let end = start + nestedPageSize;
                if (end > last) {
                    end = last;
                }
                childNodes.push({
                    kind: 'variable',
                    notebook: parent.notebook,
                    id: parent.id + `${start}`,
                    extHostId: parent.extHostId,
                    name: `[${start}..${end - 1}]`,
                    value: '',
                    indexedChildrenCount: end - start,
                    indexStart: start,
                    hasNamedChildren: false,
                });
            }
            if (parent.indexedChildrenCount > indexedChildCountLimit) {
                childNodes.push({
                    kind: 'variable',
                    notebook: parent.notebook,
                    id: parent.id + `${last + 1}`,
                    extHostId: parent.extHostId,
                    name: localize('notebook.indexedChildrenLimitReached', 'Display limit reached'),
                    value: '',
                    indexedChildrenCount: 0,
                    hasNamedChildren: false,
                });
            }
        }
        else if (parent.indexedChildrenCount > 0) {
            const variables = kernel.provideVariables(parent.notebook.uri, parent.extHostId, 'indexed', parent.indexStart ?? 0, this.cancellationTokenSource.token);
            for await (const variable of variables) {
                childNodes.push(this.createVariableElement(variable, parent.notebook));
                if (childNodes.length >= variablePageSize) {
                    break;
                }
            }
        }
        return childNodes;
    }
    async getRootVariables(notebook) {
        const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            const variables = selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, this.cancellationTokenSource.token);
            return await variables
                .map((variable) => {
                return this.createVariableElement(variable, notebook);
            })
                .toPromise();
        }
        return [];
    }
    createVariableElement(variable, notebook) {
        return {
            ...variable,
            kind: 'variable',
            notebook,
            extHostId: variable.id,
            id: `${variable.id}`,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRCxPQUFPLEVBSU4sZ0JBQWdCLEdBQ2hCLE1BQU0sMENBQTBDLENBQUE7QUE0QmpELE1BQU0sT0FBTywwQkFBMEI7SUFLdEMsWUFBNkIscUJBQTZDO1FBQTdDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDekUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQWtEO1FBQzdELE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQ2hCLE9BQWdFO1FBRWhFLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxP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