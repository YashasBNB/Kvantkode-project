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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRpbWVsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGltZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFpQixHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUlOLFdBQVcsR0FDWCxNQUFNLHVCQUF1QixDQUFBO0FBTzlCLE9BQU8sRUFBZSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLElBQUksa0JBQWtCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBWXJGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsa0JBQWtCLENBQUMsQ0FBQTtBQUVyRixNQUFNLE9BQU8sZUFBZTtJQWUzQixZQUFZLFdBQXlCLEVBQUUsUUFBeUI7UUFWeEQsZUFBVSxHQUFHLElBQUksR0FBRyxFQUd6QixDQUFBO1FBRUssNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBR3RDLENBQUE7UUFHRixJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFbEUsUUFBUSxDQUFDLHlCQUF5QixDQUFDO1lBQ2xDLGVBQWUsRUFBRSxDQUFDLEdBQUcsRUFBRSxTQUFT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