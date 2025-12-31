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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJpbGl0eUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixVQUFVLEdBSVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsVUFBVSxJQUFJLG1CQUFtQixHQUlqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQ3BILE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsY0FBYyxFQUNkLGdCQUFnQixHQUNoQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTVELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksYUFBYSxDQUN4RCwwQkFBMEIsRUFDMUIsS0FBSyxFQUNMLElBQUksQ0FDSixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxhQUFhLENBQ3JELHVCQUF1QixFQUN2QixLQUFLLEVBQ0wsSUFBSSxDQUNKLENB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