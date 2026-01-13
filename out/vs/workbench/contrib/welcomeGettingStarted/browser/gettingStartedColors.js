/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { darken, inputBackground, editorWidgetBackground, lighten, registerColor, textLinkForeground, contrastBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { localize } from '../../../../nls.js';
// Seprate from main module to break dependency cycles between welcomePage and gettingStarted.
export const welcomePageBackground = registerColor('welcomePage.background', null, localize('welcomePage.background', 'Background color for the Welcome page.'));
export const welcomePageTileBackground = registerColor('welcomePage.tileBackground', {
    dark: editorWidgetBackground,
    light: editorWidgetBackground,
    hcDark: '#000',
    hcLight: editorWidgetBackground,
}, localize('welcomePage.tileBackground', 'Background color for the tiles on the Welcome page.'));
export const welcomePageTileHoverBackground = registerColor('welcomePage.tileHoverBackground', {
    dark: lighten(editorWidgetBackground, 0.2),
    light: darken(editorWidgetBackground, 0.1),
    hcDark: null,
    hcLight: null,
}, localize('welcomePage.tileHoverBackground', 'Hover background color for the tiles on the Welcome.'));
export const welcomePageTileBorder = registerColor('welcomePage.tileBorder', { dark: '#ffffff1a', light: '#0000001a', hcDark: contrastBorder, hcLight: contrastBorder }, localize('welcomePage.tileBorder', 'Border color for the tiles on the Welcome page.'));
export const welcomePageProgressBackground = registerColor('welcomePage.progress.background', inputBackground, localize('welcomePage.progress.background', 'Foreground color for the Welcome page progress bars.'));
export const welcomePageProgressForeground = registerColor('welcomePage.progress.foreground', textLinkForeground, localize('welcomePage.progress.foreground', 'Background color for the Welcome page progress bars.'));
export const walkthroughStepTitleForeground = registerColor('walkthrough.stepTitle.foreground', { light: '#000000', dark: '#ffffff', hcDark: null, hcLight: null }, localize('walkthrough.stepTitle.foreground', 'Foreground color of the heading of each walkthrough step'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb2xvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkQ29sb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixNQUFNLEVBQ04sZUFBZSxFQUNmLHNCQUFzQixFQUN0QixPQUFPLEVBQ1AsYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLEdBQ2QsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsOEZBQThGO0FBQzlGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FDakQsd0JBQXdCLEVBQ3hCLElBQUksRUFDSixRQUFRLENBQUMsd0JBQXdCLEVBQUUsd0NBQXdDLENBQUMsQ0FDNUUsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDckQsNEJBQTRCLEVBQzVCO0lBQ0MsSUFBSSxFQUFFLHNCQUFzQjtJQUM1QixLQUFLLEVBQUUsc0JBQXNCO0lBQzdCLE1BQU0sRUFBRSxNQUFNO0lBQ2QsT0FBTyxFQUFFLHNCQUFzQjtDQUMvQixFQUNELFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxxREFBcUQsQ0FBQyxDQUM3RixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsYUFBYSxDQUMxRCxpQ0FBaUMsRUFDakM7SUFDQyxJQUFJLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQztJQUMxQyxLQUFLLEVBQUUsTUFBTSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQztJQUMxQyxNQUFNLEVBQUUsSUFBSTtJQUNaLE9BQU8sRUFBRSxJQUFJO0NBQ2IsRUFDRCxRQUFRLENBQ1AsaUNBQWlDLEVBQ2pDLHNEQUFzRCxDQUN0RCxDQUNELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQ2pELHdCQUF3QixFQUN4QixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFDMUYsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGlEQUFpRCxDQUFDLENBQ3JGLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQ3pELGlDQUFpQyxFQUNqQyxlQUFlLEVBQ2YsUUFBUSxDQUNQLGlDQUFpQyxFQUNqQyxzREFBc0QsQ0FDdEQsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUN6RCxpQ0FBaUMsRUFDakMsa0JBQWtCLEVBQ2xCLFFBQVEsQ0FDUCxpQ0FBaUMsRUFDakMsc0RBQXNELENBQ3RELENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGFBQWEsQ0FDMUQsa0NBQWtDLEVBQ2xDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUNsRSxRQUFRLENBQ1Asa0NBQWtDLEVBQ2xDLDBEQUEwRCxDQUMxRCxDQUNELENBQUEifQ==