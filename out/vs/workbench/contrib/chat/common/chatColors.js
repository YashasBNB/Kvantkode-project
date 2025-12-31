/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, RGBA } from '../../../../base/common/color.js';
import { localize } from '../../../../nls.js';
import { badgeBackground, badgeForeground, contrastBorder, editorBackground, editorWidgetBackground, foreground, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
export const chatRequestBorder = registerColor('chat.requestBorder', {
    dark: new Color(new RGBA(255, 255, 255, 0.1)),
    light: new Color(new RGBA(0, 0, 0, 0.1)),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('chat.requestBorder', 'The border color of a chat request.'));
export const chatRequestBackground = registerColor('chat.requestBackground', {
    dark: transparent(editorBackground, 0.62),
    light: transparent(editorBackground, 0.62),
    hcDark: editorWidgetBackground,
    hcLight: null,
}, localize('chat.requestBackground', 'The background color of a chat request.'));
export const chatSlashCommandBackground = registerColor('chat.slashCommandBackground', { dark: '#34414b8f', light: '#d2ecff99', hcDark: Color.white, hcLight: badgeBackground }, localize('chat.slashCommandBackground', 'The background color of a chat slash command.'));
export const chatSlashCommandForeground = registerColor('chat.slashCommandForeground', { dark: '#40A6FF', light: '#306CA2', hcDark: Color.black, hcLight: badgeForeground }, localize('chat.slashCommandForeground', 'The foreground color of a chat slash command.'));
export const chatAvatarBackground = registerColor('chat.avatarBackground', { dark: '#1f1f1f', light: '#f2f2f2', hcDark: Color.black, hcLight: Color.white }, localize('chat.avatarBackground', 'The background color of a chat avatar.'));
export const chatAvatarForeground = registerColor('chat.avatarForeground', foreground, localize('chat.avatarForeground', 'The foreground color of a chat avatar.'));
export const chatEditedFileForeground = registerColor('chat.editedFileForeground', {
    light: '#895503',
    dark: '#E2C08D',
    hcDark: '#E2C08D',
    hcLight: '#895503',
}, localize('chat.editedFileForeground', 'The foreground color of a chat edited file in the edited file list.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRDb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLGVBQWUsRUFDZixlQUFlLEVBQ2YsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsVUFBVSxFQUNWLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQzdDLG9CQUFvQixFQUNwQjtJQUNDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEMsTUFBTSxFQUFFLGNBQWM7SUFDdEIsT0FBTyxFQUFFLGNBQWM7Q0FDdkIsRUFDRCxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUNBQXFDLENBQUMsQ0FDckUsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FDakQsd0JBQXdCLEVBQ3hCO0lBQ0MsSUFBSSxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUM7SUFDekMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUM7SUFDMUMsTUFBTSxFQUFFLHNCQUFzQjtJQUM5QixPQUFPLEVBQUUsSUFBSTtDQUNiLEVBQ0QsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHlDQUF5QyxDQUFDLENBQzdFLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQ3RELDZCQUE2QixFQUM3QixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQ3hGLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwrQ0FBK0MsQ0FBQyxDQUN4RixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsYUFBYSxDQUN0RCw2QkFBNkIsRUFDN0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxFQUNwRixRQUFRLENBQUMsNkJBQTZCLEVBQUUsK0NBQStDLENBQUMsQ0FDeEYsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGFBQWEsQ0FDaEQsdUJBQXVCLEVBQ3ZCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQ2hGLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3Q0FBd0MsQ0FBQyxDQUMzRSxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUNoRCx1QkFBdUIsRUFDdkIsVUFBVSxFQUNWLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3Q0FBd0MsQ0FBQyxDQUMzRSxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsYUFBYSxDQUNwRCwyQkFBMkIsRUFDM0I7SUFDQyxLQUFLLEVBQUUsU0FBUztJQUNoQixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsUUFBUSxDQUNQLDJCQUEyQixFQUMzQixxRUFBcUUsQ0FDckUsQ0FDRCxDQUFBIn0=