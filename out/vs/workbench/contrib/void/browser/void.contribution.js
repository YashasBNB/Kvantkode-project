/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// register inline diffs
import './editCodeService.js';
// register Sidebar pane, state, actions (keybinds, menus) (Ctrl+L)
import './sidebarActions.js';
import './sidebarPane.js';
// register quick edit (Ctrl+K)
import './quickEditActions.js';
// register Autocomplete
import './autocompleteService.js';
// register Context services
// import './contextGatheringService.js'
// import './contextUserChangesService.js'
// settings pane
import './voidSettingsPane.js';
// register css
import './media/void.css';
// update (frontend part, also see platform/)
import './voidUpdateActions.js';
import './convertToLLMMessageWorkbenchContrib.js';
// tools
import './toolsService.js';
import './terminalToolService.js';
// register Thread History
import './chatThreadService.js';
// ping
import './metricsPollService.js';
// helper services
import './helperServices/consistentItemService.js';
// register selection helper
import './voidSelectionHelperWidget.js';
// register tooltip service
import './tooltipService.js';
// register onboarding service
// import './voidOnboardingService.js'
// register misc service
import './miscWokrbenchContrib.js';
// register file service (for explorer context menu)
import './fileService.js';
// register source control management
import './voidSCMService.js';
// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------
// llmMessage
import '../common/sendLLMMessageService.js';
// voidSettings
import '../common/voidSettingsService.js';
// refreshModel
import '../common/refreshModelService.js';
// metrics
import '../common/metricsService.js';
// updates
import '../common/voidUpdateService.js';
// model service
import '../common/voidModelService.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRix3QkFBd0I7QUFDeEIsT0FBTyxzQkFBc0IsQ0FBQTtBQUU3QixtRUFBbUU7QUFDbkUsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLGtCQUFrQixDQUFBO0FBRXpCLCtCQUErQjtBQUMvQixPQUFPLHVCQUF1QixDQUFBO0FBRTlCLHdCQUF3QjtBQUN4QixPQUFPLDBCQUEwQixDQUFBO0FBRWpDLDRCQUE0QjtBQUM1Qix3Q0FBd0M7QUFDeEMsMENBQTBDO0FBRTFDLGdCQUFnQjtBQUNoQixPQUFPLHVCQUF1QixDQUFBO0FBRTlCLGVBQWU7QUFDZixPQUFPLGtCQUFrQixDQUFBO0FBRXpCLDZDQUE2QztBQUM3QyxPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sMENBQTBDLENBQUE7QUFFakQsUUFBUTtBQUNSLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTywwQkFBMEIsQ0FBQTtBQUVqQywwQkFBMEI7QUFDMUIsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPO0FBQ1AsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyxrQkFBa0I7QUFDbEIsT0FBTywyQ0FBMkMsQ0FBQTtBQUVsRCw0QkFBNEI7QUFDNUIsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUV2QywyQkFBMkI7QUFDM0IsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1Qiw4QkFBOEI7QUFDOUIsc0NBQXNDO0FBRXRDLHdCQUF3QjtBQUN4QixPQUFPLDJCQUEyQixDQUFBO0FBRWxDLG9EQUFvRDtBQUNwRCxPQUFPLGtCQUFrQixDQUFBO0FBRXpCLHFDQUFxQztBQUNyQyxPQUFPLHFCQUFxQixDQUFBO0FBRTVCLHVJQUF1STtBQUV2SSxhQUFhO0FBQ2IsT0FBTyxvQ0FBb0MsQ0FBQTtBQUUzQyxlQUFlO0FBQ2YsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxlQUFlO0FBQ2YsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxVQUFVO0FBQ1YsT0FBTyw2QkFBNkIsQ0FBQTtBQUVwQyxVQUFVO0FBQ1YsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUV2QyxnQkFBZ0I7QUFDaEIsT0FBTywrQkFBK0IsQ0FBQSJ9