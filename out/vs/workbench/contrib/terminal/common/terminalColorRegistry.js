/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { editorOverviewRulerBorder } from '../../../../editor/common/core/editorColorRegistry.js';
import * as nls from '../../../../nls.js';
import { registerColor, editorFindMatch, editorFindMatchHighlight, overviewRulerFindMatchForeground, editorSelectionBackground, transparent, editorHoverHighlight, } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND, PANEL_BORDER, TAB_ACTIVE_BORDER, } from '../../../common/theme.js';
/**
 * The color identifiers for the terminal's ansi colors. The index in the array corresponds to the index
 * of the color in the terminal color table.
 */
export const ansiColorIdentifiers = [];
export const TERMINAL_BACKGROUND_COLOR = registerColor('terminal.background', null, nls.localize('terminal.background', 'The background color of the terminal, this allows coloring the terminal differently to the panel.'));
export const TERMINAL_FOREGROUND_COLOR = registerColor('terminal.foreground', {
    light: '#333333',
    dark: '#CCCCCC',
    hcDark: '#FFFFFF',
    hcLight: '#292929',
}, nls.localize('terminal.foreground', 'The foreground color of the terminal.'));
export const TERMINAL_CURSOR_FOREGROUND_COLOR = registerColor('terminalCursor.foreground', null, nls.localize('terminalCursor.foreground', 'The foreground color of the terminal cursor.'));
export const TERMINAL_CURSOR_BACKGROUND_COLOR = registerColor('terminalCursor.background', null, nls.localize('terminalCursor.background', 'The background color of the terminal cursor. Allows customizing the color of a character overlapped by a block cursor.'));
export const TERMINAL_SELECTION_BACKGROUND_COLOR = registerColor('terminal.selectionBackground', editorSelectionBackground, nls.localize('terminal.selectionBackground', 'The selection background color of the terminal.'));
export const TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR = registerColor('terminal.inactiveSelectionBackground', {
    light: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5),
    dark: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5),
    hcDark: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.7),
    hcLight: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5),
}, nls.localize('terminal.inactiveSelectionBackground', 'The selection background color of the terminal when it does not have focus.'));
export const TERMINAL_SELECTION_FOREGROUND_COLOR = registerColor('terminal.selectionForeground', {
    light: null,
    dark: null,
    hcDark: '#000000',
    hcLight: '#ffffff',
}, nls.localize('terminal.selectionForeground', 'The selection foreground color of the terminal. When this is null the selection foreground will be retained and have the minimum contrast ratio feature applied.'));
export const TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.defaultBackground', {
    light: '#00000040',
    dark: '#ffffff40',
    hcDark: '#ffffff80',
    hcLight: '#00000040',
}, nls.localize('terminalCommandDecoration.defaultBackground', 'The default terminal command decoration background color.'));
export const TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.successBackground', {
    dark: '#1B81A8',
    light: '#2090D3',
    hcDark: '#1B81A8',
    hcLight: '#007100',
}, nls.localize('terminalCommandDecoration.successBackground', 'The terminal command decoration background color for successful commands.'));
export const TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.errorBackground', {
    dark: '#F14C4C',
    light: '#E51400',
    hcDark: '#F14C4C',
    hcLight: '#B5200D',
}, nls.localize('terminalCommandDecoration.errorBackground', 'The terminal command decoration background color for error commands.'));
export const TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR = registerColor('terminalOverviewRuler.cursorForeground', '#A0A0A0CC', nls.localize('terminalOverviewRuler.cursorForeground', 'The overview ruler cursor color.'));
export const TERMINAL_BORDER_COLOR = registerColor('terminal.border', PANEL_BORDER, nls.localize('terminal.border', 'The color of the border that separates split panes within the terminal. This defaults to panel.border.'));
export const TERMINAL_OVERVIEW_RULER_BORDER_COLOR = registerColor('terminalOverviewRuler.border', editorOverviewRulerBorder, nls.localize('terminalOverviewRuler.border', 'The overview ruler left-side border color.'));
export const TERMINAL_FIND_MATCH_BACKGROUND_COLOR = registerColor('terminal.findMatchBackground', {
    dark: editorFindMatch,
    light: editorFindMatch,
    // Use regular selection background in high contrast with a thick border
    hcDark: null,
    hcLight: '#0F4A85',
}, nls.localize('terminal.findMatchBackground', 'Color of the current search match in the terminal. The color must not be opaque so as not to hide underlying terminal content.'), true);
export const TERMINAL_HOVER_HIGHLIGHT_BACKGROUND_COLOR = registerColor('terminal.hoverHighlightBackground', transparent(editorHoverHighlight, 0.5), nls.localize('terminal.findMatchHighlightBorder', 'Border color of the other search matches in the terminal.'));
export const TERMINAL_FIND_MATCH_BORDER_COLOR = registerColor('terminal.findMatchBorder', {
    dark: null,
    light: null,
    hcDark: '#f38518',
    hcLight: '#0F4A85',
}, nls.localize('terminal.findMatchBorder', 'Border color of the current search match in the terminal.'));
export const TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR = registerColor('terminal.findMatchHighlightBackground', {
    dark: editorFindMatchHighlight,
    light: editorFindMatchHighlight,
    hcDark: null,
    hcLight: null,
}, nls.localize('terminal.findMatchHighlightBackground', 'Color of the other search matches in the terminal. The color must not be opaque so as not to hide underlying terminal content.'), true);
export const TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR = registerColor('terminal.findMatchHighlightBorder', {
    dark: null,
    light: null,
    hcDark: '#f38518',
    hcLight: '#0F4A85',
}, nls.localize('terminal.findMatchHighlightBorder', 'Border color of the other search matches in the terminal.'));
export const TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR = registerColor('terminalOverviewRuler.findMatchForeground', {
    dark: overviewRulerFindMatchForeground,
    light: overviewRulerFindMatchForeground,
    hcDark: '#f38518',
    hcLight: '#0F4A85',
}, nls.localize('terminalOverviewRuler.findMatchHighlightForeground', 'Overview ruler marker color for find matches in the terminal.'));
export const TERMINAL_DRAG_AND_DROP_BACKGROUND = registerColor('terminal.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, nls.localize('terminal.dragAndDropBackground', 'Background color when dragging on top of terminals. The color should have transparency so that the terminal contents can still shine through.'), true);
export const TERMINAL_TAB_ACTIVE_BORDER = registerColor('terminal.tab.activeBorder', TAB_ACTIVE_BORDER, nls.localize('terminal.tab.activeBorder', 'Border on the side of the terminal tab in the panel. This defaults to tab.activeBorder.'));
export const TERMINAL_INITIAL_HINT_FOREGROUND = registerColor('terminal.initialHintForeground', {
    dark: '#ffffff56',
    light: '#0007',
    hcDark: null,
    hcLight: null,
}, nls.localize('terminalInitialHintForeground', 'Foreground color of the terminal initial hint.'));
export const ansiColorMap = {
    'terminal.ansiBlack': {
        index: 0,
        defaults: {
            light: '#000000',
            dark: '#000000',
            hcDark: '#000000',
            hcLight: '#292929',
        },
    },
    'terminal.ansiRed': {
        index: 1,
        defaults: {
            light: '#cd3131',
            dark: '#cd3131',
            hcDark: '#cd0000',
            hcLight: '#cd3131',
        },
    },
    'terminal.ansiGreen': {
        index: 2,
        defaults: {
            light: '#107C10',
            dark: '#0DBC79',
            hcDark: '#00cd00',
            hcLight: '#136C13',
        },
    },
    'terminal.ansiYellow': {
        index: 3,
        defaults: {
            light: '#949800',
            dark: '#e5e510',
            hcDark: '#cdcd00',
            hcLight: '#949800',
        },
    },
    'terminal.ansiBlue': {
        index: 4,
        defaults: {
            light: '#0451a5',
            dark: '#2472c8',
            hcDark: '#0000ee',
            hcLight: '#0451a5',
        },
    },
    'terminal.ansiMagenta': {
        index: 5,
        defaults: {
            light: '#bc05bc',
            dark: '#bc3fbc',
            hcDark: '#cd00cd',
            hcLight: '#bc05bc',
        },
    },
    'terminal.ansiCyan': {
        index: 6,
        defaults: {
            light: '#0598bc',
            dark: '#11a8cd',
            hcDark: '#00cdcd',
            hcLight: '#0598bc',
        },
    },
    'terminal.ansiWhite': {
        index: 7,
        defaults: {
            light: '#555555',
            dark: '#e5e5e5',
            hcDark: '#e5e5e5',
            hcLight: '#555555',
        },
    },
    'terminal.ansiBrightBlack': {
        index: 8,
        defaults: {
            light: '#666666',
            dark: '#666666',
            hcDark: '#7f7f7f',
            hcLight: '#666666',
        },
    },
    'terminal.ansiBrightRed': {
        index: 9,
        defaults: {
            light: '#cd3131',
            dark: '#f14c4c',
            hcDark: '#ff0000',
            hcLight: '#cd3131',
        },
    },
    'terminal.ansiBrightGreen': {
        index: 10,
        defaults: {
            light: '#14CE14',
            dark: '#23d18b',
            hcDark: '#00ff00',
            hcLight: '#00bc00',
        },
    },
    'terminal.ansiBrightYellow': {
        index: 11,
        defaults: {
            light: '#b5ba00',
            dark: '#f5f543',
            hcDark: '#ffff00',
            hcLight: '#b5ba00',
        },
    },
    'terminal.ansiBrightBlue': {
        index: 12,
        defaults: {
            light: '#0451a5',
            dark: '#3b8eea',
            hcDark: '#5c5cff',
            hcLight: '#0451a5',
        },
    },
    'terminal.ansiBrightMagenta': {
        index: 13,
        defaults: {
            light: '#bc05bc',
            dark: '#d670d6',
            hcDark: '#ff00ff',
            hcLight: '#bc05bc',
        },
    },
    'terminal.ansiBrightCyan': {
        index: 14,
        defaults: {
            light: '#0598bc',
            dark: '#29b8db',
            hcDark: '#00ffff',
            hcLight: '#0598bc',
        },
    },
    'terminal.ansiBrightWhite': {
        index: 15,
        defaults: {
            light: '#a5a5a5',
            dark: '#e5e5e5',
            hcDark: '#ffffff',
            hcLight: '#a5a5a5',
        },
    },
};
export function registerColors() {
    for (const id in ansiColorMap) {
        const entry = ansiColorMap[id];
        const colorName = id.substring(13);
        ansiColorIdentifiers[entry.index] = registerColor(id, entry.defaults, nls.localize('terminal.ansiColor', "'{0}' ANSI color in the terminal.", colorName));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb2xvclJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsQ29sb3JSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNqRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFDTixhQUFhLEVBR2IsZUFBZSxFQUNmLHdCQUF3QixFQUN4QixnQ0FBZ0MsRUFDaEMseUJBQXlCLEVBQ3pCLFdBQVcsRUFDWCxvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLFlBQVksRUFDWixpQkFBaUIsR0FDakIsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQzs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBc0IsRUFBRSxDQUFBO0FBRXpELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDckQscUJBQXFCLEVBQ3JCLElBQUksRUFDSixHQUFHLENBQUMsUUFBUSxDQUNYLHFCQUFxQixFQUNyQixtR0FBbUcsQ0FDbkcsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsYUFBYSxDQUNyRCxxQkFBcUIsRUFDckI7SUFDQyxLQUFLLEVBQUUsU0FBUztJQUNoQixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUM1RSxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdB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