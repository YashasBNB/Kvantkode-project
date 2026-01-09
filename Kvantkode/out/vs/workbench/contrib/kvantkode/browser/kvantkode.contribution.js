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
// register chat thread service
import './chatThreadService.js';
// register LLM message service
import './convertToLLMMessageWorkbenchContrib.js';
// register terminal tool service
import './terminalToolService.js';
// register tools service
import './toolsService.js';
// register void settings pane
import './kvantkodeSettingsPane.js';
// register void update actions
import './voidUpdateActions.js';
// register void selection helper widget
import './voidSelectionHelperWidget.js';
// register void command bar service
import './voidCommandBarService.js';
// register void onboarding service
import './voidOnboardingService.js';
// register void SCM service
import './voidSCMService.js';
// register metrics poll service
import './metricsPollService.js';
// register misc workbench contributions
import './miscWokrbenchContrib.js';
// register extension transfer service
import './extensionTransferService.js';
// register tooltip service
import './tooltipService.js';
// register AI regex service
import './aiRegexService.js';
// register continue chat client
import './continueChatClient.js';
// register file service
import './fileService.js';
// register marker check service
import './_markerCheckService.js';
// register dummy contribution
import './_dummyContrib.js';
// import './contextUserChangesService.js'
// register css
import './media/void.css';
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
