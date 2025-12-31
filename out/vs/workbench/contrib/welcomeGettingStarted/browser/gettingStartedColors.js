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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb2xvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZENvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sTUFBTSxFQUNOLGVBQWUsRUFDZixzQkFBc0IsRUFDdEIsT0FBTyxFQUNQLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIsY0FBYyxHQUNkLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLDhGQUE4RjtBQUM5RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQ2pELHdCQUF3QixFQUN4QixJQUFJLEVBQ0osUUFBUSxDQUFDLHdCQUF3QixFQUFFLHdDQUF3QyxDQUFDLENBQzVFLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxhQUFhLENBQ3JELDRCQUE0QixFQUM1QjtJQUNDLElBQUksRUFBRSxzQkFBc0I7SUFDNUIsS0FBSyxFQUFFLHNCQUFzQjtJQUM3QixNQUFNLEVBQUUsTUFBTTtJQUNkLE9BQU8sRUFBRSxzQkFBc0I7Q0FDL0IsRUFDRCxRQUFRLENBQUMsNEJBQTRCLEVBQUUscURBQXFELENBQUMsQ0FDN0YsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGFBQWEsQ0FDMUQsaUNBQWlDLEVBQ2pDO0lBQ0MsSUFBSSxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUM7SUFDMUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUM7SUFDMUMsTUFBTSxFQUFFLElBQUk7SUFDWixPQUFPLEVBQUUsSUFBSTtDQUNiLEVBQ0QsUUFBUSxDQUNQLGlDQUFpQyxFQUNqQyxzREFBc0QsQ0FDdEQsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUNqRCx3QkFBd0IsRUFDeEIsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEVBQzFGLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxpREFBaUQsQ0FBQyxDQUNyRixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUN6RCxpQ0FBaUMsRUFDakMsZUFBZSxFQUNmLFFBQVEsQ0FDUCxpQ0FBaUMsRUFDakMsc0RBQXNELENBQ3RELENBQ0QsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGFBQWEsQ0FDekQsaUNBQWlDLEVBQ2pDLGtCQUFrQixFQUNsQixRQUFRLENBQ1AsaUNBQWlDLEVBQ2pDLHNEQUFzRCxDQUN0RCxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQzFELGtDQUFrQyxFQUNsQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFDbEUsUUFBUSxDQUNQLGtDQUFrQyxFQUNsQywwREFBMEQsQ0FDMUQsQ0FDRCxDQUFBIn0=