/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Primary workbench contribution
import './browser/terminal.contribution.js';
// Misc extensions to the workbench contribution
import './common/environmentVariable.contribution.js';
import './common/terminalExtensionPoints.contribution.js';
import './browser/terminalView.js';
// Terminal contributions - Standalone extensions to the terminal, these cannot be imported from the
// primary workbench contribution)
import '../terminalContrib/accessibility/browser/terminal.accessibility.contribution.js';
import '../terminalContrib/autoReplies/browser/terminal.autoReplies.contribution.js';
import '../terminalContrib/developer/browser/terminal.developer.contribution.js';
import '../terminalContrib/environmentChanges/browser/terminal.environmentChanges.contribution.js';
import '../terminalContrib/find/browser/terminal.find.contribution.js';
import '../terminalContrib/chat/browser/terminal.chat.contribution.js';
import '../terminalContrib/commandGuide/browser/terminal.commandGuide.contribution.js';
import '../terminalContrib/history/browser/terminal.history.contribution.js';
import '../terminalContrib/links/browser/terminal.links.contribution.js';
import '../terminalContrib/zoom/browser/terminal.zoom.contribution.js';
import '../terminalContrib/stickyScroll/browser/terminal.stickyScroll.contribution.js';
import '../terminalContrib/quickAccess/browser/terminal.quickAccess.contribution.js';
import '../terminalContrib/quickFix/browser/terminal.quickFix.contribution.js';
import '../terminalContrib/typeAhead/browser/terminal.typeAhead.contribution.js';
import '../terminalContrib/suggest/browser/terminal.suggest.contribution.js';
import '../terminalContrib/chat/browser/terminal.initialHint.contribution.js';
import '../terminalContrib/wslRecommendation/browser/terminal.wslRecommendation.contribution.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWxsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXJtaW5hbC5hbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsaUNBQWlDO0FBQ2pDLE9BQU8sb0NBQW9DLENBQUE7QUFFM0MsZ0RBQWdEO0FBQ2hELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLDJCQUEyQixDQUFBO0FBRWxDLG9HQUFvRztBQUNwRyxrQ0FBa0M7QUFDbEMsT0FBTyxpRkFBaUYsQ0FBQTtBQUN4RixPQUFPLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8seUVBQXlFLENBQUE7QUFDaEYsT0FBTywyRkFBMkYsQ0FBQTtBQUNsRyxPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sK0RBQStELENBQUE7QUFDdEUsT0FBTywrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8saUVBQWlFLENBQUE7QUFDeEUsT0FBTywrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sNkVBQTZFLENBQUE7QUFDcEYsT0FBTyx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLHlFQUF5RSxDQUFBO0FBQ2hGLE9BQU8scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLHlGQUF5RixDQUFBIn0=