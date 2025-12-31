/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { DropOrPasteIntoCommands } from './commands.js';
import { DropOrPasteSchemaContribution, editorConfiguration } from './configurationSchema.js';
registerWorkbenchContribution2(DropOrPasteIntoCommands.ID, DropOrPasteIntoCommands, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(DropOrPasteSchemaContribution.ID, DropOrPasteSchemaContribution, 4 /* WorkbenchPhase.Eventually */);
Registry.as(Extensions.Configuration).registerConfiguration(editorConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcE9yUGFzdGVJbnRvLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2Ryb3BPclBhc3RlSW50by5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3ZELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTdGLDhCQUE4QixDQUM3Qix1QkFBdUIsQ0FBQyxFQUFFLEVBQzFCLHVCQUF1QixvQ0FFdkIsQ0FBQTtBQUNELDhCQUE4QixDQUM3Qiw2QkFBNkIsQ0FBQyxFQUFFLEVBQ2hDLDZCQUE2QixvQ0FFN0IsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FDbEYsbUJBQW1CLENBQ25CLENBQUEifQ==