/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ActionRunner } from '../../../../base/common/actions.js';
export class ActionRunnerWithContext extends ActionRunner {
    constructor(_getContext) {
        super();
        this._getContext = _getContext;
    }
    runAction(action, _context) {
        const ctx = this._getContext();
        return super.runAction(action, ctx);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tdWx0aURpZmZFZGl0b3IvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBRTFFLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxZQUFZO0lBQ3hELFlBQTZCLFdBQTBCO1FBQ3RELEtBQUssRUFBRSxDQUFBO1FBRHFCLGdCQUFXLEdBQVgsV0FBVyxDQUFlO0lBRXZELENBQUM7SUFFa0IsU0FBUyxDQUFDLE1BQWUsRUFBRSxRQUFrQjtRQUMvRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDOUIsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0NBQ0QifQ==