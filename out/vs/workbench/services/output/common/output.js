/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Mime type used by the output editor.
 */
export const OUTPUT_MIME = 'text/x-code-output';
/**
 * Id used by the output editor.
 */
export const OUTPUT_MODE_ID = 'Log';
/**
 * Mime type used by the log output editor.
 */
export const LOG_MIME = 'text/x-code-log-output';
/**
 * Id used by the log output editor.
 */
export const LOG_MODE_ID = 'log';
/**
 * Output view id
 */
export const OUTPUT_VIEW_ID = 'workbench.panel.output';
export const CONTEXT_IN_OUTPUT = new RawContextKey('inOutput', false);
export const CONTEXT_ACTIVE_FILE_OUTPUT = new RawContextKey('activeLogOutput', false);
export const CONTEXT_ACTIVE_LOG_FILE_OUTPUT = new RawContextKey('activeLogOutput.isLog', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE = new RawContextKey('activeLogOutput.levelSettable', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL = new RawContextKey('activeLogOutput.level', '');
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT = new RawContextKey('activeLogOutput.levelIsDefault', false);
export const CONTEXT_OUTPUT_SCROLL_LOCK = new RawContextKey(`outputView.scrollLock`, false);
export const ACTIVE_OUTPUT_CHANNEL_CONTEXT = new RawContextKey('activeOutputChannel', '');
export const SHOW_TRACE_FILTER_CONTEXT = new RawContextKey('output.filter.trace', true);
export const SHOW_DEBUG_FILTER_CONTEXT = new RawContextKey('output.filter.debug', true);
export const SHOW_INFO_FILTER_CONTEXT = new RawContextKey('output.filter.info', true);
export const SHOW_WARNING_FILTER_CONTEXT = new RawContextKey('output.filter.warning', true);
export const SHOW_ERROR_FILTER_CONTEXT = new RawContextKey('output.filter.error', true);
export const OUTPUT_FILTER_FOCUS_CONTEXT = new RawContextKey('outputFilterFocus', false);
export const HIDE_CATEGORY_FILTER_CONTEXT = new RawContextKey('output.filter.categories', '');
export const IOutputService = createDecorator('outputService');
export var OutputChannelUpdateMode;
(function (OutputChannelUpdateMode) {
    OutputChannelUpdateMode[OutputChannelUpdateMode["Append"] = 1] = "Append";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Replace"] = 2] = "Replace";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Clear"] = 3] = "Clear";
})(OutputChannelUpdateMode || (OutputChannelUpdateMode = {}));
export const Extensions = {
    OutputChannels: 'workbench.contributions.outputChannels',
};
export function isSingleSourceOutputChannelDescriptor(descriptor) {
    return !!descriptor.source && !Array.isArray(descriptor.source);
}
export function isMultiSourceOutputChannelDescriptor(descriptor) {
    return Array.isArray(descriptor.source);
}
class OutputChannelRegistry {
    constructor() {
        this.channels = new Map();
        this._onDidRegisterChannel = new Emitter();
        this.onDidRegisterChannel = this._onDidRegisterChannel.event;
        this._onDidRemoveChannel = new Emitter();
        this.onDidRemoveChannel = this._onDidRemoveChannel.event;
        this._onDidUpdateChannelFiles = new Emitter();
        this.onDidUpdateChannelSources = this._onDidUpdateChannelFiles.event;
    }
    registerChannel(descriptor) {
        if (!this.channels.has(descriptor.id)) {
            this.channels.set(descriptor.id, descriptor);
            this._onDidRegisterChannel.fire(descriptor.id);
        }
    }
    getChannels() {
        const result = [];
        this.channels.forEach((value) => result.push(value));
        return result;
    }
    getChannel(id) {
        return this.channels.get(id);
    }
    updateChannelSources(id, sources) {
        const channel = this.channels.get(id);
        if (channel && isMultiSourceOutputChannelDescriptor(channel)) {
            channel.source = sources;
            this._onDidUpdateChannelFiles.fire(channel);
        }
    }
    removeChannel(id) {
        const channel = this.channels.get(id);
        if (channel) {
            this.channels.delete(id);
            this._onDidRemoveChannel.fire(channel);
        }
    }
}
Registry.add(Extensions.OutputChannels, new OutputChannelRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL291dHB1dC9jb21tb24vb3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUk1Rjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQTtBQUUvQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFbkM7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUE7QUFFaEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFBO0FBRWhDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFBO0FBRXRELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFVLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUM5RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUM5RixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsdUJBQXVCLEVBQ3ZCLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQ3BF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