/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import * as platform from '../../registry/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from './theme.js';
export const IThemeService = createDecorator('themeService');
export function themeColorFromId(id) {
    return { id };
}
export const FileThemeIcon = Codicon.file;
export const FolderThemeIcon = Codicon.folder;
export function getThemeTypeSelector(type) {
    switch (type) {
        case ColorScheme.DARK:
            return ThemeTypeSelector.VS_DARK;
        case ColorScheme.HIGH_CONTRAST_DARK:
            return ThemeTypeSelector.HC_BLACK;
        case ColorScheme.HIGH_CONTRAST_LIGHT:
            return ThemeTypeSelector.HC_LIGHT;
        default:
            return ThemeTypeSelector.VS;
    }
}
// static theming participant
export const Extensions = {
    ThemingContribution: 'base.contributions.theming',
};
class ThemingRegistry {
    constructor() {
        this.themingParticipants = [];
        this.themingParticipants = [];
        this.onThemingParticipantAddedEmitter = new Emitter();
    }
    onColorThemeChange(participant) {
        this.themingParticipants.push(participant);
        this.onThemingParticipantAddedEmitter.fire(participant);
        return toDisposable(() => {
            const idx = this.themingParticipants.indexOf(participant);
            this.themingParticipants.splice(idx, 1);
        });
    }
    get onThemingParticipantAdded() {
        return this.onThemingParticipantAddedEmitter.event;
    }
    getThemingParticipants() {
        return this.themingParticipants;
    }
}
const themingRegistry = new ThemingRegistry();
platform.Registry.add(Extensions.ThemingContribution, themingRegistry);
export function registerThemingParticipant(participant) {
    return themingRegistry.onColorThemeChange(participant);
}
/**
 * Utility base class for all themable components.
 */
export class Themable extends Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
        this.theme = themeService.getColorTheme();
        // Hook up to theme changes
        this._register(this.themeService.onDidColorThemeChange((theme) => this.onThemeChange(theme)));
    }
    onThemeChange(theme) {
        this.theme = theme;
        this.updateStyles();
    }
    updateStyles() {
        // Subclasses to override
    }
    getColor(id, modify) {
        let color = this.theme.getColor(id);
        if (color && modify) {
            color = modify(color, this.theme);
        }
        return color ? color.toString() : null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL3RoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sS0FBSyxRQUFRLE1BQU0sbUNBQW1DLENBQUE7QUFHN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFnQixjQUFjLENBQUMsQ0FBQTtBQUUzRSxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsRUFBbUI7SUFDbkQsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO0FBRTdDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxJQUFpQjtJQUNyRCxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ2QsS0FBSyxXQUFXLENBQUMsSUFBSTtZQUNwQixPQUFPLGlCQUFpQixDQUFDLE9BQU8sQ0FBQTtRQUNqQyxLQUFLLFdBQVcsQ0FBQyxrQkFBa0I7WUFDbEMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUE7UUFDbEMsS0FBSyxXQUFXLENBQUMsbUJB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