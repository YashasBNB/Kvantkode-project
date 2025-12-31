/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseLocalizationWorkbenchContribution } from '../common/localization.contribution.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
export class WebLocalizationWorkbenchContribution extends BaseLocalizationWorkbenchContribution {
}
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(WebLocalizationWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsaXphdGlvbi9icm93c2VyL2xvY2FsaXphdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFHekMsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLHFDQUFxQztDQUFHO0FBRWxHLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDcEMsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLG9DQUFvQyxvQ0FFcEMsQ0FBQSJ9