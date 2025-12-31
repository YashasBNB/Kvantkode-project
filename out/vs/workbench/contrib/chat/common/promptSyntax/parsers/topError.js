/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { OpenFailed, RecursiveReference, FailedToResolveContentsStream, } from '../../promptFileReferenceErrors.js';
/**
 * The top-most error of the reference tree.
 */
export class TopError {
    constructor(options) {
        this.options = options;
        this.originalError = options.originalError;
        this.errorSubject = options.errorSubject;
        this.errorsCount = options.errorsCount;
        this.parentUri = options.parentUri;
    }
    get localizedMessage() {
        const { originalError, parentUri, errorSubject: subject, errorsCount } = this;
        assert(errorsCount >= 1, `Error count must be at least 1, got '${errorsCount}'.`);
        // a note about how many more link issues are there
        const moreIssuesLabel = errorsCount > 1
            ? localize('workbench.reusable-prompts.top-error.more-issues-label', '\n(+{0} more issues)', errorsCount - 1)
            : '';
        if (subject === 'root') {
            if (originalError instanceof OpenFailed) {
                return localize('workbench.reusable-prompts.top-error.open-failed', "Cannot open '{0}'.{1}", originalError.uri.path, moreIssuesLabel);
            }
            if (originalError instanceof FailedToResolveContentsStream) {
                return localize('workbench.reusable-prompts.top-error.cannot-read', "Cannot read '{0}'.{1}", originalError.uri.path, moreIssuesLabel);
            }
            if (originalError instanceof RecursiveReference) {
                return localize('workbench.reusable-prompts.top-error.recursive-reference', 'Recursion to itself.');
            }
            return originalError.message + moreIssuesLabel;
        }
        // a sanity check - because the error subject is not `root`, the parent must set
        assertDefined(parentUri, 'Parent URI must be defined for error of non-root link.');
        const errorMessageStart = subject === 'child'
            ? localize('workbench.reusable-prompts.top-error.child.direct', 'Contains')
            : localize('workbench.reusable-prompts.top-error.child.indirect', "Indirectly referenced prompt '{0}' contains", parentUri.path);
        const linkIssueName = originalError instanceof RecursiveReference
            ? localize('recursive', 'recursive')
            : localize('broken', 'broken');
        return localize('workbench.reusable-prompts.top-error.child.final-message', "{0} a {1} link to '{2}' that will be ignored.{3}", errorMessageStart, linkIssueName, originalError.uri.path, moreIssuesLabel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wRXJyb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy90b3BFcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGtCQUFrQixFQUNsQiw2QkFBNkIsR0FDN0IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzQzs7R0FFRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBTXBCLFlBQXFCLE9BQTRDO1FBQTVDLFlBQU8sR0FBUCxPQUFPLENBQXFDO1FBQ2hFLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQTtRQUMxQyxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFN0UsTUFBTSxDQUFDLFdBQVcsSUFBSSxDQUFDLEVBQUUsd0NBQXdDLFdBQVcsSUFBSSxDQUFDLENBQUE7UUFFakYsbURBQW1EO1FBQ25ELE1BQU0sZUFBZSxHQUNwQixXQUFXLEdBQUcsQ0FBQztZQUNkLENBQUMsQ0FBQyxRQUFRLENBQ1Isd0RBQXdELEVBQ3hELHNCQUFzQixFQUN0QixXQUFXLEdBQUcsQ0FBQyxDQUNmO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVOLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksYUFBYSxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUN6QyxPQUFPLFFBQVEsQ0FDZCxrREFBa0QsRUFDbEQsdUJBQXVCLEVBQ3ZCLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLGFBQWEsWUFBWSw2QkFBNkIsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLFFBQVEsQ0FDZCxrREFBa0QsRUFDbEQsdUJBQXVCLEVBQ3ZCLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLGFBQWEsWUFBWSxrQkFBa0IsRUFBRSxDQUFDO2dCQUNqRCxPQUFPLFFBQVEsQ0FDZCwwREFBMEQsRUFDMUQsc0JBQXNCLENBQ3RCLENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTyxhQUFhLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQTtRQUMvQyxDQUFDO1FBRUQsZ0ZBQWdGO1FBQ2hGLGFBQWEsQ0FBQyxTQUFTLEVBQUUsd0RBQXdELENBQUMsQ0FBQTtRQUVsRixNQUFNLGlCQUFpQixHQUN0QixPQUFPLEtBQUssT0FBTztZQUNsQixDQUFDLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxFQUFFLFVBQVUsQ0FBQztZQUMzRSxDQUFDLENBQUMsUUFBUSxDQUNSLHFEQUFxRCxFQUNyRCw2Q0FBNkMsRUFDN0MsU0FBUyxDQUFDLElBQUksQ0FDZCxDQUFBO1FBRUosTUFBTSxhQUFhLEdBQ2xCLGFBQWEsWUFBWSxrQkFBa0I7WUFDMUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRWhDLE9BQU8sUUFBUSxDQUNkLDBEQUEwRCxFQUMxRCxrREFBa0QsRUFDbEQsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFDdEIsZUFBZSxDQUNmLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==