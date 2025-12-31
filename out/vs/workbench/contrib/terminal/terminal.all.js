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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWxsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVybWluYWwuYWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlDQUFpQztBQUNqQyxPQUFPLG9DQUFvQyxDQUFBO0FBRTNDLGdEQUFnRDtBQUNoRCxPQUFPLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTywyQkFBMkIsQ0FBQTtBQUVsQyxvR0FBb0c7QUFDcEcsa0NBQWtDO0FBQ2xDLE9BQU8saUZBQWlGLENBQUE7QUFDeEYsT0FBTyw2RUFBNkUsQ0FBQTtBQUNwRixPQUFPLHlFQUF5RSxDQUFBO0FBQ2hGLE9BQU8sMkZBQTJGLENBQUE7QUFDbEcsT0FBTywrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sK0RBQStELENBQUE7QUFDdEUsT0FBTywrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyx5RUFBeUUsQ0FBQTtBQUNoRixPQUFPLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sc0VBQXNFLENBQUE7QUFDN0UsT0FBTyx5RkFBeUYsQ0FBQSJ9