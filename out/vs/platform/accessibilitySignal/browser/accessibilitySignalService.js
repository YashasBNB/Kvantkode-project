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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5U2lnbmFsL2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFDTixPQUFPLEVBQ1AsbUJBQW1CLEVBQ25CLGtDQUFrQyxHQUNsQyxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdkUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw0QkFBNEIsQ0FDNUIsQ0FBQTtBQXNDRCxzR0FBc0c7QUFDdEcsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUE7QUFz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