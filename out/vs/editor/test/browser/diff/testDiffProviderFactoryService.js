/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { linesDiffComputers } from '../../../common/diff/linesDiffComputers.js';
export class TestDiffProviderFactoryService {
    createDiffProvider() {
        return new SyncDocumentDiffProvider();
    }
}
class SyncDocumentDiffProvider {
    constructor() {
        this.onDidChange = () => toDisposable(() => { });
    }
    computeDiff(original, modified, options, cancellationToken) {
        const result = linesDiffComputers
            .getDefault()
            .computeDiff(original.getLinesContent(), modified.getLinesContent(), options);
        return Promise.resolve({
            changes: result.changes,
            quitEarly: result.hitTimeout,
            identical: original.getValue() === modified.getValue(),
            moves: result.moves,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERpZmZQcm92aWRlckZhY3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2RpZmYvdGVzdERpZmZQcm92aWRlckZhY3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU1uRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUsvRSxNQUFNLE9BQU8sOEJBQThCO0lBRTFDLGtCQUFrQjtRQUNqQixPQUFPLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHdCQUF3QjtJQUE5QjtRQWtCQyxnQkFBVyxHQUFnQixHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQWxCQSxXQUFXLENBQ1YsUUFBb0IsRUFDcEIsUUFBb0IsRUFDcEIsT0FBcUMsRUFDckMsaUJBQW9DO1FBRXBDLE1BQU0sTUFBTSxHQUFHLGtCQUFrQjthQUMvQixVQUFVLEVBQUU7YUFDWixXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM5RSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDdEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNLENBQUMsVUFBVTtZQUM1QixTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDdEQsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO1NBQ25CLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FHRCJ9