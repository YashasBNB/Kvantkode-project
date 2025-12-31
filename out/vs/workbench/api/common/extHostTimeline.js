/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext, } from './extHost.protocol.js';
import { toDisposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon, MarkdownString as MarkdownStringType } from './extHostTypes.js';
import { MarkdownString } from './extHostTypeConverters.js';
import { isString } from '../../../base/common/types.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export const IExtHostTimeline = createDecorator('IExtHostTimeline');
export class ExtHostTimeline {
    constructor(mainContext, commands) {
        this._providers = new Map();
        this._itemsBySourceAndUriMap = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadTimeline);
        commands.registerArgumentProcessor({
            processArgument: (arg, extension) => {
                if (arg && arg.$mid === 12 /* MarshalledId.TimelineActionContext */) {
                    if (this._providers.get(arg.source) &&
                        extension &&
                        isProposedApiEnabled(extension, 'timeline')) {
                        const uri = arg.uri === undefined ? undefined : URI.revive(arg.uri);
                        return this._itemsBySourceAndUriMap
                            .get(arg.source)
                            ?.get(getUriKey(uri))
                            ?.get(arg.handle);
                    }
                    else {
                        return undefined;
                    }
                }
                return arg;
            },
        });
    }
    async $getTimeline(id, uri, options, token) {
        const item = this._providers.get(id);
        return item?.provider.provideTimeline(URI.revive(uri), options, token);
    }
    registerTimelineProvider(scheme, provider, extensionId, commandConverter) {
        const timelineDisposables = new DisposableStore();
        const convertTimelineItem = this.convertTimelineItem(provider.id, commandConverter, timelineDisposables).bind(this);
        let disposable;
        if (provider.onDidChange) {
            disposable = provider.onDidChange((e) => this._proxy.$emitTimelineChangeEvent({
                uri: undefined,
                reset: true,
                ...e,
                id: provider.id,
            }), this);
        }
        const itemsBySourceAndUriMap = this._itemsBySourceAndUriMap;
        return this.registerTimelineProviderCore({
            ...provider,
            scheme: scheme,
            onDidChange: undefined,
            async provideTimeline(uri, options, token) {
                if (options?.resetCache) {
                    timelineDisposables.clear();
                    // For now, only allow the caching of a single Uri
                    // itemsBySourceAndUriMap.get(provider.id)?.get(getUriKey(uri))?.clear();
                    itemsBySourceAndUriMap.get(provider.id)?.clear();
                }
                const result = await provider.provideTimeline(uri, options, token);
                if (result === undefined || result === null) {
                    return undefined;
                }
                // TODO: Should we bother converting all the data if we aren't caching? Meaning it is being requested by an extension?
                const convertItem = convertTimelineItem(uri, options);
                return {
                    ...result,
                    source: provider.id,
                    items: result.items.map(convertItem),
                };
            },
            dispose() {
                for (const sourceMap of itemsBySourceAndUriMap.values()) {
                    sourceMap.get(provider.id)?.clear();
                }
                disposable?.dispose();
                timelineDisposables.dispose();
            },
        }, extensionId);
    }
    convertTimelineItem(source, commandConverter, disposables) {
        return (uri, options) => {
            let items;
            if (options?.cacheResults) {
                let itemsByUri = this._itemsBySourceAndUriMap.get(source);
                if (itemsByUri === undefined) {
                    itemsByUri = new Map();
                    this._itemsBySourceAndUriMap.set(source, itemsByUri);
                }
                const uriKey = getUriKey(uri);
                items = itemsByUri.get(uriKey);
                if (items === undefined) {
                    items = new Map();
                    itemsByUri.set(uriKey, items);
                }
            }
            return (item) => {
                const { iconPath, ...props } = item;
                const handle = `${source}|${item.id ?? item.timestamp}`;
                items?.set(handle, item);
                let icon;
                let iconDark;
                let themeIcon;
                if (item.iconPath) {
                    if (iconPath instanceof ThemeIcon) {
                        themeIcon = { id: iconPath.id, color: iconPath.color };
                    }
                    else if (URI.isUri(iconPath)) {
                        icon = iconPath;
                        iconDark = iconPath;
                    }
                    else {
                        ;
                        ({ light: icon, dark: iconDark } = iconPath);
                    }
                }
                let tooltip;
                if (MarkdownStringType.isMarkdownString(props.tooltip)) {
                    tooltip = MarkdownString.from(props.tooltip);
                }
                else if (isString(props.tooltip)) {
                    tooltip = props.tooltip;
                }
                // TODO @jkearl, remove once migration complete.
                else if (MarkdownStringType.isMarkdownString(props.detail)) {
                    console.warn('Using deprecated TimelineItem.detail, migrate to TimelineItem.tooltip');
                    tooltip = MarkdownString.from(props.detail);
                }
                else if (isString(props.detail)) {
                    console.warn('Using deprecated TimelineItem.detail, migrate to TimelineItem.tooltip');
                    tooltip = props.detail;
                }
                return {
                    ...props,
                    id: props.id ?? undefined,
                    handle: handle,
                    source: source,
                    command: item.command
                        ? commandConverter.toInternal(item.command, disposables)
                        : undefined,
                    icon: icon,
                    iconDark: iconDark,
                    themeIcon: themeIcon,
                    tooltip,
                    accessibilityInformation: item.accessibilityInformation,
                };
            };
        };
    }
    registerTimelineProviderCore(provider, extension) {
        // console.log(`ExtHostTimeline#registerTimelineProvider: id=${provider.id}`);
        const existing = this._providers.get(provider.id);
        if (existing) {
            throw new Error(`Timeline Provider ${provider.id} already exists.`);
        }
        this._proxy.$registerTimelineProvider({
            id: provider.id,
            label: provider.label,
            scheme: provider.scheme,
        });
        this._providers.set(provider.id, { provider, extension });
        return toDisposable(() => {
            for (const sourceMap of this._itemsBySourceAndUriMap.values()) {
                sourceMap.get(provider.id)?.clear();
            }
            this._providers.delete(provider.id);
            this._proxy.$unregisterTimelineProvider(provider.id);
            provider.dispose();
        });
    }
}
function getUriKey(uri) {
    return uri?.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRpbWVsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRpbWVsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBaUIsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFJTixXQUFXLEdBQ1gsTUFBTSx1QkFBdUIsQ0FBQTtBQU85QixPQUFPLEVBQWUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxJQUFJLGtCQUFrQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQVlyRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGtCQUFrQixDQUFDLENBQUE7QUFFckYsTUFBTSxPQUFPLGVBQWU7SUFlM0IsWUFBWSxXQUF5QixFQUFFLFFBQXlCO1FBVnhELGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFHekIsQ0FBQTtRQUVLLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUd0QyxDQUFBO1FBR0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRWxFLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQztZQUNsQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFF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