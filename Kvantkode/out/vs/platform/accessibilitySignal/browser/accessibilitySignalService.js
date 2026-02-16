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
import { CachedFunction } from '../../../base/common/cache.js';
import { getStructuralKey } from '../../../base/common/equals.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { derived, observableFromEvent, ValueWithChangeEventFromObservable, } from '../../../base/common/observable.js';
import { localize } from '../../../nls.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { observableConfigValue } from '../../observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
export const IAccessibilitySignalService = createDecorator('accessibilitySignalService');
/** Make sure you understand the doc comments of the method you want to call when using this token! */
export const AcknowledgeDocCommentsToken = Symbol('AcknowledgeDocCommentsToken');
let AccessibilitySignalService = class AccessibilitySignalService extends Disposable {
    constructor(configurationService, accessibilityService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.telemetryService = telemetryService;
        this.sounds = new Map();
        this.screenReaderAttached = observableFromEvent(this, this.accessibilityService.onDidChangeScreenReaderOptimized, () => 
        /** @description accessibilityService.onDidChangeScreenReaderOptimized */ this.accessibilityService.isScreenReaderOptimized());
        this.sentTelemetry = new Set();
        this.playingSounds = new Set();
        this._signalConfigValue = new CachedFunction((signal) => observableConfigValue(signal.settingsKey, { sound: 'off', announcement: 'off' }, this.configurationService));
        this._signalEnabledState = new CachedFunction({ getCacheKey: getStructuralKey }, (arg) => {
            return derived((reader) => {
                /** @description sound enabled */
                const setting = this._signalConfigValue.get(arg.signal).read(reader);
                if (arg.modality === 'sound' || arg.modality === undefined) {
                    if (checkEnabledState(setting.sound, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                if (arg.modality === 'announcement' || arg.modality === undefined) {
                    if (checkEnabledState(setting.announcement, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                return false;
            }).recomputeInitiallyAndOnChange(this._store);
        });
    }
    getEnabledState(signal, userGesture, modality) {
        return new ValueWithChangeEventFromObservable(this._signalEnabledState.get({ signal, userGesture, modality }));
    }
    async playSignal(signal, options = {}) {
        const shouldPlayAnnouncement = options.modality === 'announcement' || options.modality === undefined;
        const announcementMessage = signal.announcementMessage;
        if (shouldPlayAnnouncement &&
            this.isAnnouncementEnabled(signal, options.userGesture) &&
            announcementMessage) {
            this.accessibilityService.status(announcementMessage);
        }
        const shouldPlaySound = options.modality === 'sound' || options.modality === undefined;
        if (shouldPlaySound && this.isSoundEnabled(signal, options.userGesture)) {
            this.sendSignalTelemetry(signal, options.source);
            await this.playSound(signal.sound.getSound(), options.allowManyInParallel);
        }
    }
    async playSignals(signals) {
        for (const signal of signals) {
            this.sendSignalTelemetry('signal' in signal ? signal.signal : signal, 'source' in signal ? signal.source : undefined);
        }
        const signalArray = signals.map((s) => ('signal' in s ? s.signal : s));
        const announcements = signalArray
            .filter((signal) => this.isAnnouncementEnabled(signal))
            .map((s) => s.announcementMessage);
        if (announcements.length) {
            this.accessibilityService.status(announcements.join(', '));
        }
        // Some sounds are reused. Don't play the same sound twice.
        const sounds = new Set(signalArray
            .filter((signal) => this.isSoundEnabled(signal))
            .map((signal) => signal.sound.getSound()));
        await Promise.all(Array.from(sounds).map((sound) => this.playSound(sound, true)));
    }
    sendSignalTelemetry(signal, source) {
        const isScreenReaderOptimized = this.accessibilityService.isScreenReaderOptimized();
        const key = signal.name +
            (source ? `::${source}` : '') +
            (isScreenReaderOptimized ? '{screenReaderOptimized}' : '');
        // Only send once per user session
        if (this.sentTelemetry.has(key) || this.getVolumeInPercent() === 0) {
            return;
        }
        this.sentTelemetry.add(key);
        this.telemetryService.publicLog2('signal.played', {
            signal: signal.name,
            source: source ?? '',
            isScreenReaderOptimized,
        });
    }
    getVolumeInPercent() {
        const volume = this.configurationService.getValue('accessibility.signalOptions.volume');
        if (typeof volume !== 'number') {
            return 50;
        }
        return Math.max(Math.min(volume, 100), 0);
    }
    async playSound(sound, allowManyInParallel = false) {
        if (!allowManyInParallel && this.playingSounds.has(sound)) {
            return;
        }
        this.playingSounds.add(sound);
        const url = FileAccess.asBrowserUri(`vs/platform/accessibilitySignal/browser/media/${sound.fileName}`).toString(true);
        try {
            const sound = this.sounds.get(url);
            if (sound) {
                sound.volume = this.getVolumeInPercent() / 100;
                sound.currentTime = 0;
                await sound.play();
            }
            else {
                const playedSound = await playAudio(url, this.getVolumeInPercent() / 100);
                this.sounds.set(url, playedSound);
            }
        }
        catch (e) {
            if (!e.message.includes('play() can only be initiated by a user gesture')) {
                // tracking this issue in #178642, no need to spam the console
                console.error('Error while playing sound', e);
            }
        }
        finally {
            this.playingSounds.delete(sound);
        }
    }
    playSignalLoop(signal, milliseconds) {
        let playing = true;
        const playSound = () => {
            if (playing) {
                this.playSignal(signal, { allowManyInParallel: true }).finally(() => {
                    setTimeout(() => {
                        if (playing) {
                            playSound();
                        }
                    }, milliseconds);
                });
            }
        };
        playSound();
        return toDisposable(() => (playing = false));
    }
    isAnnouncementEnabled(signal, userGesture) {
        if (!signal.announcementMessage) {
            return false;
        }
        return this._signalEnabledState
            .get({ signal, userGesture: !!userGesture, modality: 'announcement' })
            .get();
    }
    isSoundEnabled(signal, userGesture) {
        return this._signalEnabledState
            .get({ signal, userGesture: !!userGesture, modality: 'sound' })
            .get();
    }
    onSoundEnabledChanged(signal) {
        return this.getEnabledState(signal, false).onDidChange;
    }
    getDelayMs(signal, modality, mode) {
        if (!this.configurationService.getValue('accessibility.signalOptions.debouncePositionChanges')) {
            return 0;
        }
        let value;
        if (signal.name === AccessibilitySignal.errorAtPosition.name && mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.errorAtPosition');
        }
        else if (signal.name === AccessibilitySignal.warningAtPosition.name &&
            mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.warningAtPosition');
        }
        else {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.general');
        }
        return modality === 'sound' ? value.sound : value.announcement;
    }
};
AccessibilitySignalService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IAccessibilityService),
    __param(2, ITelemetryService)
], AccessibilitySignalService);
export { AccessibilitySignalService };
function checkEnabledState(state, getScreenReaderAttached, isTriggeredByUserGesture) {
    return (state === 'on' ||
        state === 'always' ||
        (state === 'auto' && getScreenReaderAttached()) ||
        (state === 'userGesture' && isTriggeredByUserGesture));
}
/**
 * Play the given audio url.
 * @volume value between 0 and 1
 */
function playAudio(url, volume) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.addEventListener('ended', () => {
            resolve(audio);
        });
        audio.addEventListener('error', (e) => {
            // When the error event fires, ended might not be called
            reject(e.error);
        });
        audio.play().catch((e) => {
            // When play fails, the error event is not fired.
            reject(e);
        });
    });
}
/**
 * Corresponds to the audio files in ./media.
 */
export class Sound {
    static register(options) {
        const sound = new Sound(options.fileName);
        return sound;
    }
    static { this.error = Sound.register({ fileName: 'error.mp3' }); }
    static { this.warning = Sound.register({ fileName: 'warning.mp3' }); }
    static { this.success = Sound.register({ fileName: 'success.mp3' }); }
    static { this.foldedArea = Sound.register({ fileName: 'foldedAreas.mp3' }); }
    static { this.break = Sound.register({ fileName: 'break.mp3' }); }
    static { this.quickFixes = Sound.register({ fileName: 'quickFixes.mp3' }); }
    static { this.taskCompleted = Sound.register({ fileName: 'taskCompleted.mp3' }); }
    static { this.taskFailed = Sound.register({ fileName: 'taskFailed.mp3' }); }
    static { this.terminalBell = Sound.register({ fileName: 'terminalBell.mp3' }); }
    static { this.diffLineInserted = Sound.register({ fileName: 'diffLineInserted.mp3' }); }
    static { this.diffLineDeleted = Sound.register({ fileName: 'diffLineDeleted.mp3' }); }
    static { this.diffLineModified = Sound.register({ fileName: 'diffLineModified.mp3' }); }
    static { this.requestSent = Sound.register({ fileName: 'requestSent.mp3' }); }
    static { this.responseReceived1 = Sound.register({ fileName: 'responseReceived1.mp3' }); }
    static { this.responseReceived2 = Sound.register({ fileName: 'responseReceived2.mp3' }); }
    static { this.responseReceived3 = Sound.register({ fileName: 'responseReceived3.mp3' }); }
    static { this.responseReceived4 = Sound.register({ fileName: 'responseReceived4.mp3' }); }
    static { this.clear = Sound.register({ fileName: 'clear.mp3' }); }
    static { this.save = Sound.register({ fileName: 'save.mp3' }); }
    static { this.format = Sound.register({ fileName: 'format.mp3' }); }
    static { this.voiceRecordingStarted = Sound.register({
        fileName: 'voiceRecordingStarted.mp3',
    }); }
    static { this.voiceRecordingStopped = Sound.register({
        fileName: 'voiceRecordingStopped.mp3',
    }); }
    static { this.progress = Sound.register({ fileName: 'progress.mp3' }); }
    static { this.chatEditModifiedFile = Sound.register({
        fileName: 'chatEditModifiedFile.mp3',
    }); }
    static { this.editsKept = Sound.register({ fileName: 'editsKept.mp3' }); }
    static { this.editsUndone = Sound.register({ fileName: 'editsUndone.mp3' }); }
    constructor(fileName) {
        this.fileName = fileName;
    }
}
export class SoundSource {
    constructor(randomOneOf) {
        this.randomOneOf = randomOneOf;
    }
    getSound(deterministic = false) {
        if (deterministic || this.randomOneOf.length === 1) {
            return this.randomOneOf[0];
        }
        else {
            const index = Math.floor(Math.random() * this.randomOneOf.length);
            return this.randomOneOf[index];
        }
    }
}
export class AccessibilitySignal {
    constructor(sound, name, legacySoundSettingsKey, settingsKey, legacyAnnouncementSettingsKey, announcementMessage) {
        this.sound = sound;
        this.name = name;
        this.legacySoundSettingsKey = legacySoundSettingsKey;
        this.settingsKey = settingsKey;
        this.legacyAnnouncementSettingsKey = legacyAnnouncementSettingsKey;
        this.announcementMessage = announcementMessage;
    }
    static { this._signals = new Set(); }
    static register(options) {
        const soundSource = new SoundSource('randomOneOf' in options.sound ? options.sound.randomOneOf : [options.sound]);
        const signal = new AccessibilitySignal(soundSource, options.name, options.legacySoundSettingsKey, options.settingsKey, options.legacyAnnouncementSettingsKey, options.announcementMessage);
        AccessibilitySignal._signals.add(signal);
        return signal;
    }
    static get allAccessibilitySignals() {
        return [...this._signals];
    }
    static { this.errorAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasError.name', 'Error at Position'),
        sound: Sound.error,
        announcementMessage: localize('accessibility.signals.positionHasError', 'Error'),
        settingsKey: 'accessibility.signals.positionHasError',
        delaySettingsKey: 'accessibility.signalOptions.delays.errorAtPosition',
    }); }
    static { this.warningAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasWarning.name', 'Warning at Position'),
        sound: Sound.warning,
        announcementMessage: localize('accessibility.signals.positionHasWarning', 'Warning'),
        settingsKey: 'accessibility.signals.positionHasWarning',
        delaySettingsKey: 'accessibility.signalOptions.delays.warningAtPosition',
    }); }
    static { this.errorOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasError.name', 'Error on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.lineHasError',
        legacyAnnouncementSettingsKey: 'accessibility.alert.error',
        announcementMessage: localize('accessibility.signals.lineHasError', 'Error on Line'),
        settingsKey: 'accessibility.signals.lineHasError',
    }); }
    static { this.warningOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasWarning.name', 'Warning on Line'),
        sound: Sound.warning,
        legacySoundSettingsKey: 'audioCues.lineHasWarning',
        legacyAnnouncementSettingsKey: 'accessibility.alert.warning',
        announcementMessage: localize('accessibility.signals.lineHasWarning', 'Warning on Line'),
        settingsKey: 'accessibility.signals.lineHasWarning',
    }); }
    static { this.foldedArea = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasFoldedArea.name', 'Folded Area on Line'),
        sound: Sound.foldedArea,
        legacySoundSettingsKey: 'audioCues.lineHasFoldedArea',
        legacyAnnouncementSettingsKey: 'accessibility.alert.foldedArea',
        announcementMessage: localize('accessibility.signals.lineHasFoldedArea', 'Folded'),
        settingsKey: 'accessibility.signals.lineHasFoldedArea',
    }); }
    static { this.break = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasBreakpoint.name', 'Breakpoint on Line'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.lineHasBreakpoint',
        legacyAnnouncementSettingsKey: 'accessibility.alert.breakpoint',
        announcementMessage: localize('accessibility.signals.lineHasBreakpoint', 'Breakpoint'),
        settingsKey: 'accessibility.signals.lineHasBreakpoint',
    }); }
    static { this.inlineSuggestion = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasInlineSuggestion.name', 'Inline Suggestion on Line'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.lineHasInlineSuggestion',
        settingsKey: 'accessibility.signals.lineHasInlineSuggestion',
    }); }
    static { this.terminalQuickFix = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalQuickFix.name', 'Terminal Quick Fix'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.terminalQuickFix',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalQuickFix',
        announcementMessage: localize('accessibility.signals.terminalQuickFix', 'Quick Fix'),
        settingsKey: 'accessibility.signals.terminalQuickFix',
    }); }
    static { this.onDebugBreak = AccessibilitySignal.register({
        name: localize('accessibilitySignals.onDebugBreak.name', 'Debugger Stopped on Breakpoint'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.onDebugBreak',
        legacyAnnouncementSettingsKey: 'accessibility.alert.onDebugBreak',
        announcementMessage: localize('accessibility.signals.onDebugBreak', 'Breakpoint'),
        settingsKey: 'accessibility.signals.onDebugBreak',
    }); }
    static { this.noInlayHints = AccessibilitySignal.register({
        name: localize('accessibilitySignals.noInlayHints', 'No Inlay Hints on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.noInlayHints',
        legacyAnnouncementSettingsKey: 'accessibility.alert.noInlayHints',
        announcementMessage: localize('accessibility.signals.noInlayHints', 'No Inlay Hints'),
        settingsKey: 'accessibility.signals.noInlayHints',
    }); }
    static { this.taskCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskCompleted', 'Task Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.taskCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskCompleted',
        announcementMessage: localize('accessibility.signals.taskCompleted', 'Task Completed'),
        settingsKey: 'accessibility.signals.taskCompleted',
    }); }
    static { this.taskFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskFailed', 'Task Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.taskFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskFailed',
        announcementMessage: localize('accessibility.signals.taskFailed', 'Task Failed'),
        settingsKey: 'accessibility.signals.taskFailed',
    }); }
    static { this.terminalCommandFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandFailed', 'Terminal Command Failed'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.terminalCommandFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalCommandFailed',
        announcementMessage: localize('accessibility.signals.terminalCommandFailed', 'Command Failed'),
        settingsKey: 'accessibility.signals.terminalCommandFailed',
    }); }
    static { this.terminalCommandSucceeded = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandSucceeded', 'Terminal Command Succeeded'),
        sound: Sound.success,
        announcementMessage: localize('accessibility.signals.terminalCommandSucceeded', 'Command Succeeded'),
        settingsKey: 'accessibility.signals.terminalCommandSucceeded',
    }); }
    static { this.terminalBell = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalBell', 'Terminal Bell'),
        sound: Sound.terminalBell,
        legacySoundSettingsKey: 'audioCues.terminalBell',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalBell',
        announcementMessage: localize('accessibility.signals.terminalBell', 'Terminal Bell'),
        settingsKey: 'accessibility.signals.terminalBell',
    }); }
    static { this.notebookCellCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellCompleted', 'Notebook Cell Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.notebookCellCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellCompleted',
        announcementMessage: localize('accessibility.signals.notebookCellCompleted', 'Notebook Cell Completed'),
        settingsKey: 'accessibility.signals.notebookCellCompleted',
    }); }
    static { this.notebookCellFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellFailed', 'Notebook Cell Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.notebookCellFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellFailed',
        announcementMessage: localize('accessibility.signals.notebookCellFailed', 'Notebook Cell Failed'),
        settingsKey: 'accessibility.signals.notebookCellFailed',
    }); }
    static { this.diffLineInserted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineInserted', 'Diff Line Inserted'),
        sound: Sound.diffLineInserted,
        legacySoundSettingsKey: 'audioCues.diffLineInserted',
        settingsKey: 'accessibility.signals.diffLineInserted',
    }); }
    static { this.diffLineDeleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineDeleted', 'Diff Line Deleted'),
        sound: Sound.diffLineDeleted,
        legacySoundSettingsKey: 'audioCues.diffLineDeleted',
        settingsKey: 'accessibility.signals.diffLineDeleted',
    }); }
    static { this.diffLineModified = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineModified', 'Diff Line Modified'),
        sound: Sound.diffLineModified,
        legacySoundSettingsKey: 'audioCues.diffLineModified',
        settingsKey: 'accessibility.signals.diffLineModified',
    }); }
    static { this.chatEditModifiedFile = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatEditModifiedFile', 'Chat Edit Modified File'),
        sound: Sound.chatEditModifiedFile,
        announcementMessage: localize('accessibility.signals.chatEditModifiedFile', 'File Modified from Chat Edits'),
        settingsKey: 'accessibility.signals.chatEditModifiedFile',
    }); }
    static { this.chatRequestSent = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatRequestSent', 'Chat Request Sent'),
        sound: Sound.requestSent,
        legacySoundSettingsKey: 'audioCues.chatRequestSent',
        legacyAnnouncementSettingsKey: 'accessibility.alert.chatRequestSent',
        announcementMessage: localize('accessibility.signals.chatRequestSent', 'Chat Request Sent'),
        settingsKey: 'accessibility.signals.chatRequestSent',
    }); }
    static { this.chatResponseReceived = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatResponseReceived', 'Chat Response Received'),
        legacySoundSettingsKey: 'audioCues.chatResponseReceived',
        sound: {
            randomOneOf: [
                Sound.responseReceived1,
                Sound.responseReceived2,
                Sound.responseReceived3,
                Sound.responseReceived4,
            ],
        },
        settingsKey: 'accessibility.signals.chatResponseReceived',
    }); }
    static { this.codeActionTriggered = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        sound: Sound.voiceRecordingStarted,
        legacySoundSettingsKey: 'audioCues.codeActionRequestTriggered',
        legacyAnnouncementSettingsKey: 'accessibility.alert.codeActionRequestTriggered',
        announcementMessage: localize('accessibility.signals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        settingsKey: 'accessibility.signals.codeActionTriggered',
    }); }
    static { this.codeActionApplied = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionApplied', 'Code Action Applied'),
        legacySoundSettingsKey: 'audioCues.codeActionApplied',
        sound: Sound.voiceRecordingStopped,
        settingsKey: 'accessibility.signals.codeActionApplied',
    }); }
    static { this.progress = AccessibilitySignal.register({
        name: localize('accessibilitySignals.progress', 'Progress'),
        sound: Sound.progress,
        legacySoundSettingsKey: 'audioCues.chatResponsePending',
        legacyAnnouncementSettingsKey: 'accessibility.alert.progress',
        announcementMessage: localize('accessibility.signals.progress', 'Progress'),
        settingsKey: 'accessibility.signals.progress',
    }); }
    static { this.clear = AccessibilitySignal.register({
        name: localize('accessibilitySignals.clear', 'Clear'),
        sound: Sound.clear,
        legacySoundSettingsKey: 'audioCues.clear',
        legacyAnnouncementSettingsKey: 'accessibility.alert.clear',
        announcementMessage: localize('accessibility.signals.clear', 'Clear'),
        settingsKey: 'accessibility.signals.clear',
    }); }
    static { this.save = AccessibilitySignal.register({
        name: localize('accessibilitySignals.save', 'Save'),
        sound: Sound.save,
        legacySoundSettingsKey: 'audioCues.save',
        legacyAnnouncementSettingsKey: 'accessibility.alert.save',
        announcementMessage: localize('accessibility.signals.save', 'Save'),
        settingsKey: 'accessibility.signals.save',
    }); }
    static { this.format = AccessibilitySignal.register({
        name: localize('accessibilitySignals.format', 'Format'),
        sound: Sound.format,
        legacySoundSettingsKey: 'audioCues.format',
        legacyAnnouncementSettingsKey: 'accessibility.alert.format',
        announcementMessage: localize('accessibility.signals.format', 'Format'),
        settingsKey: 'accessibility.signals.format',
    }); }
    static { this.voiceRecordingStarted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStarted', 'Voice Recording Started'),
        sound: Sound.voiceRecordingStarted,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStarted',
        settingsKey: 'accessibility.signals.voiceRecordingStarted',
    }); }
    static { this.voiceRecordingStopped = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStopped', 'Voice Recording Stopped'),
        sound: Sound.voiceRecordingStopped,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStopped',
        settingsKey: 'accessibility.signals.voiceRecordingStopped',
    }); }
    static { this.editsKept = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsKept', 'Edits Kept'),
        sound: Sound.editsKept,
        announcementMessage: localize('accessibility.signals.editsKept', 'Edits Kept'),
        settingsKey: 'accessibility.signals.editsKept',
    }); }
    static { this.editsUndone = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsUndone', 'Undo Edits'),
        sound: Sound.editsUndone,
        announcementMessage: localize('accessibility.signals.editsUndone', 'Edits Undone'),
        settingsKey: 'accessibility.signals.editsUndone',
    }); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHlTaWduYWwvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5U2lnbmFsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUNOLE9BQU8sRUFDUCxtQkFBbUIsRUFDbkIsa0NBQWtDLEdBQ2xDLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV2RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQ3pELDRCQUE0QixDQUM1QixDQUFBO0FBc0NELHNHQUFzRztBQUN0RyxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENB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