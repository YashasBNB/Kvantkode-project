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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdENvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sZUFBZSxFQUNmLGVBQWUsRUFDZixjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLHNCQUFzQixFQUN0QixVQUFVLEVBQ1YsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FDN0Msb0JBQW9CLEVBQ3BCO0lBQ0MsSUFBSSxFQUFFLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4QyxNQUFNLEVBQUUsY0FBYztJQUN0QixPQUFPLEVBQUUsY0FBYztDQUN2QixFQUNELFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxxQ0FBcUMsQ0FBQyxDQUNyRSxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUNqRCx3QkFBd0IsRUFDeEI7SUFDQyxJQUFJLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQztJQUN6QyxLQUFLLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQztJQUMxQyxNQUFNLEVBQUUsc0JBQXNCO0lBQzlCLE9BQU8sRUFBRSxJQUFJO0NBQ2IsRUFDRCxRQUFRLENBQUMsd0JBQXdCLEVBQUUseUNBQXlDLENBQUMsQ0FDN0UsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGFBQWEsQ0FDdEQsNkJBQTZCLEVBQzdCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFDeEYsUUFBUSxDQUFDLDZCQUE2QixFQUFFLCtDQUErQyxDQUFDLENBQ3hGLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQ3RELDZCQUE2QixFQUM3QixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQ3BGLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwrQ0FBK0MsQ0FBQyxDQUN4RixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUNoRCx1QkFBdUIsRUFDdkIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFDaEYsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHdDQUF3QyxDQUFDLENBQzNFLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQ2hELHVCQUF1QixFQUN2QixVQUFVLEVBQ1YsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHdDQUF3QyxDQUFDLENBQzNFLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxhQUFhLENBQ3BELDJCQUEyQixFQUMzQjtJQUNDLEtBQUssRUFBRSxTQUFTO0lBQ2hCLElBQUksRUFBRSxTQUFTO0lBQ2YsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLHFFQUFxRSxDQUNyRSxDQUNELENBQUEifQ==