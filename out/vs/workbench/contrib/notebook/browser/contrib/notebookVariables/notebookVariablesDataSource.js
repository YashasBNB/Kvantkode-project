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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25vdGVib29rVmFyaWFibGVzL25vdGVib29rVmFyaWFibGVzRGF0YVNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbkQsT0FBTyxFQUlOLGdCQUFnQixHQUNoQixNQUFNLDBDQUEwQyxDQUFBO0FBNEJqRCxNQUFNLE9BQU8sMEJBQTBCO0lBS3RDLFlBQTZCLHFCQUE2QztRQUE3QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3pFLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFDN0QsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFrRDtRQUM3RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFTSxNQUFNO1FBQ1osSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO0lBQzdELENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNoQixPQUFnRTtRQUVoRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDOUIsT0FB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