/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './localHistoryCommands.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { LocalHistoryTimeline } from './localHistoryTimeline.js';
// Register Local History Timeline
registerWorkbenchContribution2(LocalHistoryTimeline.ID, LocalHistoryTimeline, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsSGlzdG9yeS9icm93c2VyL2xvY2FsSGlzdG9yeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFaEUsa0NBQWtDO0FBQ2xDLDhCQUE4QixDQUM3QixvQkFBb0IsQ0FBQyxFQUFFLEVBQ3ZCLG9CQUFvQixzQ0FFcEIsQ0FBQSJ9