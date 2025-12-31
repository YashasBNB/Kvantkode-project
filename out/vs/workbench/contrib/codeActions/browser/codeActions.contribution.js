/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { CodeActionsContribution, editorConfiguration, notebookEditorConfiguration, } from './codeActionsContribution.js';
Registry.as(Extensions.Configuration).registerConfiguration(editorConfiguration);
Registry.as(Extensions.Configuration).registerConfiguration(notebookEditorConfiguration);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(CodeActionsContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUFjdGlvbnMvYnJvd3Nlci9jb2RlQWN0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLDhCQUE4QixDQUFBO0FBRXJDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FDbEYsbUJBQW1CLENBQ25CLENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQ2xGLDJCQUEyQixDQUMzQixDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsdUJBQXVCLG9DQUE0QixDQUFBIn0=