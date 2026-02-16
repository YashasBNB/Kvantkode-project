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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wRXJyb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3RvcEVycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLDZCQUE2QixHQUM3QixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFNcEIsWUFBcUIsT0FBNEM7UUFBNUMsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7UUFDaEUsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBO1FBQzFDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFXLGdCQUFnQjtRQUMxQixNQUFNLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUU3RSxNQUFNLENBQUMsV0FBVyxJQUFJLENBQUMsRUFBRSx3Q0FBd0MsV0FBVyxJQUFJLENBQUMsQ0FBQTtRQUVqRixtREFBbUQ7UUFDbkQsTUFBTSxlQUFlLEdBQ3BCLFdBQVcsR0FBRyxDQUFDO1lBQ2QsQ0FBQyxDQUFDLFFBQVEsQ0FDUix3REFBd0QsRUFDeEQsc0JBQXNCLEVBQ3RCLFdBQVcsR0FBRyxDQUFDLENBQ2Y7WUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO1FBRU4sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDeEIsSUFBSSxhQUFhLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQ3pDLE9BQU8sUUFBUSxDQUNkLGtEQUFrRCxFQUNsRCx1QkFBdUIsRUFDdkIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ3RCLGVBQWUsQ0FDZixDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksYUFBYSxZQUFZLDZCQUE2QixFQUFFLENBQUM7Z0JBQzVELE9BQU8sUUFBUSxDQUNkLGtEQUFrRCxFQUNsRCx1QkFBdUIsRUFDdkIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ3RCLGVBQWUsQ0FDZixDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksYUFBYSxZQUFZLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2pELE9BQU8sUUFBUSxDQUNkLDBEQUEwRCxFQUMxRCxzQkFBc0IsQ0FDdEIsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPLGFBQWEsQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUFBO1FBQy9DLENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsYUFBYSxDQUFDLFNBQVMsRUFBRSx3REFBd0QsQ0FBQyxDQUFBO1FBRWxGLE1BQU0saUJBQWlCLEdBQ3RCLE9BQU8sS0FBSyxPQUFPO1lBQ2xCLENBQUMsQ0FBQyxRQUFRLENBQUMsbURBQW1ELEVBQUUsVUFBVSxDQUFDO1lBQzNFLENBQUMsQ0FBQyxRQUFRLENBQ1IscURBQXFELEVBQ3JELDZDQUE2QyxFQUM3QyxTQUFTLENBQUMsSUFBSSxDQUNkLENBQUE7UUFFSixNQUFNLGFBQWEsR0FDbEIsYUFBYSxZQUFZLGtCQUFrQjtZQUMxQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7WUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFaEMsT0FBTyxRQUFRLENBQ2QsMERBQTBELEVBQzFELGtEQUFrRCxFQUNsRCxpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9