/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize } from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { workbenchConfigurationNodeBase, Extensions as WorkbenchExtensions, } from '../../../common/configuration.js';
import { AccessibilitySignal } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { AccessibilityVoiceSettingId, ISpeechService, SPEECH_LANGUAGES, } from '../../speech/common/speechService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { isDefined } from '../../../../base/common/types.js';
export const accessibilityHelpIsShown = new RawContextKey('accessibilityHelpIsShown', false, true);
export const accessibleViewIsShown = new RawContextKey('accessibleViewIsShown', false, true);
export const accessibleViewSupportsNavigation = new RawContextKey('accessibleViewSupportsNavigation', false, true);
export const accessibleViewVerbosityEnabled = new RawContextKey('accessibleViewVerbosityEnabled', false, true);
export const accessibleViewGoToSymbolSupported = new RawContextKey('accessibleViewGoToSymbolSupported', false, true);
export const accessibleViewOnLastLine = new RawContextKey('accessibleViewOnLastLine', false, true);
export const accessibleViewCurrentProviderId = new RawContextKey('accessibleViewCurrentProviderId', undefined, undefined);
export const accessibleViewInCodeBlock = new RawContextKey('accessibleViewInCodeBlock', undefined, undefined);
export const accessibleViewContainsCodeBlocks = new RawContextKey('accessibleViewContainsCodeBlocks', undefined, undefined);
export const accessibleViewHasUnassignedKeybindings = new RawContextKey('accessibleViewHasUnassignedKeybindings', undefined, undefined);
export const accessibleViewHasAssignedKeybindings = new RawContextKey('accessibleViewHasAssignedKeybindings', undefined, undefined);
/**
 * Miscellaneous settings tagged with accessibility and implemented in the accessibility contrib but
 * were better to live under workbench for discoverability.
 */
export var AccessibilityWorkbenchSettingId;
(function (AccessibilityWorkbenchSettingId) {
    AccessibilityWorkbenchSettingId["DimUnfocusedEnabled"] = "accessibility.dimUnfocused.enabled";
    AccessibilityWorkbenchSettingId["DimUnfocusedOpacity"] = "accessibility.dimUnfocused.opacity";
    AccessibilityWorkbenchSettingId["HideAccessibleView"] = "accessibility.hideAccessibleView";
    AccessibilityWorkbenchSettingId["AccessibleViewCloseOnKeyPress"] = "accessibility.accessibleView.closeOnKeyPress";
})(AccessibilityWorkbenchSettingId || (AccessibilityWorkbenchSettingId = {}));
export var ViewDimUnfocusedOpacityProperties;
(function (ViewDimUnfocusedOpacityProperties) {
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Default"] = 0.75] = "Default";
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Minimum"] = 0.2] = "Minimum";
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Maximum"] = 1] = "Maximum";
})(ViewDimUnfocusedOpacityProperties || (ViewDimUnfocusedOpacityProperties = {}));
export var AccessibilityVerbositySettingId;
(function (AccessibilityVerbositySettingId) {
    AccessibilityVerbositySettingId["Terminal"] = "accessibility.verbosity.terminal";
    AccessibilityVerbositySettingId["DiffEditor"] = "accessibility.verbosity.diffEditor";
    AccessibilityVerbositySettingId["MergeEditor"] = "accessibility.verbosity.mergeEditor";
    AccessibilityVerbositySettingId["Chat"] = "accessibility.verbosity.panelChat";
    AccessibilityVerbositySettingId["InlineChat"] = "accessibility.verbosity.inlineChat";
    AccessibilityVerbositySettingId["TerminalChat"] = "accessibility.verbosity.terminalChat";
    AccessibilityVerbositySettingId["InlineCompletions"] = "accessibility.verbosity.inlineCompletions";
    AccessibilityVerbositySettingId["KeybindingsEditor"] = "accessibility.verbosity.keybindingsEditor";
    AccessibilityVerbositySettingId["Notebook"] = "accessibility.verbosity.notebook";
    AccessibilityVerbositySettingId["Editor"] = "accessibility.verbosity.editor";
    AccessibilityVerbositySettingId["Hover"] = "accessibility.verbosity.hover";
    AccessibilityVerbositySettingId["Notification"] = "accessibility.verbosity.notification";
    AccessibilityVerbositySettingId["EmptyEditorHint"] = "accessibility.verbosity.emptyEditorHint";
    AccessibilityVerbositySettingId["ReplEditor"] = "accessibility.verbosity.replEditor";
    AccessibilityVerbositySettingId["Comments"] = "accessibility.verbosity.comments";
    AccessibilityVerbositySettingId["DiffEditorActive"] = "accessibility.verbosity.diffEditorActive";
    AccessibilityVerbositySettingId["Debug"] = "accessibility.verbosity.debug";
    AccessibilityVerbositySettingId["Walkthrough"] = "accessibility.verbosity.walkthrough";
    AccessibilityVerbositySettingId["SourceControl"] = "accessibility.verbosity.sourceControl";
})(AccessibilityVerbositySettingId || (AccessibilityVerbositySettingId = {}));
const baseVerbosityProperty = {
    type: 'boolean',
    default: true,
    tags: ['accessibility'],
};
export const accessibilityConfigurationNodeBase = Object.freeze({
    id: 'accessibility',
    title: localize('accessibilityConfigurationTitle', 'Accessibility'),
    type: 'object',
});
export const soundFeatureBase = {
    type: 'string',
    enum: ['auto', 'on', 'off'],
    default: 'auto',
    enumDescriptions: [
        localize('sound.enabled.auto', 'Enable sound when a screen reader is attached.'),
        localize('sound.enabled.on', 'Enable sound.'),
        localize('sound.enabled.off', 'Disable sound.'),
    ],
    tags: ['accessibility'],
};
const signalFeatureBase = {
    type: 'object',
    tags: ['accessibility'],
    additionalProperties: false,
    default: {
        sound: 'auto',
        announcement: 'auto',
    },
};
export const announcementFeatureBase = {
    type: 'string',
    enum: ['auto', 'off'],
    default: 'auto',
    enumDescriptions: [
        localize('announcement.enabled.auto', 'Enable announcement, will only play when in screen reader optimized mode.'),
        localize('announcement.enabled.off', 'Disable announcement.'),
    ],
    tags: ['accessibility'],
};
const defaultNoAnnouncement = {
    type: 'object',
    tags: ['accessibility'],
    additionalProperties: false,
    default: {
        sound: 'auto',
    },
};
const configuration = {
    ...accessibilityConfigurationNodeBase,
    scope: 5 /* ConfigurationScope.RESOURCE */,
    properties: {
        ["accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */]: {
            description: localize('verbosity.terminal.description', 'Provide information about how to access the terminal accessibility help menu when the terminal is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.diffEditor" /* AccessibilityVerbositySettingId.DiffEditor */]: {
            description: localize('verbosity.diffEditor.description', 'Provide information about how to navigate changes in the diff editor when it is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */]: {
            description: localize('verbosity.chat.description', 'Provide information about how to access the chat help menu when the chat input is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */]: {
            description: localize('verbosity.interactiveEditor.description', 'Provide information about how to access the inline editor chat accessibility help menu and alert with hints that describe how to use the feature when the input is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.inlineCompletions" /* AccessibilityVerbositySettingId.InlineCompletions */]: {
            description: localize('verbosity.inlineCompletions.description', 'Provide information about how to access the inline completions hover and Accessible View.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.keybindingsEditor" /* AccessibilityVerbositySettingId.KeybindingsEditor */]: {
            description: localize('verbosity.keybindingsEditor.description', 'Provide information about how to change a keybinding in the keybindings editor when a row is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */]: {
            description: localize('verbosity.notebook', 'Provide information about how to focus the cell container or inner editor when a notebook cell is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.hover" /* AccessibilityVerbositySettingId.Hover */]: {
            description: localize('verbosity.hover', 'Provide information about how to open the hover in an Accessible View.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.notification" /* AccessibilityVerbositySettingId.Notification */]: {
            description: localize('verbosity.notification', 'Provide information about how to open the notification in an Accessible View.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */]: {
            description: localize('verbosity.emptyEditorHint', 'Provide information about relevant actions in an empty text editor.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */]: {
            description: localize('verbosity.replEditor.description', 'Provide information about how to access the REPL editor accessibility help menu when the REPL editor is focused.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */]: {
            description: localize('verbosity.comments', 'Provide information about actions that can be taken in the comment widget or in a file which contains comments.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */]: {
            description: localize('verbosity.diffEditorActive', 'Indicate when a diff editor becomes the active editor.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */]: {
            description: localize('verbosity.debug', 'Provide information about how to access the debug console accessibility help dialog when the debug console or run and debug viewlet is focused. Note that a reload of the window is required for this to take effect.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */]: {
            description: localize('verbosity.walkthrough', 'Provide information about how to open the walkthrough in an Accessible View.'),
            ...baseVerbosityProperty,
        },
        ["accessibility.accessibleView.closeOnKeyPress" /* AccessibilityWorkbenchSettingId.AccessibleViewCloseOnKeyPress */]: {
            markdownDescription: localize('terminal.integrated.accessibleView.closeOnKeyPress', 'On keypress, close the Accessible View and focus the element from which it was invoked.'),
            type: 'boolean',
            default: true,
        },
        ["accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */]: {
            description: localize('verbosity.scm', 'Provide information about how to access the source control accessibility help menu when the input is focused.'),
            ...baseVerbosityProperty,
        },
        'accessibility.signalOptions.volume': {
            description: localize('accessibility.signalOptions.volume', 'The volume of the sounds in percent (0-100).'),
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 70,
            tags: ['accessibility'],
        },
        'accessibility.signalOptions.debouncePositionChanges': {
            description: localize('accessibility.signalOptions.debouncePositionChanges', 'Whether or not position changes should be debounced'),
            type: 'boolean',
            default: false,
            tags: ['accessibility'],
        },
        'accessibility.signalOptions.experimental.delays.general': {
            type: 'object',
            description: 'Delays for all signals besides error and warning at position',
            additionalProperties: false,
            properties: {
                announcement: {
                    description: localize('accessibility.signalOptions.delays.general.announcement', 'The delay in milliseconds before an announcement is made.'),
                    type: 'number',
                    minimum: 0,
                    default: 3000,
                },
                sound: {
                    description: localize('accessibility.signalOptions.delays.general.sound', 'The delay in milliseconds before a sound is played.'),
                    type: 'number',
                    minimum: 0,
                    default: 400,
                },
            },
            tags: ['accessibility'],
        },
        'accessibility.signalOptions.experimental.delays.warningAtPosition': {
            type: 'object',
            additionalProperties: false,
            properties: {
                announcement: {
                    description: localize('accessibility.signalOptions.delays.warningAtPosition.announcement', "The delay in milliseconds before an announcement is made when there's a warning at the position."),
                    type: 'number',
                    minimum: 0,
                    default: 3000,
                },
                sound: {
                    description: localize('accessibility.signalOptions.delays.warningAtPosition.sound', "The delay in milliseconds before a sound is played when there's a warning at the position."),
                    type: 'number',
                    minimum: 0,
                    default: 1000,
                },
            },
            tags: ['accessibility'],
        },
        'accessibility.signalOptions.experimental.delays.errorAtPosition': {
            type: 'object',
            additionalProperties: false,
            properties: {
                announcement: {
                    description: localize('accessibility.signalOptions.delays.errorAtPosition.announcement', "The delay in milliseconds before an announcement is made when there's an error at the position."),
                    type: 'number',
                    minimum: 0,
                    default: 3000,
                },
                sound: {
                    description: localize('accessibility.signalOptions.delays.errorAtPosition.sound', "The delay in milliseconds before a sound is played when there's an error at the position."),
                    type: 'number',
                    minimum: 0,
                    default: 1000,
                },
            },
            tags: ['accessibility'],
        },
        'accessibility.signals.lineHasBreakpoint': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.lineHasBreakpoint', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a breakpoint.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.lineHasBreakpoint.sound', 'Plays a sound when the active line has a breakpoint.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.lineHasBreakpoint.announcement', 'Announces when the active line has a breakpoint.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.lineHasInlineSuggestion': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.lineHasInlineSuggestion', 'Plays a sound / audio cue when the active line has an inline suggestion.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.lineHasInlineSuggestion.sound', 'Plays a sound when the active line has an inline suggestion.'),
                    ...soundFeatureBase,
                    default: 'off',
                },
            },
        },
        'accessibility.signals.lineHasError': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.lineHasError', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has an error.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.lineHasError.sound', 'Plays a sound when the active line has an error.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.lineHasError.announcement', 'Announces when the active line has an error.'),
                    ...announcementFeatureBase,
                    default: 'off',
                },
            },
        },
        'accessibility.signals.lineHasFoldedArea': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.lineHasFoldedArea', 'Plays a signal - sound (audio cue) and/or announcement (alert) - the active line has a folded area that can be unfolded.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.lineHasFoldedArea.sound', 'Plays a sound when the active line has a folded area that can be unfolded.'),
                    ...soundFeatureBase,
                    default: 'off',
                },
                announcement: {
                    description: localize('accessibility.signals.lineHasFoldedArea.announcement', 'Announces when the active line has a folded area that can be unfolded.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.lineHasWarning': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.lineHasWarning', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.lineHasWarning.sound', 'Plays a sound when the active line has a warning.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.lineHasWarning.announcement', 'Announces when the active line has a warning.'),
                    ...announcementFeatureBase,
                    default: 'off',
                },
            },
        },
        'accessibility.signals.positionHasError': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.positionHasError', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.positionHasError.sound', 'Plays a sound when the active line has a warning.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.positionHasError.announcement', 'Announces when the active line has a warning.'),
                    ...announcementFeatureBase,
                    default: 'on',
                },
            },
        },
        'accessibility.signals.positionHasWarning': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.positionHasWarning', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.positionHasWarning.sound', 'Plays a sound when the active line has a warning.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.positionHasWarning.announcement', 'Announces when the active line has a warning.'),
                    ...announcementFeatureBase,
                    default: 'on',
                },
            },
        },
        'accessibility.signals.onDebugBreak': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.onDebugBreak', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the debugger stopped on a breakpoint.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.onDebugBreak.sound', 'Plays a sound when the debugger stopped on a breakpoint.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.onDebugBreak.announcement', 'Announces when the debugger stopped on a breakpoint.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.noInlayHints': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.noInlayHints', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when trying to read a line with inlay hints that has no inlay hints.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.noInlayHints.sound', 'Plays a sound when trying to read a line with inlay hints that has no inlay hints.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.noInlayHints.announcement', 'Announces when trying to read a line with inlay hints that has no inlay hints.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.taskCompleted': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.taskCompleted', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a task is completed.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.taskCompleted.sound', 'Plays a sound when a task is completed.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.taskCompleted.announcement', 'Announces when a task is completed.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.taskFailed': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.taskFailed', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a task fails (non-zero exit code).'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.taskFailed.sound', 'Plays a sound when a task fails (non-zero exit code).'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.taskFailed.announcement', 'Announces when a task fails (non-zero exit code).'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.terminalCommandFailed': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.terminalCommandFailed', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.terminalCommandFailed.sound', 'Plays a sound when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.terminalCommandFailed.announcement', 'Announces when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.terminalCommandSucceeded': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.terminalCommandSucceeded', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.terminalCommandSucceeded.sound', 'Plays a sound when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.terminalCommandSucceeded.announcement', 'Announces when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.terminalQuickFix': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.terminalQuickFix', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when terminal Quick Fixes are available.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.terminalQuickFix.sound', 'Plays a sound when terminal Quick Fixes are available.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.terminalQuickFix.announcement', 'Announces when terminal Quick Fixes are available.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.terminalBell': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.terminalBell', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when the terminal bell is ringing.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.terminalBell.sound', 'Plays a sound when the terminal bell is ringing.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.terminalBell.announcement', 'Announces when the terminal bell is ringing.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.diffLineInserted': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.diffLineInserted', 'Plays a sound / audio cue when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.sound', 'Plays a sound when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.diffLineModified': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.diffLineModified', 'Plays a sound / audio cue when the focus moves to an modified line in Accessible Diff Viewer mode or to the next/previous change.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.diffLineModified.sound', 'Plays a sound when the focus moves to a modified line in Accessible Diff Viewer mode or to the next/previous change.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.diffLineDeleted': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.diffLineDeleted', 'Plays a sound / audio cue when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.diffLineDeleted.sound', 'Plays a sound when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.chatEditModifiedFile': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.chatEditModifiedFile', 'Plays a sound / audio cue when revealing a file with changes from chat edits'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.chatEditModifiedFile.sound', 'Plays a sound when revealing a file with changes from chat edits'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.notebookCellCompleted': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.notebookCellCompleted', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution is successfully completed.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.notebookCellCompleted.sound', 'Plays a sound when a notebook cell execution is successfully completed.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.notebookCellCompleted.announcement', 'Announces when a notebook cell execution is successfully completed.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.notebookCellFailed': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.notebookCellFailed', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution fails.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.notebookCellFailed.sound', 'Plays a sound when a notebook cell execution fails.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.notebookCellFailed.announcement', 'Announces when a notebook cell execution fails.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.progress': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.progress', 'Plays a signal - sound (audio cue) and/or announcement (alert) - on loop while progress is occurring.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.progress.sound', 'Plays a sound on loop while progress is occurring.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.progress.announcement', 'Alerts on loop while progress is occurring.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.chatRequestSent': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.chatRequestSent', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a chat request is made.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.chatRequestSent.sound', 'Plays a sound when a chat request is made.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.chatRequestSent.announcement', 'Announces when a chat request is made.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.chatResponseReceived': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.chatResponseReceived', 'Plays a sound / audio cue when the response has been received.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.chatResponseReceived.sound', 'Plays a sound on when the response has been received.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.codeActionTriggered': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.codeActionTriggered', 'Plays a sound / audio cue - when a code action has been triggered.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.codeActionTriggered.sound', 'Plays a sound when a code action has been triggered.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.codeActionApplied': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.codeActionApplied', 'Plays a sound / audio cue when the code action has been applied.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.codeActionApplied.sound', 'Plays a sound when the code action has been applied.'),
                    ...soundFeatureBase,
                },
            },
        },
        'accessibility.signals.voiceRecordingStarted': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.voiceRecordingStarted', 'Plays a sound / audio cue when the voice recording has started.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.voiceRecordingStarted.sound', 'Plays a sound when the voice recording has started.'),
                    ...soundFeatureBase,
                },
            },
            default: {
                sound: 'on',
            },
        },
        'accessibility.signals.voiceRecordingStopped': {
            ...defaultNoAnnouncement,
            description: localize('accessibility.signals.voiceRecordingStopped', 'Plays a sound / audio cue when the voice recording has stopped.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.voiceRecordingStopped.sound', 'Plays a sound when the voice recording has stopped.'),
                    ...soundFeatureBase,
                    default: 'off',
                },
            },
        },
        'accessibility.signals.clear': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.clear', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a feature is cleared (for example, the terminal, Debug Console, or Output channel).'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.clear.sound', 'Plays a sound when a feature is cleared.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.clear.announcement', 'Announces when a feature is cleared.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.editsUndone': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.editsUndone', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when edits have been undone.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.editsUndone.sound', 'Plays a sound when edits have been undone.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.editsUndone.announcement', 'Announces when edits have been undone.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.editsKept': {
            ...signalFeatureBase,
            description: localize('accessibility.signals.editsKept', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when edits are kept.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.editsKept.sound', 'Plays a sound when edits are kept.'),
                    ...soundFeatureBase,
                },
                announcement: {
                    description: localize('accessibility.signals.editsKept.announcement', 'Announces when edits are kept.'),
                    ...announcementFeatureBase,
                },
            },
        },
        'accessibility.signals.save': {
            type: 'object',
            tags: ['accessibility'],
            additionalProperties: false,
            markdownDescription: localize('accessibility.signals.save', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a file is saved.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.save.sound', 'Plays a sound when a file is saved.'),
                    type: 'string',
                    enum: ['userGesture', 'always', 'never'],
                    default: 'never',
                    enumDescriptions: [
                        localize('accessibility.signals.save.sound.userGesture', 'Plays the sound when a user explicitly saves a file.'),
                        localize('accessibility.signals.save.sound.always', 'Plays the sound whenever a file is saved, including auto save.'),
                        localize('accessibility.signals.save.sound.never', 'Never plays the sound.'),
                    ],
                },
                announcement: {
                    description: localize('accessibility.signals.save.announcement', 'Announces when a file is saved.'),
                    type: 'string',
                    enum: ['userGesture', 'always', 'never'],
                    default: 'never',
                    enumDescriptions: [
                        localize('accessibility.signals.save.announcement.userGesture', 'Announces when a user explicitly saves a file.'),
                        localize('accessibility.signals.save.announcement.always', 'Announces whenever a file is saved, including auto save.'),
                        localize('accessibility.signals.save.announcement.never', 'Never plays the announcement.'),
                    ],
                },
            },
            default: {
                sound: 'never',
                announcement: 'never',
            },
        },
        'accessibility.signals.format': {
            type: 'object',
            tags: ['accessibility'],
            additionalProperties: false,
            markdownDescription: localize('accessibility.signals.format', 'Plays a signal - sound (audio cue) and/or announcement (alert) - when a file or notebook is formatted.'),
            properties: {
                sound: {
                    description: localize('accessibility.signals.format.sound', 'Plays a sound when a file or notebook is formatted.'),
                    type: 'string',
                    enum: ['userGesture', 'always', 'never'],
                    default: 'never',
                    enumDescriptions: [
                        localize('accessibility.signals.format.userGesture', 'Plays the sound when a user explicitly formats a file.'),
                        localize('accessibility.signals.format.always', 'Plays the sound whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell.'),
                        localize('accessibility.signals.format.never', 'Never plays the sound.'),
                    ],
                },
                announcement: {
                    description: localize('accessibility.signals.format.announcement', 'Announces when a file or notebook is formatted.'),
                    type: 'string',
                    enum: ['userGesture', 'always', 'never'],
                    default: 'never',
                    enumDescriptions: [
                        localize('accessibility.signals.format.announcement.userGesture', 'Announces when a user explicitly formats a file.'),
                        localize('accessibility.signals.format.announcement.always', 'Announces whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell.'),
                        localize('accessibility.signals.format.announcement.never', 'Never announces.'),
                    ],
                },
            },
            default: {
                sound: 'never',
                announcement: 'never',
            },
        },
        'accessibility.underlineLinks': {
            type: 'boolean',
            description: localize('accessibility.underlineLinks', 'Controls whether links should be underlined in the workbench.'),
            default: false,
        },
        'accessibility.debugWatchVariableAnnouncements': {
            type: 'boolean',
            description: localize('accessibility.debugWatchVariableAnnouncements', 'Controls whether variable changes should be announced in the debug watch view.'),
            default: true,
        },
        'accessibility.replEditor.readLastExecutionOutput': {
            type: 'boolean',
            description: localize('accessibility.replEditor.readLastExecutedOutput', 'Controls whether the output from an execution in the native REPL will be announced.'),
            default: true,
        },
        'accessibility.replEditor.autoFocusReplExecution': {
            type: 'string',
            enum: ['none', 'input', 'lastExecution'],
            default: 'input',
            description: localize('replEditor.autoFocusAppendedCell', 'Control whether focus should automatically be sent to the REPL when code is executed.'),
        },
        'accessibility.windowTitleOptimized': {
            type: 'boolean',
            default: true,
            markdownDescription: localize('accessibility.windowTitleOptimized', 'Controls whether the {0} should be optimized for screen readers when in screen reader mode. When enabled, the window title will have {1} appended to the end.', '`#window.title#`', '`activeEditorState`'),
        },
    },
};
export function registerAccessibilityConfiguration() {
    const registry = Registry.as(Extensions.Configuration);
    registry.registerConfiguration(configuration);
    registry.registerConfiguration({
        ...workbenchConfigurationNodeBase,
        properties: {
            ["accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */]: {
                description: localize('dimUnfocusedEnabled', 'Whether to dim unfocused editors and terminals, which makes it more clear where typed input will go to. This works with the majority of editors with the notable exceptions of those that utilize iframes like notebooks and extension webview editors.'),
                type: 'boolean',
                default: false,
                tags: ['accessibility'],
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
            ["accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */]: {
                markdownDescription: localize('dimUnfocusedOpacity', 'The opacity fraction (0.2 to 1.0) to use for unfocused editors and terminals. This will only take effect when {0} is enabled.', `\`#${"accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */}#\``),
                type: 'number',
                minimum: 0.2 /* ViewDimUnfocusedOpacityProperties.Minimum */,
                maximum: 1 /* ViewDimUnfocusedOpacityProperties.Maximum */,
                default: 0.75 /* ViewDimUnfocusedOpacityProperties.Default */,
                tags: ['accessibility'],
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
            ["accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */]: {
                description: localize('accessibility.hideAccessibleView', 'Controls whether the Accessible View is hidden.'),
                type: 'boolean',
                default: false,
                tags: ['accessibility'],
            },
        },
    });
}
export { AccessibilityVoiceSettingId };
export const SpeechTimeoutDefault = 1200;
let DynamicSpeechAccessibilityConfiguration = class DynamicSpeechAccessibilityConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicSpeechAccessibilityConfiguration'; }
    constructor(speechService) {
        super();
        this.speechService = speechService;
        this._register(Event.runAndSubscribe(speechService.onDidChangeHasSpeechProvider, () => this.updateConfiguration()));
    }
    updateConfiguration() {
        if (!this.speechService.hasSpeechProvider) {
            return; // these settings require a speech provider
        }
        const languages = this.getLanguages();
        const languagesSorted = Object.keys(languages).sort((langA, langB) => {
            return languages[langA].name.localeCompare(languages[langB].name);
        });
        const registry = Registry.as(Extensions.Configuration);
        registry.registerConfiguration({
            ...accessibilityConfigurationNodeBase,
            properties: {
                ["accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */]: {
                    markdownDescription: localize('voice.speechTimeout', 'The duration in milliseconds that voice speech recognition remains active after you stop speaking. For example in a chat session, the transcribed text is submitted automatically after the timeout is met. Set to `0` to disable this feature.'),
                    type: 'number',
                    default: SpeechTimeoutDefault,
                    minimum: 0,
                    tags: ['accessibility'],
                },
                ["accessibility.voice.ignoreCodeBlocks" /* AccessibilityVoiceSettingId.IgnoreCodeBlocks */]: {
                    markdownDescription: localize('voice.ignoreCodeBlocks', 'Whether to ignore code snippets in text-to-speech synthesis.'),
                    type: 'boolean',
                    default: false,
                    tags: ['accessibility'],
                },
                ["accessibility.voice.speechLanguage" /* AccessibilityVoiceSettingId.SpeechLanguage */]: {
                    markdownDescription: localize('voice.speechLanguage', 'The language that text-to-speech and speech-to-text should use. Select `auto` to use the configured display language if possible. Note that not all display languages maybe supported by speech recognition and synthesizers.'),
                    type: 'string',
                    enum: languagesSorted,
                    default: 'auto',
                    tags: ['accessibility'],
                    enumDescriptions: languagesSorted.map((key) => languages[key].name),
                    enumItemLabels: languagesSorted.map((key) => languages[key].name),
                },
                ["accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */]: {
                    type: 'string',
                    enum: ['on', 'off'],
                    enumDescriptions: [
                        localize('accessibility.voice.autoSynthesize.on', 'Enable the feature. When a screen reader is enabled, note that this will disable aria updates.'),
                        localize('accessibility.voice.autoSynthesize.off', 'Disable the feature.'),
                    ],
                    markdownDescription: localize('autoSynthesize', 'Whether a textual response should automatically be read out aloud when speech was used as input. For example in a chat session, a response is automatically synthesized when voice was used as chat request.'),
                    default: 'off',
                    tags: ['accessibility'],
                },
            },
        });
    }
    getLanguages() {
        return {
            ['auto']: {
                name: localize('speechLanguage.auto', 'Auto (Use Display Language)'),
            },
            ...SPEECH_LANGUAGES,
        };
    }
};
DynamicSpeechAccessibilityConfiguration = __decorate([
    __param(0, ISpeechService)
], DynamicSpeechAccessibilityConfiguration);
export { DynamicSpeechAccessibilityConfiguration };
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'audioCues.volume',
        migrateFn: (value, accessor) => {
            return [
                ['accessibility.signalOptions.volume', { value }],
                ['audioCues.volume', { value: undefined }],
            ];
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'audioCues.debouncePositionChanges',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.debouncePositionChanges', { value }],
                ['audioCues.debouncePositionChanges', { value: undefined }],
            ];
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'accessibility.signalOptions',
        migrateFn: (value, accessor) => {
            const delayGeneral = getDelaysFromConfig(accessor, 'general');
            const delayError = getDelaysFromConfig(accessor, 'errorAtPosition');
            const delayWarning = getDelaysFromConfig(accessor, 'warningAtPosition');
            const volume = getVolumeFromConfig(accessor);
            const debouncePositionChanges = getDebouncePositionChangesFromConfig(accessor);
            const result = [];
            if (!!volume) {
                result.push(['accessibility.signalOptions.volume', { value: volume }]);
            }
            if (!!delayGeneral) {
                result.push([
                    'accessibility.signalOptions.experimental.delays.general',
                    { value: delayGeneral },
                ]);
            }
            if (!!delayError) {
                result.push([
                    'accessibility.signalOptions.experimental.delays.errorAtPosition',
                    { value: delayError },
                ]);
            }
            if (!!delayWarning) {
                result.push([
                    'accessibility.signalOptions.experimental.delays.warningAtPosition',
                    { value: delayWarning },
                ]);
            }
            if (!!debouncePositionChanges) {
                result.push([
                    'accessibility.signalOptions.debouncePositionChanges',
                    { value: debouncePositionChanges },
                ]);
            }
            result.push(['accessibility.signalOptions', { value: undefined }]);
            return result;
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'accessibility.signals.sounds.volume',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.volume', { value }],
                ['accessibility.signals.sounds.volume', { value: undefined }],
            ];
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'accessibility.signals.debouncePositionChanges',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.debouncePositionChanges', { value }],
                ['accessibility.signals.debouncePositionChanges', { value: undefined }],
            ];
        },
    },
]);
function getDelaysFromConfig(accessor, type) {
    return (accessor(`accessibility.signalOptions.experimental.delays.${type}`) ||
        accessor('accessibility.signalOptions')?.['experimental.delays']?.[`${type}`] ||
        accessor('accessibility.signalOptions')?.['delays']?.[`${type}`]);
}
function getVolumeFromConfig(accessor) {
    return (accessor('accessibility.signalOptions.volume') ||
        accessor('accessibility.signalOptions')?.volume ||
        accessor('accessibility.signals.sounds.volume') ||
        accessor('audioCues.volume'));
}
function getDebouncePositionChangesFromConfig(accessor) {
    return (accessor('accessibility.signalOptions.debouncePositionChanges') ||
        accessor('accessibility.signalOptions')?.debouncePositionChanges ||
        accessor('accessibility.signals.debouncePositionChanges') ||
        accessor('audioCues.debouncePositionChanges'));
}
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: "accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */,
        migrateFn: (value) => {
            let newValue;
            if (value === true) {
                newValue = 'on';
            }
            else if (value === false) {
                newValue = 'off';
            }
            else {
                return [];
            }
            return [["accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */, { value: newValue }]];
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'accessibility.signals.chatResponsePending',
        migrateFn: (value, accessor) => {
            return [
                ['accessibility.signals.progress', { value }],
                ['accessibility.signals.chatResponsePending', { value: undefined }],
            ];
        },
    },
]);
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations(AccessibilitySignal.allAccessibilitySignals
    .map((item) => item.legacySoundSettingsKey
    ? {
        key: item.legacySoundSettingsKey,
        migrateFn: (sound, accessor) => {
            const configurationKeyValuePairs = [];
            const legacyAnnouncementSettingsKey = item.legacyAnnouncementSettingsKey;
            let announcement;
            if (legacyAnnouncementSettingsKey) {
                announcement = accessor(legacyAnnouncementSettingsKey) ?? undefined;
                if (announcement !== undefined && typeof announcement !== 'string') {
                    announcement = announcement ? 'auto' : 'off';
                }
            }
            configurationKeyValuePairs.push([
                `${item.legacySoundSettingsKey}`,
                { value: undefined },
            ]);
            configurationKeyValuePairs.push([
                `${item.settingsKey}`,
                { value: announcement !== undefined ? { announcement, sound } : { sound } },
            ]);
            return configurationKeyValuePairs;
        },
    }
    : undefined)
    .filter(isDefined));
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations(AccessibilitySignal.allAccessibilitySignals
    .filter((i) => !!i.legacyAnnouncementSettingsKey && !!i.legacySoundSettingsKey)
    .map((item) => ({
    key: item.legacyAnnouncementSettingsKey,
    migrateFn: (announcement, accessor) => {
        const configurationKeyValuePairs = [];
        const sound = accessor(item.settingsKey)?.sound || accessor(item.legacySoundSettingsKey);
        if (announcement !== undefined && typeof announcement !== 'string') {
            announcement = announcement ? 'auto' : 'off';
        }
        configurationKeyValuePairs.push([
            `${item.settingsKey}`,
            { value: announcement !== undefined ? { announcement, sound } : { sound } },
        ]);
        configurationKeyValuePairs.push([
            `${item.legacyAnnouncementSettingsKey}`,
            { value: undefined },
        ]);
        configurationKeyValuePairs.push([`${item.legacySoundSettingsKey}`, { value: undefined }]);
        return configurationKeyValuePairs;
    },
})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLFVBQVUsR0FJVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixVQUFVLElBQUksbUJBQW1CLEdBSWpDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDcEgsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixjQUFjLEVBQ2QsZ0JBQWdCLEdBQ2hCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxhQUFhLENBQ3hELDBCQUEwQixFQUMxQixLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FDckQsdUJBQXVCLEVBQ3ZC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