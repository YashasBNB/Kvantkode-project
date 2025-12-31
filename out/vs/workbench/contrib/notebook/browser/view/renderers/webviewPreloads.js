/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
async function webviewPreloads(ctx) {
    /* eslint-disable no-restricted-globals, no-restricted-syntax */
    // The use of global `window` should be fine in this context, even
    // with aux windows. This code is running from within an `iframe`
    // where there is only one `window` object anyway.
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.indexOf('Chrome') >= 0;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    function promiseWithResolvers() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve: resolve, reject: reject };
    }
    let currentOptions = ctx.options;
    const isWorkspaceTrusted = ctx.isWorkspaceTrusted;
    let currentRenderOptions = ctx.renderOptions;
    const settingChange = createEmitter();
    const acquireVsCodeApi = globalThis.acquireVsCodeApi;
    const vscode = acquireVsCodeApi();
    delete globalThis.acquireVsCodeApi;
    const tokenizationStyle = new CSSStyleSheet();
    tokenizationStyle.replaceSync(ctx.style.tokenizationCss);
    const runWhenIdle = typeof requestIdleCallback !== 'function' || typeof cancelIdleCallback !== 'function'
        ? (runner) => {
            setTimeout(() => {
                if (disposed) {
                    return;
                }
                const end = Date.now() + 15; // one frame at 64fps
                runner(Object.freeze({
                    didTimeout: true,
                    timeRemaining() {
                        return Math.max(0, end - Date.now());
                    },
                }));
            });
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                },
            };
        }
        : (runner, timeout) => {
            const handle = requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined);
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                    cancelIdleCallback(handle);
                },
            };
        };
    function getOutputContainer(event) {
        for (const node of event.composedPath()) {
            if (node instanceof HTMLElement && node.classList.contains('output')) {
                return {
                    id: node.id,
                };
            }
        }
        return;
    }
    let lastFocusedOutput = undefined;
    const handleOutputFocusOut = (event) => {
        const outputFocus = event && getOutputContainer(event);
        if (!outputFocus) {
            return;
        }
        // Possible we're tabbing through the elements of the same output.
        // Lets see if focus is set back to the same output.
        lastFocusedOutput = undefined;
        setTimeout(() => {
            if (lastFocusedOutput?.id === outputFocus.id) {
                return;
            }
            postNotebookMessage('outputBlur', outputFocus);
        }, 0);
    };
    const isEditableElement = (element) => {
        return (element.tagName.toLowerCase() === 'input' ||
            element.tagName.toLowerCase() === 'textarea' ||
            ('editContext' in element && !!element.editContext));
    };
    // check if an input element is focused within the output element
    const checkOutputInputFocus = (e) => {
        lastFocusedOutput = getOutputContainer(e);
        const activeElement = window.document.activeElement;
        if (!activeElement) {
            return;
        }
        const id = lastFocusedOutput?.id;
        if (id && (isEditableElement(activeElement) || activeElement.tagName === 'SELECT')) {
            postNotebookMessage('outputInputFocus', {
                inputFocused: true,
                id,
            });
            activeElement.addEventListener('blur', () => {
                postNotebookMessage('outputInputFocus', {
                    inputFocused: false,
                    id,
                });
            }, { once: true });
        }
    };
    const handleInnerClick = (event) => {
        if (!event || !event.view || !event.view.document) {
            return;
        }
        const outputFocus = (lastFocusedOutput = getOutputContainer(event));
        for (const node of event.composedPath()) {
            if (node instanceof HTMLAnchorElement && node.href) {
                if (node.href.startsWith('blob:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleBlobUrlClick(node.href, node.download);
                }
                else if (node.href.startsWith('data:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleDataUrl(node.href, node.download);
                }
                else if (node.getAttribute('href')?.trim().startsWith('#')) {
                    // Scrolling to location within current doc
                    if (!node.hash) {
                        postNotebookMessage('scroll-to-reveal', {
                            scrollTop: 0,
                        });
                        return;
                    }
                    const targetId = node.hash.substring(1);
                    // Check outer document first
                    let scrollTarget = event.view.document.getElementById(targetId);
                    if (!scrollTarget) {
                        // Fallback to checking preview shadow doms
                        for (const preview of event.view.document.querySelectorAll('.preview')) {
                            scrollTarget = preview.shadowRoot?.getElementById(targetId);
                            if (scrollTarget) {
                                break;
                            }
                        }
                    }
                    if (scrollTarget) {
                        const scrollTop = scrollTarget.getBoundingClientRect().top + event.view.scrollY;
                        postNotebookMessage('scroll-to-reveal', {
                            scrollTop,
                        });
                        return;
                    }
                }
                else {
                    const href = node.getAttribute('href');
                    if (href) {
                        if (href.startsWith('command:') && outputFocus) {
                            postNotebookMessage('outputFocus', outputFocus);
                        }
                        postNotebookMessage('clicked-link', { href });
                    }
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        if (outputFocus) {
            postNotebookMessage('outputFocus', outputFocus);
        }
    };
    const blurOutput = () => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
    };
    const selectOutputContents = (cellOrOutputId) => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNode(cellOutputContainer);
        selection.addRange(range);
    };
    const selectInputContents = (cellOrOutputId) => {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            ;
            activeElement.select();
        }
    };
    const onPageUpDownSelectionHandler = (e) => {
        if (!lastFocusedOutput?.id || !e.shiftKey) {
            return;
        }
        // If we're pressing `Shift+Up/Down` then we want to select a line at a time.
        if (e.shiftKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
            e.stopPropagation(); // We don't want the notebook to handle this, default behavior is what we need.
            return;
        }
        // We want to handle just `Shift + PageUp/PageDown` & `Shift + Cmd + ArrowUp/ArrowDown` (for mac)
        if (!(e.code === 'PageUp' || e.code === 'PageDown') &&
            !(e.metaKey && (e.code === 'ArrowDown' || e.code === 'ArrowUp'))) {
            return;
        }
        const outputContainer = window.document.getElementById(lastFocusedOutput.id);
        const selection = window.getSelection();
        if (!outputContainer || !selection?.anchorNode) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // Leave for default behavior.
            return;
        }
        // These should change the scroll position, not adjust the selected cell in the notebook
        e.stopPropagation(); // We don't want the notebook to handle this.
        e.preventDefault(); // We will handle selection.
        const { anchorNode, anchorOffset } = selection;
        const range = document.createRange();
        if (e.code === 'PageDown' || e.code === 'ArrowDown') {
            range.setStart(anchorNode, anchorOffset);
            range.setEnd(outputContainer, 1);
        }
        else {
            range.setStart(outputContainer, 0);
            range.setEnd(anchorNode, anchorOffset);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };
    const disableNativeSelectAll = (e) => {
        if (!lastFocusedOutput?.id) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // The input element will handle this.
            return;
        }
        if ((e.key === 'a' && e.ctrlKey) || (e.metaKey && e.key === 'a')) {
            e.preventDefault(); // We will handle selection in editor code.
            return;
        }
    };
    const handleDataUrl = async (data, downloadName) => {
        postNotebookMessage('clicked-data-url', {
            data,
            downloadName,
        });
    };
    const handleBlobUrlClick = async (url, downloadName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                handleDataUrl(reader.result, downloadName);
            });
            reader.readAsDataURL(blob);
        }
        catch (e) {
            console.error(e.message);
        }
    };
    window.document.body.addEventListener('click', handleInnerClick);
    window.document.body.addEventListener('focusin', checkOutputInputFocus);
    window.document.body.addEventListener('focusout', handleOutputFocusOut);
    window.document.body.addEventListener('keydown', onPageUpDownSelectionHandler);
    window.document.body.addEventListener('keydown', disableNativeSelectAll);
    function createKernelContext() {
        return Object.freeze({
            onDidReceiveKernelMessage: onDidReceiveKernelMessage.event,
            postKernelMessage: (data) => postNotebookMessage('customKernelMessage', { message: data }),
        });
    }
    async function runKernelPreload(url) {
        try {
            return await activateModuleKernelPreload(url);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    async function activateModuleKernelPreload(url) {
        const module = await __import(url);
        if (!module.activate) {
            console.error(`Notebook preload '${url}' was expected to be a module but it does not export an 'activate' function`);
            return;
        }
        return module.activate(createKernelContext());
    }
    const dimensionUpdater = new (class {
        constructor() {
            this.pending = new Map();
        }
        updateHeight(id, height, options) {
            if (!this.pending.size) {
                setTimeout(() => {
                    this.updateImmediately();
                }, 0);
            }
            const update = this.pending.get(id);
            if (update && update.isOutput) {
                this.pending.set(id, {
                    id,
                    height,
                    init: update.init,
                    isOutput: update.isOutput,
                });
            }
            else {
                this.pending.set(id, {
                    id,
                    height,
                    ...options,
                });
            }
        }
        updateImmediately() {
            if (!this.pending.size) {
                return;
            }
            postNotebookMessage('dimension', {
                updates: Array.from(this.pending.values()),
            });
            this.pending.clear();
        }
    })();
    function elementHasContent(height) {
        // we need to account for a potential 1px top and bottom border on a child within the output container
        return height > 2.1;
    }
    const resizeObserver = new (class {
        constructor() {
            this._observedElements = new WeakMap();
            this._observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (!window.document.body.contains(entry.target)) {
                        continue;
                    }
                    const observedElementInfo = this._observedElements.get(entry.target);
                    if (!observedElementInfo) {
                        continue;
                    }
                    this.postResizeMessage(observedElementInfo.cellId);
                    if (entry.target.id !== observedElementInfo.id) {
                        continue;
                    }
                    if (!entry.contentRect) {
                        continue;
                    }
                    if (!observedElementInfo.output) {
                        // markup, update directly
                        this.updateHeight(observedElementInfo, entry.target.offsetHeight);
                        continue;
                    }
                    const hasContent = elementHasContent(entry.contentRect.height);
                    const shouldUpdatePadding = (hasContent && observedElementInfo.lastKnownPadding === 0) ||
                        (!hasContent && observedElementInfo.lastKnownPadding !== 0);
                    if (shouldUpdatePadding) {
                        // Do not update dimension in resize observer
                        window.requestAnimationFrame(() => {
                            if (hasContent) {
                                entry.target.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}px`;
                            }
                            else {
                                entry.target.style.padding = `0px`;
                            }
                            this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                        });
                    }
                    else {
                        this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                    }
                }
            });
        }
        updateHeight(observedElementInfo, offsetHeight) {
            if (observedElementInfo.lastKnownHeight !== offsetHeight) {
                observedElementInfo.lastKnownHeight = offsetHeight;
                dimensionUpdater.updateHeight(observedElementInfo.id, offsetHeight, {
                    isOutput: observedElementInfo.output,
                });
            }
        }
        observe(container, id, output, cellId) {
            if (this._observedElements.has(container)) {
                return;
            }
            this._observedElements.set(container, {
                id,
                output,
                lastKnownPadding: ctx.style.outputNodePadding,
                lastKnownHeight: -1,
                cellId,
            });
            this._observer.observe(container);
        }
        postResizeMessage(cellId) {
            // Debounce this callback to only happen after
            // 250 ms. Don't need resize events that often.
            clearTimeout(this._outputResizeTimer);
            this._outputResizeTimer = setTimeout(() => {
                postNotebookMessage('outputResized', {
                    cellId,
                });
            }, 250);
        }
    })();
    let previousDelta;
    let scrollTimeout;
    let scrolledElement;
    let lastTimeScrolled;
    function flagRecentlyScrolled(node, deltaY) {
        scrolledElement = node;
        if (deltaY === undefined) {
            lastTimeScrolled = Date.now();
            previousDelta = undefined;
            node.setAttribute('recentlyScrolled', 'true');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                scrolledElement?.removeAttribute('recentlyScrolled');
            }, 300);
            return true;
        }
        if (node.hasAttribute('recentlyScrolled')) {
            if (lastTimeScrolled && Date.now() - lastTimeScrolled > 400) {
                // it has been a while since we actually scrolled
                // if scroll velocity increases significantly, it's likely a new scroll event
                if (!!previousDelta && deltaY < 0 && deltaY < previousDelta - 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                else if (!!previousDelta && deltaY > 0 && deltaY > previousDelta + 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                // the tail end of a smooth scrolling event (from a trackpad) can go on for a while
                // so keep swallowing it, but we can shorten the timeout since the events occur rapidly
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    scrolledElement?.removeAttribute('recentlyScrolled');
                }, 50);
            }
            else {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    scrolledElement?.removeAttribute('recentlyScrolled');
                }, 300);
            }
            previousDelta = deltaY;
            return true;
        }
        return false;
    }
    function eventTargetShouldHandleScroll(event) {
        for (let node = event.target; node; node = node.parentNode) {
            if (!(node instanceof Element) ||
                node.id === 'container' ||
                node.classList.contains('cell_container') ||
                node.classList.contains('markup') ||
                node.classList.contains('output_container')) {
                return false;
            }
            // scroll up
            if (event.deltaY < 0 && node.scrollTop > 0) {
                // there is still some content to scroll
                flagRecentlyScrolled(node);
                return true;
            }
            // scroll down
            if (event.deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
                // per https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
                // scrollTop is not rounded but scrollHeight and clientHeight are
                // so we need to check if the difference is less than some threshold
                if (node.scrollHeight - node.scrollTop - node.clientHeight < 2) {
                    continue;
                }
                // if the node is not scrollable, we can continue. We don't check the computed style always as it's expensive
                if (window.getComputedStyle(node).overflowY === 'hidden' ||
                    window.getComputedStyle(node).overflowY === 'visible') {
                    continue;
                }
                flagRecentlyScrolled(node);
                return true;
            }
            if (flagRecentlyScrolled(node, event.deltaY)) {
                return true;
            }
        }
        return false;
    }
    const handleWheel = (event) => {
        if (event.defaultPrevented || eventTargetShouldHandleScroll(event)) {
            return;
        }
        postNotebookMessage('did-scroll-wheel', {
            payload: {
                deltaMode: event.deltaMode,
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaZ: event.deltaZ,
                // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                wheelDelta: event.wheelDelta && isChrome
                    ? event.wheelDelta / window.devicePixelRatio
                    : event.wheelDelta,
                wheelDeltaX: event.wheelDeltaX && isChrome
                    ? event.wheelDeltaX / window.devicePixelRatio
                    : event.wheelDeltaX,
                wheelDeltaY: event.wheelDeltaY && isChrome
                    ? event.wheelDeltaY / window.devicePixelRatio
                    : event.wheelDeltaY,
                detail: event.detail,
                shiftKey: event.shiftKey,
                type: event.type,
            },
        });
    };
    function focusFirstFocusableOrContainerInOutput(cellOrOutputId, alternateId) {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId) ??
            (alternateId ? window.document.getElementById(alternateId) : undefined);
        if (cellOutputContainer) {
            if (cellOutputContainer.contains(window.document.activeElement)) {
                return;
            }
            const id = cellOutputContainer.id;
            let focusableElement = cellOutputContainer.querySelector('[tabindex="0"], [href], button, input, option, select, textarea');
            if (!focusableElement) {
                focusableElement = cellOutputContainer;
                focusableElement.tabIndex = -1;
                postNotebookMessage('outputInputFocus', {
                    inputFocused: false,
                    id,
                });
            }
            else {
                const inputFocused = isEditableElement(focusableElement);
                postNotebookMessage('outputInputFocus', {
                    inputFocused,
                    id,
                });
            }
            lastFocusedOutput = cellOutputContainer;
            postNotebookMessage('outputFocus', {
                id: cellOutputContainer.id,
            });
            focusableElement.focus();
        }
    }
    function createFocusSink(cellId, focusNext) {
        const element = document.createElement('div');
        element.id = `focus-sink-${cellId}`;
        element.tabIndex = 0;
        element.addEventListener('focus', () => {
            postNotebookMessage('focus-editor', {
                cellId: cellId,
                focusNext,
            });
        });
        return element;
    }
    function _internalHighlightRange(range, tagName = 'mark', attributes = {}) {
        // derived from https://github.com/Treora/dom-highlight-range/blob/master/highlight-range.js
        // Return an array of the text nodes in the range. Split the start and end nodes if required.
        function _textNodesInRange(range) {
            if (!range.startContainer.ownerDocument) {
                return [];
            }
            // If the start or end node is a text node and only partly in the range, split it.
            if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
                const startContainer = range.startContainer;
                const endOffset = range.endOffset; // (this may get lost when the splitting the node)
                const createdNode = startContainer.splitText(range.startOffset);
                if (range.endContainer === startContainer) {
                    // If the end was in the same container, it will now be in the newly created node.
                    range.setEnd(createdNode, endOffset - range.startOffset);
                }
                range.setStart(createdNode, 0);
            }
            if (range.endContainer.nodeType === Node.TEXT_NODE &&
                range.endOffset < range.endContainer.length) {
                ;
                range.endContainer.splitText(range.endOffset);
            }
            // Collect the text nodes.
            const walker = range.startContainer.ownerDocument.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, (node) => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
            walker.currentNode = range.startContainer;
            // // Optimise by skipping nodes that are explicitly outside the range.
            // const NodeTypesWithCharacterOffset = [
            //  Node.TEXT_NODE,
            //  Node.PROCESSING_INSTRUCTION_NODE,
            //  Node.COMMENT_NODE,
            // ];
            // if (!NodeTypesWithCharacterOffset.includes(range.startContainer.nodeType)) {
            //   if (range.startOffset < range.startContainer.childNodes.length) {
            //     walker.currentNode = range.startContainer.childNodes[range.startOffset];
            //   } else {
            //     walker.nextSibling(); // TODO verify this is correct.
            //   }
            // }
            const nodes = [];
            if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                nodes.push(walker.currentNode);
            }
            while (walker.nextNode() && range.comparePoint(walker.currentNode, 0) !== 1) {
                if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                    nodes.push(walker.currentNode);
                }
            }
            return nodes;
        }
        // Replace [node] with <tagName ...attributes>[node]</tagName>
        function wrapNodeInHighlight(node, tagName, attributes) {
            const highlightElement = node.ownerDocument.createElement(tagName);
            Object.keys(attributes).forEach((key) => {
                highlightElement.setAttribute(key, attributes[key]);
            });
            const tempRange = node.ownerDocument.createRange();
            tempRange.selectNode(node);
            tempRange.surroundContents(highlightElement);
            return highlightElement;
        }
        if (range.collapsed) {
            return {
                remove: () => { },
                update: () => { },
            };
        }
        // First put all nodes in an array (splits start and end nodes if needed)
        const nodes = _textNodesInRange(range);
        // Highlight each node
        const highlightElements = [];
        for (const nodeIdx in nodes) {
            const highlightElement = wrapNodeInHighlight(nodes[nodeIdx], tagName, attributes);
            highlightElements.push(highlightElement);
        }
        // Remove a highlight element created with wrapNodeInHighlight.
        function _removeHighlight(highlightElement) {
            if (highlightElement.childNodes.length === 1) {
                highlightElement.parentNode?.replaceChild(highlightElement.firstChild, highlightElement);
            }
            else {
                // If the highlight somehow contains multiple nodes now, move them all.
                while (highlightElement.firstChild) {
                    highlightElement.parentNode?.insertBefore(highlightElement.firstChild, highlightElement);
                }
                highlightElement.remove();
            }
        }
        // Return a function that cleans up the highlightElements.
        function _removeHighlights() {
            // Remove each of the created highlightElements.
            for (const highlightIdx in highlightElements) {
                _removeHighlight(highlightElements[highlightIdx]);
            }
        }
        function _updateHighlight(highlightElement, attributes = {}) {
            Object.keys(attributes).forEach((key) => {
                highlightElement.setAttribute(key, attributes[key]);
            });
        }
        function updateHighlights(attributes) {
            for (const highlightIdx in highlightElements) {
                _updateHighlight(highlightElements[highlightIdx], attributes);
            }
        }
        return {
            remove: _removeHighlights,
            update: updateHighlights,
        };
    }
    function selectRange(_range) {
        const sel = window.getSelection();
        if (sel) {
            try {
                sel.removeAllRanges();
                const r = document.createRange();
                r.setStart(_range.startContainer, _range.startOffset);
                r.setEnd(_range.endContainer, _range.endOffset);
                sel.addRange(r);
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    function highlightRange(range, useCustom, tagName = 'mark', attributes = {}) {
        if (useCustom) {
            const ret = _internalHighlightRange(range, tagName, attributes);
            return {
                range: range,
                dispose: ret.remove,
                update: (color, className) => {
                    if (className === undefined) {
                        ret.update({
                            style: `background-color: ${color}`,
                        });
                    }
                    else {
                        ret.update({
                            class: className,
                        });
                    }
                },
            };
        }
        else {
            window.document.execCommand('hiliteColor', false, matchColor);
            const cloneRange = window.getSelection().getRangeAt(0).cloneRange();
            const _range = {
                collapsed: cloneRange.collapsed,
                commonAncestorContainer: cloneRange.commonAncestorContainer,
                endContainer: cloneRange.endContainer,
                endOffset: cloneRange.endOffset,
                startContainer: cloneRange.startContainer,
                startOffset: cloneRange.startOffset,
            };
            return {
                range: _range,
                dispose: () => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                },
                update: (color, className) => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        window.document.execCommand('hiliteColor', false, color);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                },
            };
        }
    }
    function createEmitter(listenerChange = () => undefined) {
        const listeners = new Set();
        return {
            fire(data) {
                for (const listener of [...listeners]) {
                    listener.fn.call(listener.thisArg, data);
                }
            },
            event(fn, thisArg, disposables) {
                const listenerObj = { fn, thisArg };
                const disposable = {
                    dispose: () => {
                        listeners.delete(listenerObj);
                        listenerChange(listeners);
                    },
                };
                listeners.add(listenerObj);
                listenerChange(listeners);
                if (disposables instanceof Array) {
                    disposables.push(disposable);
                }
                else if (disposables) {
                    disposables.add(disposable);
                }
                return disposable;
            },
        };
    }
    function showRenderError(errorText, outputNode, errors) {
        outputNode.innerText = errorText;
        const errList = document.createElement('ul');
        for (const result of errors) {
            console.error(result);
            const item = document.createElement('li');
            item.innerText = result.message;
            errList.appendChild(item);
        }
        outputNode.appendChild(errList);
    }
    const outputItemRequests = new (class {
        constructor() {
            this._requestPool = 0;
            this._requests = new Map();
        }
        getOutputItem(outputId, mime) {
            const requestId = this._requestPool++;
            const { promise, resolve } = promiseWithResolvers();
            this._requests.set(requestId, { resolve });
            postNotebookMessage('getOutputItem', {
                requestId,
                outputId,
                mime,
            });
            return promise;
        }
        resolveOutputItem(requestId, output) {
            const request = this._requests.get(requestId);
            if (!request) {
                return;
            }
            this._requests.delete(requestId);
            request.resolve(output);
        }
    })();
    let hasWarnedAboutAllOutputItemsProposal = false;
    function createOutputItem(id, mime, metadata, valueBytes, allOutputItemData, appended) {
        function create(id, mime, metadata, valueBytes, appended) {
            return Object.freeze({
                id,
                mime,
                metadata,
                appendedText() {
                    if (appended) {
                        return textDecoder.decode(appended.valueBytes);
                    }
                    return undefined;
                },
                data() {
                    return valueBytes;
                },
                text() {
                    return textDecoder.decode(valueBytes);
                },
                json() {
                    return JSON.parse(this.text());
                },
                blob() {
                    return new Blob([valueBytes], { type: this.mime });
                },
                get _allOutputItems() {
                    if (!hasWarnedAboutAllOutputItemsProposal) {
                        hasWarnedAboutAllOutputItemsProposal = true;
                        console.warn(`'_allOutputItems' is proposed API. DO NOT ship an extension that depends on it!`);
                    }
                    return allOutputItemList;
                },
            });
        }
        const allOutputItemCache = new Map();
        const allOutputItemList = Object.freeze(allOutputItemData.map((outputItem) => {
            const mime = outputItem.mime;
            return Object.freeze({
                mime,
                getItem() {
                    const existingTask = allOutputItemCache.get(mime);
                    if (existingTask) {
                        return existingTask;
                    }
                    const task = outputItemRequests.getOutputItem(id, mime).then((item) => {
                        return item ? create(id, item.mime, metadata, item.valueBytes) : undefined;
                    });
                    allOutputItemCache.set(mime, task);
                    return task;
                },
            });
        }));
        const item = create(id, mime, metadata, valueBytes, appended);
        allOutputItemCache.set(mime, Promise.resolve(item));
        return item;
    }
    const onDidReceiveKernelMessage = createEmitter();
    const ttPolicy = window.trustedTypes?.createPolicy('notebookRenderer', {
        createHTML: (value) => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
        createScript: (value) => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
    });
    window.addEventListener('wheel', handleWheel);
    const matchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).color;
    const currentMatchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).backgroundColor;
    class JSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
        }
        addHighlights(matches, ownerID) {
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                const ret = highlightRange(match.originalRange, true, 'mark', match.isShadow
                    ? {
                        style: 'background-color: ' + matchColor + ';',
                    }
                    : {
                        class: 'find-match',
                    });
                match.highlightResult = ret;
            }
            const highlightInfo = {
                matches,
                currentMatchIndex: -1,
            };
            this._activeHighlightInfo.set(ownerID, highlightInfo);
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.get(ownerID)?.matches.forEach((match) => {
                match.highlightResult?.dispose();
            });
            this._activeHighlightInfo.delete(ownerID);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            const oldMatch = highlightInfo.matches[highlightInfo.currentMatchIndex];
            oldMatch?.highlightResult?.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            const match = highlightInfo.matches[index];
            highlightInfo.currentMatchIndex = index;
            const sel = window.getSelection();
            if (!!match && !!sel && match.highlightResult) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    const tempRange = document.createRange();
                    tempRange.selectNode(match.highlightResult.range.startContainer);
                    match.highlightResult.range.startContainer.parentElement?.scrollIntoView({
                        behavior: 'auto',
                        block: 'end',
                        inline: 'nearest',
                    });
                    const rangeOffset = tempRange.getBoundingClientRect().top;
                    tempRange.detach();
                    offset = rangeOffset - outputOffset;
                }
                catch (e) {
                    console.error(e);
                }
                match.highlightResult?.update(currentMatchColor, match.isShadow ? undefined : 'current-find-match');
                window.document.getSelection()?.removeAllRanges();
                postNotebookMessage('didFindHighlightCurrent', {
                    offset,
                });
            }
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            const oldMatch = highlightInfo.matches[index];
            if (oldMatch && oldMatch.highlightResult) {
                oldMatch.highlightResult.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            }
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._activeHighlightInfo.forEach((highlightInfo) => {
                highlightInfo.matches.forEach((match) => {
                    match.highlightResult?.dispose();
                });
            });
        }
    }
    class CSSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
            this._matchesHighlight = new Highlight();
            this._matchesHighlight.priority = 1;
            this._currentMatchesHighlight = new Highlight();
            this._currentMatchesHighlight.priority = 2;
            CSS.highlights?.set(`find-highlight`, this._matchesHighlight);
            CSS.highlights?.set(`current-find-highlight`, this._currentMatchesHighlight);
        }
        _refreshRegistry(updateMatchesHighlight = true) {
            // for performance reasons, only update the full list of highlights when we need to
            if (updateMatchesHighlight) {
                this._matchesHighlight.clear();
            }
            this._currentMatchesHighlight.clear();
            this._activeHighlightInfo.forEach((highlightInfo) => {
                if (updateMatchesHighlight) {
                    for (let i = 0; i < highlightInfo.matches.length; i++) {
                        this._matchesHighlight.add(highlightInfo.matches[i].originalRange);
                    }
                }
                if (highlightInfo.currentMatchIndex < highlightInfo.matches.length &&
                    highlightInfo.currentMatchIndex >= 0) {
                    this._currentMatchesHighlight.add(highlightInfo.matches[highlightInfo.currentMatchIndex].originalRange);
                }
            });
        }
        addHighlights(matches, ownerID) {
            for (let i = 0; i < matches.length; i++) {
                this._matchesHighlight.add(matches[i].originalRange);
            }
            const newEntry = {
                matches,
                currentMatchIndex: -1,
            };
            this._activeHighlightInfo.set(ownerID, newEntry);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            highlightInfo.currentMatchIndex = index;
            const match = highlightInfo.matches[index];
            if (match) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    match.originalRange.startContainer.parentElement?.scrollIntoView({
                        behavior: 'auto',
                        block: 'end',
                        inline: 'nearest',
                    });
                    const rangeOffset = match.originalRange.getBoundingClientRect().top;
                    offset = rangeOffset - outputOffset;
                    postNotebookMessage('didFindHighlightCurrent', {
                        offset,
                    });
                }
                catch (e) {
                    console.error(e);
                }
            }
            this._refreshRegistry(false);
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            highlightInfo.currentMatchIndex = -1;
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.delete(ownerID);
            this._refreshRegistry();
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._currentMatchesHighlight.clear();
            this._matchesHighlight.clear();
        }
    }
    const _highlighter = CSS.highlights ? new CSSHighlighter() : new JSHighlighter();
    function extractSelectionLine(selection) {
        const range = selection.getRangeAt(0);
        // we need to keep a reference to the old selection range to re-apply later
        const oldRange = range.cloneRange();
        const captureLength = selection.toString().length;
        // use selection API to modify selection to get entire line (the first line if multi-select)
        // collapse selection to start so that the cursor position is at beginning of match
        selection.collapseToStart();
        // extend selection in both directions to select the line
        selection.modify('move', 'backward', 'lineboundary');
        selection.modify('extend', 'forward', 'lineboundary');
        const line = selection.toString();
        // using the original range and the new range, we can find the offset of the match from the line start.
        const rangeStart = getStartOffset(selection.getRangeAt(0), oldRange);
        // line range for match
        const lineRange = {
            start: rangeStart,
            end: rangeStart + captureLength,
        };
        // re-add the old range so that the selection is restored
        selection.removeAllRanges();
        selection.addRange(oldRange);
        return { line, range: lineRange };
    }
    function getStartOffset(lineRange, originalRange) {
        // sometimes, the old and new range are in different DOM elements (ie: when the match is inside of <b></b>)
        // so we need to find the first common ancestor DOM element and find the positions of the old and new range relative to that.
        const firstCommonAncestor = findFirstCommonAncestor(lineRange.startContainer, originalRange.startContainer);
        const selectionOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, lineRange.startContainer) +
            lineRange.startOffset;
        const textOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, originalRange.startContainer) +
            originalRange.startOffset;
        return textOffset - selectionOffset;
    }
    // modified from https://stackoverflow.com/a/68583466/16253823
    function findFirstCommonAncestor(nodeA, nodeB) {
        const range = new Range();
        range.setStart(nodeA, 0);
        range.setEnd(nodeB, 0);
        return range.commonAncestorContainer;
    }
    function getTextContentLength(node) {
        let length = 0;
        if (node.nodeType === Node.TEXT_NODE) {
            length += node.textContent?.length || 0;
        }
        else {
            for (const childNode of node.childNodes) {
                length += getTextContentLength(childNode);
            }
        }
        return length;
    }
    // modified from https://stackoverflow.com/a/48812529/16253823
    function getSelectionOffsetRelativeTo(parentElement, currentNode) {
        if (!currentNode) {
            return 0;
        }
        let offset = 0;
        if (currentNode === parentElement || !parentElement.contains(currentNode)) {
            return offset;
        }
        // count the number of chars before the current dom elem and the start of the dom
        let prevSibling = currentNode.previousSibling;
        while (prevSibling) {
            offset += getTextContentLength(prevSibling);
            prevSibling = prevSibling.previousSibling;
        }
        return offset + getSelectionOffsetRelativeTo(parentElement, currentNode.parentNode);
    }
    const find = (query, options) => {
        let find = true;
        let matches = [];
        const range = document.createRange();
        range.selectNodeContents(window.document.getElementById('findStart'));
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        viewModel.toggleDragDropEnabled(false);
        try {
            document.designMode = 'On';
            while (find && matches.length < 500) {
                find = window.find(query, 
                /* caseSensitive*/ !!options.caseSensitive, 
                /* backwards*/ false, 
                /* wrapAround*/ false, 
                /* wholeWord */ !!options.wholeWord, 
                /* searchInFrames*/ true, false);
                if (find) {
                    const selection = window.getSelection();
                    if (!selection) {
                        console.log('no selection');
                        break;
                    }
                    // Markdown preview are rendered in a shadow DOM.
                    if (options.includeMarkup &&
                        selection.rangeCount > 0 &&
                        selection.getRangeAt(0).startContainer.nodeType === 1 &&
                        selection.getRangeAt(0).startContainer.classList.contains('markup')) {
                        // markdown preview container
                        const preview = selection.anchorNode?.firstChild;
                        const root = preview.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        // find the match in the shadow dom by checking the selection inside the shadow dom
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'preview',
                                id: preview.id,
                                cellId: preview.id,
                                container: preview,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo
                                    ? extractSelectionLine(shadowSelection)
                                    : undefined,
                            });
                        }
                    }
                    // Outputs might be rendered inside a shadow DOM.
                    if (options.includeOutput &&
                        selection.rangeCount > 0 &&
                        selection.getRangeAt(0).startContainer.nodeType === 1 &&
                        selection.getRangeAt(0).startContainer.classList.contains('output_container')) {
                        // output container
                        const cellId = selection.getRangeAt(0).startContainer.parentElement.id;
                        const outputNode = selection.anchorNode?.firstChild;
                        const root = outputNode.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'output',
                                id: outputNode.id,
                                cellId: cellId,
                                container: outputNode,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo
                                    ? extractSelectionLine(shadowSelection)
                                    : undefined,
                            });
                        }
                    }
                    const anchorNode = selection.anchorNode?.parentElement;
                    if (anchorNode) {
                        const lastEl = matches.length ? matches[matches.length - 1] : null;
                        // Optimization: avoid searching for the output container
                        if (lastEl && lastEl.container.contains(anchorNode) && options.includeOutput) {
                            matches.push({
                                type: lastEl.type,
                                id: lastEl.id,
                                cellId: lastEl.cellId,
                                container: lastEl.container,
                                isShadow: false,
                                originalRange: selection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo
                                    ? extractSelectionLine(selection)
                                    : undefined,
                            });
                        }
                        else {
                            // Traverse up the DOM to find the container
                            for (let node = anchorNode; node; node = node.parentElement) {
                                if (!(node instanceof Element)) {
                                    break;
                                }
                                if (node.classList.contains('output') && options.includeOutput) {
                                    // inside output
                                    const cellId = node.parentElement?.parentElement?.id;
                                    if (cellId) {
                                        matches.push({
                                            type: 'output',
                                            id: node.id,
                                            cellId: cellId,
                                            container: node,
                                            isShadow: false,
                                            originalRange: selection.getRangeAt(0),
                                            searchPreviewInfo: options.shouldGetSearchPreviewInfo
                                                ? extractSelectionLine(selection)
                                                : undefined,
                                        });
                                    }
                                    break;
                                }
                                if (node.id === 'container' || node === window.document.body) {
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        break;
                    }
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        matches = matches.filter((match) => options.findIds.length ? options.findIds.includes(match.cellId) : true);
        _highlighter.addHighlights(matches, options.ownerID);
        window.document.getSelection()?.removeAllRanges();
        viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
        document.designMode = 'Off';
        postNotebookMessage('didFind', {
            matches: matches.map((match, index) => ({
                type: match.type,
                id: match.id,
                cellId: match.cellId,
                index,
                searchPreviewInfo: match.searchPreviewInfo,
            })),
        });
    };
    const copyOutputImage = async (outputId, altOutputId, retries = 5) => {
        if (!window.document.hasFocus() && retries > 0) {
            // copyImage can be called from outside of the webview, which means this function may be running whilst the webview is gaining focus.
            // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
            // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
            setTimeout(() => {
                copyOutputImage(outputId, altOutputId, retries - 1);
            }, 50);
            return;
        }
        try {
            const outputElement = window.document.getElementById(outputId) ?? window.document.getElementById(altOutputId);
            let image = outputElement?.querySelector('img');
            if (!image) {
                const svgImage = outputElement?.querySelector('svg.output-image') ??
                    outputElement?.querySelector('div.svgContainerStyle > svg');
                if (svgImage) {
                    image = new Image();
                    image.src = 'data:image/svg+xml,' + encodeURIComponent(svgImage.outerHTML);
                }
            }
            if (image) {
                const imageToCopy = image;
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': new Promise((resolve) => {
                            const canvas = document.createElement('canvas');
                            canvas.width = imageToCopy.naturalWidth;
                            canvas.height = imageToCopy.naturalHeight;
                            const context = canvas.getContext('2d');
                            context.drawImage(imageToCopy, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    resolve(blob);
                                }
                                else {
                                    console.error('No blob data to write to clipboard');
                                }
                                canvas.remove();
                            }, 'image/png');
                        }),
                    }),
                ]);
            }
            else {
                console.error('Could not find image element to copy for output with id', outputId);
            }
        }
        catch (e) {
            console.error('Could not copy image:', e);
        }
    };
    window.addEventListener('message', async (rawEvent) => {
        const event = rawEvent;
        switch (event.data.type) {
            case 'initializeMarkup': {
                try {
                    await Promise.all(event.data.cells.map((info) => viewModel.ensureMarkupCell(info)));
                }
                finally {
                    dimensionUpdater.updateImmediately();
                    postNotebookMessage('initializedMarkup', { requestId: event.data.requestId });
                }
                break;
            }
            case 'createMarkupCell':
                viewModel.ensureMarkupCell(event.data.cell);
                break;
            case 'showMarkupCell':
                viewModel.showMarkupCell(event.data.id, event.data.top, event.data.content, event.data.metadata);
                break;
            case 'hideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.hideMarkupCell(id);
                }
                break;
            case 'unhideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.unhideMarkupCell(id);
                }
                break;
            case 'deleteMarkupCell':
                for (const id of event.data.ids) {
                    viewModel.deleteMarkupCell(id);
                }
                break;
            case 'updateSelectedMarkupCells':
                viewModel.updateSelectedCells(event.data.selectedCellIds);
                break;
            case 'html': {
                const data = event.data;
                if (data.createOnIdle) {
                    outputRunner.enqueueIdle(data.outputId, (signal) => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                else {
                    outputRunner.enqueue(data.outputId, (signal) => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                break;
            }
            case 'view-scroll': {
                // const date = new Date();
                // console.log('----- will scroll ----  ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
                event.data.widgets.forEach((widget) => {
                    outputRunner.enqueue(widget.outputId, () => {
                        viewModel.updateOutputsScroll([widget]);
                    });
                });
                viewModel.updateMarkupScrolls(event.data.markupCells);
                break;
            }
            case 'clear':
                renderers.clearAll();
                viewModel.clearAll();
                window.document.getElementById('container').innerText = '';
                break;
            case 'clearOutput': {
                const { cellId, rendererId, outputId } = event.data;
                outputRunner.cancelOutput(outputId);
                viewModel.clearOutput(cellId, outputId, rendererId);
                break;
            }
            case 'hideOutput': {
                const { cellId, outputId } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.hideOutput(cellId);
                });
                break;
            }
            case 'showOutput': {
                const { outputId, cellTop, cellId, content } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.showOutput(cellId, outputId, cellTop);
                    if (content) {
                        viewModel.updateAndRerender(cellId, outputId, content);
                    }
                });
                break;
            }
            case 'copyImage': {
                await copyOutputImage(event.data.outputId, event.data.altOutputId);
                break;
            }
            case 'ack-dimension': {
                for (const { cellId, outputId, height } of event.data.updates) {
                    viewModel.updateOutputHeight(cellId, outputId, height);
                }
                break;
            }
            case 'preload': {
                const resources = event.data.resources;
                for (const { uri } of resources) {
                    kernelPreloads.load(uri);
                }
                break;
            }
            case 'updateRenderers': {
                const { rendererData } = event.data;
                renderers.updateRendererData(rendererData);
                break;
            }
            case 'focus-output':
                focusFirstFocusableOrContainerInOutput(event.data.cellOrOutputId, event.data.alternateId);
                break;
            case 'blur-output':
                blurOutput();
                break;
            case 'select-output-contents':
                selectOutputContents(event.data.cellOrOutputId);
                break;
            case 'select-input-contents':
                selectInputContents(event.data.cellOrOutputId);
                break;
            case 'decorations': {
                let outputContainer = window.document.getElementById(event.data.cellId);
                if (!outputContainer) {
                    viewModel.ensureOutputCell(event.data.cellId, -100000, true);
                    outputContainer = window.document.getElementById(event.data.cellId);
                }
                outputContainer?.classList.add(...event.data.addedClassNames);
                outputContainer?.classList.remove(...event.data.removedClassNames);
                break;
            }
            case 'markupDecorations': {
                const markupCell = window.document.getElementById(event.data.cellId);
                // The cell may not have been added yet if it is out of view.
                // Decorations will be added when the cell is shown.
                if (markupCell) {
                    markupCell?.classList.add(...event.data.addedClassNames);
                    markupCell?.classList.remove(...event.data.removedClassNames);
                }
                break;
            }
            case 'customKernelMessage':
                onDidReceiveKernelMessage.fire(event.data.message);
                break;
            case 'customRendererMessage':
                renderers.getRenderer(event.data.rendererId)?.receiveMessage(event.data.message);
                break;
            case 'notebookStyles': {
                const documentStyle = window.document.documentElement.style;
                for (let i = documentStyle.length - 1; i >= 0; i--) {
                    const property = documentStyle[i];
                    // Don't remove properties that the webview might have added separately
                    if (property && property.startsWith('--notebook-')) {
                        documentStyle.removeProperty(property);
                    }
                }
                // Re-add new properties
                for (const [name, value] of Object.entries(event.data.styles)) {
                    documentStyle.setProperty(`--${name}`, value);
                }
                break;
            }
            case 'notebookOptions':
                currentOptions = event.data.options;
                viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
                currentRenderOptions = event.data.renderOptions;
                settingChange.fire(currentRenderOptions);
                break;
            case 'tokenizedCodeBlock': {
                const { codeBlockId, html } = event.data;
                MarkdownCodeBlock.highlightCodeBlock(codeBlockId, html);
                break;
            }
            case 'tokenizedStylesChanged': {
                tokenizationStyle.replaceSync(event.data.css);
                break;
            }
            case 'find': {
                _highlighter.removeHighlights(event.data.options.ownerID);
                find(event.data.query, event.data.options);
                break;
            }
            case 'findHighlightCurrent': {
                _highlighter?.highlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findUnHighlightCurrent': {
                _highlighter?.unHighlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findStop': {
                _highlighter.removeHighlights(event.data.ownerID);
                break;
            }
            case 'returnOutputItem': {
                outputItemRequests.resolveOutputItem(event.data.requestId, event.data.output);
            }
        }
    });
    const renderFallbackErrorName = 'vscode.fallbackToNextRenderer';
    class Renderer {
        constructor(data) {
            this.data = data;
            this._onMessageEvent = createEmitter();
        }
        receiveMessage(message) {
            this._onMessageEvent.fire(message);
        }
        async renderOutputItem(item, element, signal) {
            try {
                await this.load();
            }
            catch (e) {
                if (!signal.aborted) {
                    showRenderError(`Error loading renderer '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                }
                return;
            }
            if (!this._api) {
                if (!signal.aborted) {
                    showRenderError(`Renderer '${this.data.id}' does not implement renderOutputItem`, element, []);
                }
                return;
            }
            try {
                const renderStart = performance.now();
                await this._api.renderOutputItem(item, element, signal);
                this.postDebugMessage('Rendered output item', {
                    id: item.id,
                    duration: `${performance.now() - renderStart}ms`,
                });
            }
            catch (e) {
                if (signal.aborted) {
                    return;
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    throw e;
                }
                showRenderError(`Error rendering output item using '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                this.postDebugMessage('Rendering output item failed', { id: item.id, error: e + '' });
            }
        }
        disposeOutputItem(id) {
            this._api?.disposeOutputItem?.(id);
        }
        createRendererContext() {
            const { id, messaging } = this.data;
            const context = {
                setState: (newState) => vscode.setState({ ...vscode.getState(), [id]: newState }),
                getState: () => {
                    const state = vscode.getState();
                    return typeof state === 'object' && state ? state[id] : undefined;
                },
                getRenderer: async (id) => {
                    const renderer = renderers.getRenderer(id);
                    if (!renderer) {
                        return undefined;
                    }
                    if (renderer._api) {
                        return renderer._api;
                    }
                    return renderer.load();
                },
                workspace: {
                    get isTrusted() {
                        return isWorkspaceTrusted;
                    },
                },
                settings: {
                    get lineLimit() {
                        return currentRenderOptions.lineLimit;
                    },
                    get outputScrolling() {
                        return currentRenderOptions.outputScrolling;
                    },
                    get outputWordWrap() {
                        return currentRenderOptions.outputWordWrap;
                    },
                    get linkifyFilePaths() {
                        return currentRenderOptions.linkifyFilePaths;
                    },
                    get minimalError() {
                        return currentRenderOptions.minimalError;
                    },
                },
                get onDidChangeSettings() {
                    return settingChange.event;
                },
            };
            if (messaging) {
                context.onDidReceiveMessage = this._onMessageEvent.event;
                context.postMessage = (message) => postNotebookMessage('customRendererMessage', { rendererId: id, message });
            }
            return Object.freeze(context);
        }
        load() {
            this._loadPromise ??= this._load();
            return this._loadPromise;
        }
        /** Inner function cached in the _loadPromise(). */
        async _load() {
            this.postDebugMessage('Start loading renderer');
            try {
                // Preloads need to be loaded before loading renderers.
                await kernelPreloads.waitForAllCurrent();
                const importStart = performance.now();
                const module = await __import(this.data.entrypoint.path);
                this.postDebugMessage('Imported renderer', {
                    duration: `${performance.now() - importStart}ms`,
                });
                if (!module) {
                    return;
                }
                this._api = await module.activate(this.createRendererContext());
                this.postDebugMessage('Activated renderer', {
                    duration: `${performance.now() - importStart}ms`,
                });
                const dependantRenderers = ctx.rendererData.filter((d) => d.entrypoint.extends === this.data.id);
                if (dependantRenderers.length) {
                    this.postDebugMessage('Activating dependant renderers', {
                        dependents: dependantRenderers.map((x) => x.id).join(', '),
                    });
                }
                // Load all renderers that extend this renderer
                await Promise.all(dependantRenderers.map(async (d) => {
                    const renderer = renderers.getRenderer(d.id);
                    if (!renderer) {
                        throw new Error(`Could not find extending renderer: ${d.id}`);
                    }
                    try {
                        return await renderer.load();
                    }
                    catch (e) {
                        // Squash any errors extends errors. They won't prevent the renderer
                        // itself from working, so just log them.
                        console.error(e);
                        this.postDebugMessage('Activating dependant renderer failed', {
                            dependent: d.id,
                            error: e + '',
                        });
                        return undefined;
                    }
                }));
                return this._api;
            }
            catch (e) {
                this.postDebugMessage('Loading renderer failed');
                throw e;
            }
        }
        postDebugMessage(msg, data) {
            postNotebookMessage('logRendererDebugMessage', {
                message: `[renderer ${this.data.id}] - ${msg}`,
                data,
            });
        }
    }
    const kernelPreloads = new (class {
        constructor() {
            this.preloads = new Map();
        }
        /**
         * Returns a promise that resolves when the given preload is activated.
         */
        waitFor(uri) {
            return this.preloads.get(uri) || Promise.resolve(new Error(`Preload not ready: ${uri}`));
        }
        /**
         * Loads a preload.
         * @param uri URI to load from
         * @param originalUri URI to show in an error message if the preload is invalid.
         */
        load(uri) {
            const promise = Promise.all([runKernelPreload(uri), this.waitForAllCurrent()]);
            this.preloads.set(uri, promise);
            return promise;
        }
        /**
         * Returns a promise that waits for all currently-registered preloads to
         * activate before resolving.
         */
        waitForAllCurrent() {
            return Promise.all([...this.preloads.values()].map((p) => p.catch((err) => err)));
        }
    })();
    const outputRunner = new (class {
        constructor() {
            this.outputs = new Map();
            this.pendingOutputCreationRequest = new Map();
        }
        /**
         * Pushes the action onto the list of actions for the given output ID,
         * ensuring that it's run in-order.
         */
        enqueue(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const record = this.outputs.get(outputId);
            if (!record) {
                const controller = new AbortController();
                this.outputs.set(outputId, {
                    abort: controller,
                    queue: new Promise((r) => r(action(controller.signal))),
                });
            }
            else {
                record.queue = record.queue.then(async (r) => {
                    if (!record.abort.signal.aborted) {
                        await action(record.abort.signal);
                    }
                });
            }
        }
        enqueueIdle(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            outputRunner.pendingOutputCreationRequest.set(outputId, runWhenIdle(() => {
                outputRunner.enqueue(outputId, action);
                outputRunner.pendingOutputCreationRequest.delete(outputId);
            }));
        }
        /**
         * Cancels the rendering of all outputs.
         */
        cancelAll() {
            // Delete all pending idle requests
            this.pendingOutputCreationRequest.forEach((r) => r.dispose());
            this.pendingOutputCreationRequest.clear();
            for (const { abort } of this.outputs.values()) {
                abort.abort();
            }
            this.outputs.clear();
        }
        /**
         * Cancels any ongoing rendering out an output.
         */
        cancelOutput(outputId) {
            // Delete the pending idle request if it exists
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const output = this.outputs.get(outputId);
            if (output) {
                output.abort.abort();
                this.outputs.delete(outputId);
            }
        }
    })();
    const renderers = new (class {
        constructor() {
            this._renderers = new Map();
            for (const renderer of ctx.rendererData) {
                this.addRenderer(renderer);
            }
        }
        getRenderer(id) {
            return this._renderers.get(id);
        }
        rendererEqual(a, b) {
            if (a.id !== b.id ||
                a.entrypoint.path !== b.entrypoint.path ||
                a.entrypoint.extends !== b.entrypoint.extends ||
                a.messaging !== b.messaging) {
                return false;
            }
            if (a.mimeTypes.length !== b.mimeTypes.length) {
                return false;
            }
            for (let i = 0; i < a.mimeTypes.length; i++) {
                if (a.mimeTypes[i] !== b.mimeTypes[i]) {
                    return false;
                }
            }
            return true;
        }
        updateRendererData(rendererData) {
            const oldKeys = new Set(this._renderers.keys());
            const newKeys = new Set(rendererData.map((d) => d.id));
            for (const renderer of rendererData) {
                const existing = this._renderers.get(renderer.id);
                if (existing && this.rendererEqual(existing.data, renderer)) {
                    continue;
                }
                this.addRenderer(renderer);
            }
            for (const key of oldKeys) {
                if (!newKeys.has(key)) {
                    this._renderers.delete(key);
                }
            }
        }
        addRenderer(renderer) {
            this._renderers.set(renderer.id, new Renderer(renderer));
        }
        clearAll() {
            outputRunner.cancelAll();
            for (const renderer of this._renderers.values()) {
                renderer.disposeOutputItem();
            }
        }
        clearOutput(rendererId, outputId) {
            outputRunner.cancelOutput(outputId);
            this._renderers.get(rendererId)?.disposeOutputItem(outputId);
        }
        async render(item, preferredRendererId, element, signal) {
            const primaryRenderer = this.findRenderer(preferredRendererId, item);
            if (!primaryRenderer) {
                const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-not-found-error') || '').replace('$0', () => item.mime);
                this.showRenderError(item, element, errorMessage);
                return;
            }
            // Try primary renderer first
            if (!(await this._doRender(item, element, primaryRenderer, signal)).continue) {
                return;
            }
            // Primary renderer failed in an expected way. Fallback to render the next mime types
            for (const additionalItemData of item._allOutputItems) {
                if (additionalItemData.mime === item.mime) {
                    continue;
                }
                const additionalItem = await additionalItemData.getItem();
                if (signal.aborted) {
                    return;
                }
                if (additionalItem) {
                    const renderer = this.findRenderer(undefined, additionalItem);
                    if (renderer) {
                        if (!(await this._doRender(additionalItem, element, renderer, signal)).continue) {
                            return; // We rendered successfully
                        }
                    }
                }
            }
            // All renderers have failed and there is nothing left to fallback to
            const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-fallbacks-exhausted') || '').replace('$0', () => item.mime);
            this.showRenderError(item, element, errorMessage);
        }
        async _doRender(item, element, renderer, signal) {
            try {
                await renderer.renderOutputItem(item, element, signal);
                return { continue: false }; // We rendered successfully
            }
            catch (e) {
                if (signal.aborted) {
                    return { continue: false };
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    return { continue: true };
                }
                else {
                    throw e; // Bail and let callers handle unknown errors
                }
            }
        }
        findRenderer(preferredRendererId, info) {
            let renderer;
            if (typeof preferredRendererId === 'string') {
                renderer = Array.from(this._renderers.values()).find((renderer) => renderer.data.id === preferredRendererId);
            }
            else {
                const renderers = Array.from(this._renderers.values()).filter((renderer) => renderer.data.mimeTypes.includes(info.mime) && !renderer.data.entrypoint.extends);
                if (renderers.length) {
                    // De-prioritize built-in renderers
                    renderers.sort((a, b) => +a.data.isBuiltin - +b.data.isBuiltin);
                    // Use first renderer we find in sorted list
                    renderer = renderers[0];
                }
            }
            return renderer;
        }
        showRenderError(info, element, errorMessage) {
            const errorContainer = document.createElement('div');
            const error = document.createElement('div');
            error.className = 'no-renderer-error';
            error.innerText = errorMessage;
            const cellText = document.createElement('div');
            cellText.innerText = info.text();
            errorContainer.appendChild(error);
            errorContainer.appendChild(cellText);
            element.innerText = '';
            element.appendChild(errorContainer);
        }
    })();
    const viewModel = new (class ViewModel {
        constructor() {
            this._markupCells = new Map();
            this._outputCells = new Map();
        }
        clearAll() {
            for (const cell of this._markupCells.values()) {
                cell.dispose();
            }
            this._markupCells.clear();
            for (const output of this._outputCells.values()) {
                output.dispose();
            }
            this._outputCells.clear();
        }
        async createMarkupCell(init, top, visible) {
            const existing = this._markupCells.get(init.cellId);
            if (existing) {
                console.error(`Trying to create markup that already exists: ${init.cellId}`);
                return existing;
            }
            const cell = new MarkupCell(init.cellId, init.mime, init.content, top, init.metadata);
            cell.element.style.visibility = visible ? '' : 'hidden';
            this._markupCells.set(init.cellId, cell);
            await cell.ready;
            return cell;
        }
        async ensureMarkupCell(info) {
            let cell = this._markupCells.get(info.cellId);
            if (cell) {
                cell.element.style.visibility = info.visible ? '' : 'hidden';
                await cell.updateContentAndRender(info.content, info.metadata);
            }
            else {
                cell = await this.createMarkupCell(info, info.offset, info.visible);
            }
        }
        deleteMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            if (cell) {
                cell.remove();
                cell.dispose();
                this._markupCells.delete(id);
            }
        }
        async updateMarkupContent(id, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            await cell?.updateContentAndRender(newContent, metadata);
        }
        showMarkupCell(id, top, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.show(top, newContent, metadata);
        }
        hideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.hide();
        }
        unhideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.unhide();
        }
        getExpectedMarkupCell(id) {
            const cell = this._markupCells.get(id);
            if (!cell) {
                console.log(`Could not find markup cell '${id}'`);
                return undefined;
            }
            return cell;
        }
        updateSelectedCells(selectedCellIds) {
            const selectedCellSet = new Set(selectedCellIds);
            for (const cell of this._markupCells.values()) {
                cell.setSelected(selectedCellSet.has(cell.id));
            }
        }
        toggleDragDropEnabled(dragAndDropEnabled) {
            for (const cell of this._markupCells.values()) {
                cell.toggleDragDropEnabled(dragAndDropEnabled);
            }
        }
        updateMarkupScrolls(markupCells) {
            for (const { id, top } of markupCells) {
                const cell = this._markupCells.get(id);
                if (cell) {
                    cell.element.style.top = `${top}px`;
                }
            }
        }
        async renderOutputCell(data, signal) {
            const preloadErrors = await Promise.all(data.requiredPreloads.map((p) => kernelPreloads.waitFor(p.uri).then(() => undefined, (err) => err)));
            if (signal.aborted) {
                return;
            }
            const cellOutput = this.ensureOutputCell(data.cellId, data.cellTop, false);
            return cellOutput.renderOutputElement(data, preloadErrors, signal);
        }
        ensureOutputCell(cellId, cellTop, skipCellTopUpdateIfExist) {
            let cell = this._outputCells.get(cellId);
            const existed = !!cell;
            if (!cell) {
                cell = new OutputCell(cellId);
                this._outputCells.set(cellId, cell);
            }
            if (existed && skipCellTopUpdateIfExist) {
                return cell;
            }
            cell.element.style.top = cellTop + 'px';
            return cell;
        }
        clearOutput(cellId, outputId, rendererId) {
            const cell = this._outputCells.get(cellId);
            cell?.clearOutput(outputId, rendererId);
        }
        showOutput(cellId, outputId, top) {
            const cell = this._outputCells.get(cellId);
            cell?.show(outputId, top);
        }
        updateAndRerender(cellId, outputId, content) {
            const cell = this._outputCells.get(cellId);
            cell?.updateContentAndRerender(outputId, content);
        }
        hideOutput(cellId) {
            const cell = this._outputCells.get(cellId);
            cell?.hide();
        }
        updateOutputHeight(cellId, outputId, height) {
            const cell = this._outputCells.get(cellId);
            cell?.updateOutputHeight(outputId, height);
        }
        updateOutputsScroll(updates) {
            for (const request of updates) {
                const cell = this._outputCells.get(request.cellId);
                cell?.updateScroll(request);
            }
        }
    })();
    class MarkdownCodeBlock {
        static { this.pendingCodeBlocksToHighlight = new Map(); }
        static highlightCodeBlock(id, html) {
            const el = MarkdownCodeBlock.pendingCodeBlocksToHighlight.get(id);
            if (!el) {
                return;
            }
            const trustedHtml = ttPolicy?.createHTML(html) ?? html;
            el.innerHTML = trustedHtml; // CodeQL [SM03712] The rendered content comes from VS Code's tokenizer and is considered safe
            const root = el.getRootNode();
            if (root instanceof ShadowRoot) {
                if (!root.adoptedStyleSheets.includes(tokenizationStyle)) {
                    root.adoptedStyleSheets.push(tokenizationStyle);
                }
            }
        }
        static requestHighlightCodeBlock(root) {
            const codeBlocks = [];
            let i = 0;
            for (const el of root.querySelectorAll('.vscode-code-block')) {
                const lang = el.getAttribute('data-vscode-code-block-lang');
                if (el.textContent && lang) {
                    const id = `${Date.now()}-${i++}`;
                    codeBlocks.push({ value: el.textContent, lang: lang, id });
                    MarkdownCodeBlock.pendingCodeBlocksToHighlight.set(id, el);
                }
            }
            return codeBlocks;
        }
    }
    class MarkupCell {
        constructor(id, mime, content, top, metadata) {
            this._isDisposed = false;
            const self = this;
            this.id = id;
            this._content = { value: content, version: 0, metadata: metadata };
            const { promise, resolve, reject } = promiseWithResolvers();
            this.ready = promise;
            let cachedData;
            this.outputItem = Object.freeze({
                id,
                mime,
                get metadata() {
                    return self._content.metadata;
                },
                text: () => {
                    return this._content.value;
                },
                json: () => {
                    return undefined;
                },
                data: () => {
                    if (cachedData?.version === this._content.version) {
                        return cachedData.value;
                    }
                    const data = textEncoder.encode(this._content.value);
                    cachedData = { version: this._content.version, value: data };
                    return data;
                },
                blob() {
                    return new Blob([this.data()], { type: this.mime });
                },
                _allOutputItems: [
                    {
                        mime,
                        getItem: async () => this.outputItem,
                    },
                ],
            });
            const root = window.document.getElementById('container');
            const markupCell = document.createElement('div');
            markupCell.className = 'markup';
            markupCell.style.position = 'absolute';
            markupCell.style.width = '100%';
            this.element = document.createElement('div');
            this.element.id = this.id;
            this.element.classList.add('preview');
            this.element.style.position = 'absolute';
            this.element.style.top = top + 'px';
            this.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
            markupCell.appendChild(this.element);
            root.appendChild(markupCell);
            this.addEventListeners();
            this.updateContentAndRender(this._content.value, this._content.metadata).then(() => {
                if (!this._isDisposed) {
                    resizeObserver.observe(this.element, this.id, false, this.id);
                }
                resolve();
            }, () => reject());
        }
        dispose() {
            this._isDisposed = true;
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        addEventListeners() {
            this.element.addEventListener('dblclick', () => {
                postNotebookMessage('toggleMarkupPreview', {
                    cellId: this.id,
                });
            });
            this.element.addEventListener('click', (e) => {
                postNotebookMessage('clickMarkupCell', {
                    cellId: this.id,
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    shiftKey: e.shiftKey,
                });
            });
            this.element.addEventListener('contextmenu', (e) => {
                postNotebookMessage('contextMenuMarkupCell', {
                    cellId: this.id,
                    clientX: e.clientX,
                    clientY: e.clientY,
                });
            });
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseEnterMarkupCell', {
                    cellId: this.id,
                });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseLeaveMarkupCell', {
                    cellId: this.id,
                });
            });
            this.element.addEventListener('dragstart', (e) => {
                markupCellDragManager.startDrag(e, this.id);
            });
            this.element.addEventListener('drag', (e) => {
                markupCellDragManager.updateDrag(e, this.id);
            });
            this.element.addEventListener('dragend', (e) => {
                markupCellDragManager.endDrag(e, this.id);
            });
        }
        async updateContentAndRender(newContent, metadata) {
            this._content = { value: newContent, version: this._content.version + 1, metadata };
            this.renderTaskAbort?.abort();
            const controller = new AbortController();
            this.renderTaskAbort = controller;
            try {
                await renderers.render(this.outputItem, undefined, this.element, this.renderTaskAbort.signal);
            }
            finally {
                if (this.renderTaskAbort === controller) {
                    this.renderTaskAbort = undefined;
                }
            }
            const root = this.element.shadowRoot ?? this.element;
            const html = [];
            for (const child of root.children) {
                switch (child.tagName) {
                    case 'LINK':
                    case 'SCRIPT':
                    case 'STYLE':
                        // not worth sending over since it will be stripped before rendering
                        break;
                    default:
                        html.push(child.outerHTML);
                        break;
                }
            }
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            postNotebookMessage('renderedMarkup', {
                cellId: this.id,
                html: html.join(''),
                codeBlocks,
            });
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false,
            });
        }
        show(top, newContent, metadata) {
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
            if (typeof newContent === 'string' || metadata) {
                this.updateContentAndRender(newContent ?? this._content.value, metadata ?? this._content.metadata);
            }
            else {
                this.updateMarkupDimensions();
            }
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        unhide() {
            this.element.style.visibility = '';
            this.updateMarkupDimensions();
        }
        remove() {
            this.element.remove();
        }
        async updateMarkupDimensions() {
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false,
            });
        }
        setSelected(selected) {
            this.element.classList.toggle('selected', selected);
        }
        toggleDragDropEnabled(enabled) {
            if (enabled) {
                this.element.classList.add('draggable');
                this.element.setAttribute('draggable', 'true');
            }
            else {
                this.element.classList.remove('draggable');
                this.element.removeAttribute('draggable');
            }
        }
    }
    class OutputCell {
        constructor(cellId) {
            this.outputElements = new Map();
            const container = window.document.getElementById('container');
            const upperWrapperElement = createFocusSink(cellId);
            container.appendChild(upperWrapperElement);
            this.element = document.createElement('div');
            this.element.style.position = 'absolute';
            this.element.style.outline = '0';
            this.element.id = cellId;
            this.element.classList.add('cell_container');
            container.appendChild(this.element);
            this.element = this.element;
            const lowerWrapperElement = createFocusSink(cellId, true);
            container.appendChild(lowerWrapperElement);
        }
        dispose() {
            for (const output of this.outputElements.values()) {
                output.dispose();
            }
            this.outputElements.clear();
        }
        createOutputElement(data) {
            let outputContainer = this.outputElements.get(data.outputId);
            if (!outputContainer) {
                outputContainer = new OutputContainer(data.outputId);
                this.element.appendChild(outputContainer.element);
                this.outputElements.set(data.outputId, outputContainer);
            }
            return outputContainer.createOutputElement(data.outputId, data.outputOffset, data.left, data.cellId);
        }
        async renderOutputElement(data, preloadErrors, signal) {
            const startTime = Date.now();
            const outputElement /** outputNode */ = this.createOutputElement(data);
            await outputElement.render(data.content, data.rendererId, preloadErrors, signal);
            // don't hide until after this step so that the height is right
            outputElement /** outputNode */.element.style.visibility = data.initiallyHidden
                ? 'hidden'
                : '';
            if (!!data.executionId && !!data.rendererId) {
                let outputSize = undefined;
                if (data.content.type === 1 /* extension */) {
                    outputSize = data.content.output.valueBytes.length;
                }
                // Only send performance messages for non-empty outputs up to a certain size
                if (outputSize !== undefined && outputSize > 0 && outputSize < 100 * 1024) {
                    postNotebookMessage('notebookPerformanceMessage', {
                        cellId: data.cellId,
                        executionId: data.executionId,
                        duration: Date.now() - startTime,
                        rendererId: data.rendererId,
                        outputSize,
                    });
                }
            }
        }
        clearOutput(outputId, rendererId) {
            const output = this.outputElements.get(outputId);
            output?.clear(rendererId);
            output?.dispose();
            this.outputElements.delete(outputId);
        }
        show(outputId, top) {
            const outputContainer = this.outputElements.get(outputId);
            if (!outputContainer) {
                return;
            }
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        updateContentAndRerender(outputId, content) {
            this.outputElements.get(outputId)?.updateContentAndRender(content);
        }
        updateOutputHeight(outputId, height) {
            this.outputElements.get(outputId)?.updateHeight(height);
        }
        updateScroll(request) {
            this.element.style.top = `${request.cellTop}px`;
            const outputElement = this.outputElements.get(request.outputId);
            if (outputElement) {
                outputElement.updateScroll(request.outputOffset);
                if (request.forceDisplay && outputElement.outputNode) {
                    // TODO @rebornix @mjbvz, there is a misalignment here.
                    // We set output visibility on cell container, other than output container or output node itself.
                    outputElement.outputNode.element.style.visibility = '';
                }
            }
            if (request.forceDisplay) {
                this.element.style.visibility = '';
            }
        }
    }
    class OutputContainer {
        get outputNode() {
            return this._outputNode;
        }
        constructor(outputId) {
            this.outputId = outputId;
            this.element = document.createElement('div');
            this.element.classList.add('output_container');
            this.element.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));
            this.element.style.position = 'absolute';
            this.element.style.overflow = 'hidden';
        }
        dispose() {
            this._outputNode?.dispose();
        }
        clear(rendererId) {
            if (rendererId) {
                renderers.clearOutput(rendererId, this.outputId);
            }
            this.element.remove();
        }
        updateHeight(height) {
            this.element.style.maxHeight = `${height}px`;
            this.element.style.height = `${height}px`;
        }
        updateScroll(outputOffset) {
            this.element.style.top = `${outputOffset}px`;
        }
        createOutputElement(outputId, outputOffset, left, cellId) {
            this.element.innerText = '';
            this.element.style.maxHeight = '0px';
            this.element.style.top = `${outputOffset}px`;
            this._outputNode?.dispose();
            this._outputNode = new OutputElement(outputId, left, cellId);
            this.element.appendChild(this._outputNode.element);
            return this._outputNode;
        }
        updateContentAndRender(content) {
            this._outputNode?.updateAndRerender(content);
        }
    }
    vscode.postMessage({
        __vscode_notebook_message: true,
        type: 'initialized',
    });
    for (const preload of ctx.staticPreloadsData) {
        kernelPreloads.load(preload.entrypoint);
    }
    function postNotebookMessage(type, properties) {
        vscode.postMessage({
            __vscode_notebook_message: true,
            type,
            ...properties,
        });
    }
    class OutputElement {
        constructor(outputId, left, cellId) {
            this.outputId = outputId;
            this.cellId = cellId;
            this.hasResizeObserver = false;
            this.element = document.createElement('div');
            this.element.id = outputId;
            this.element.classList.add('output');
            this.element.style.position = 'absolute';
            this.element.style.top = `0px`;
            this.element.style.left = left + 'px';
            this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseenter', { id: outputId });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseleave', { id: outputId });
            });
        }
        dispose() {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        async render(content, preferredRendererId, preloadErrors, signal) {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
            this._content = { preferredRendererId, preloadErrors };
            if (content.type === 0 /* RenderOutputType.Html */) {
                const trustedHtml = ttPolicy?.createHTML(content.htmlContent) ?? content.htmlContent;
                this.element.innerHTML = trustedHtml; // CodeQL [SM03712] The content comes from renderer extensions, not from direct user input.
            }
            else if (preloadErrors.some((e) => e instanceof Error)) {
                const errors = preloadErrors.filter((e) => e instanceof Error);
                showRenderError(`Error loading preloads`, this.element, errors);
            }
            else {
                const item = createOutputItem(this.outputId, content.output.mime, content.metadata, content.output.valueBytes, content.allOutputs, content.output.appended);
                const controller = new AbortController();
                this.renderTaskAbort = controller;
                // Abort rendering if caller aborts
                signal?.addEventListener('abort', () => controller.abort());
                try {
                    await renderers.render(item, preferredRendererId, this.element, controller.signal);
                }
                finally {
                    if (this.renderTaskAbort === controller) {
                        this.renderTaskAbort = undefined;
                    }
                }
            }
            if (!this.hasResizeObserver) {
                this.hasResizeObserver = true;
                resizeObserver.observe(this.element, this.outputId, true, this.cellId);
            }
            const offsetHeight = this.element.offsetHeight;
            const cps = document.defaultView.getComputedStyle(this.element);
            const verticalPadding = parseFloat(cps.paddingTop) + parseFloat(cps.paddingBottom);
            const contentHeight = offsetHeight - verticalPadding;
            if (elementHasContent(contentHeight) && cps.padding === '0px') {
                // we set padding to zero if the output has no content (then we can have a zero-height output DOM node)
                // thus we need to ensure the padding is accounted when updating the init height of the output
                dimensionUpdater.updateHeight(this.outputId, offsetHeight + ctx.style.outputNodePadding * 2, {
                    isOutput: true,
                    init: true,
                });
                this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            }
            else if (elementHasContent(contentHeight)) {
                dimensionUpdater.updateHeight(this.outputId, this.element.offsetHeight, {
                    isOutput: true,
                    init: true,
                });
                this.element.style.padding = `0 ${ctx.style.outputNodePadding}px 0 ${ctx.style.outputNodeLeftPadding}`;
            }
            else {
                // we have a zero-height output DOM node
                dimensionUpdater.updateHeight(this.outputId, 0, {
                    isOutput: true,
                    init: true,
                });
            }
            const root = this.element.shadowRoot ?? this.element;
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            if (codeBlocks.length > 0) {
                postNotebookMessage('renderedCellOutput', {
                    codeBlocks,
                });
            }
        }
        updateAndRerender(content) {
            if (this._content) {
                this.render(content, this._content.preferredRendererId, this._content.preloadErrors);
            }
        }
    }
    const markupCellDragManager = new (class MarkupCellDragManager {
        constructor() {
            window.document.addEventListener('dragover', (e) => {
                // Allow dropping dragged markup cells
                e.preventDefault();
            });
            window.document.addEventListener('drop', (e) => {
                e.preventDefault();
                const drag = this.currentDrag;
                if (!drag) {
                    return;
                }
                this.currentDrag = undefined;
                postNotebookMessage('cell-drop', {
                    cellId: drag.cellId,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    dragOffsetY: e.clientY,
                });
            });
        }
        startDrag(e, cellId) {
            if (!e.dataTransfer) {
                return;
            }
            if (!currentOptions.dragAndDropEnabled) {
                return;
            }
            this.currentDrag = { cellId, clientY: e.clientY };
            const overlayZIndex = 9999;
            if (!this.dragOverlay) {
                this.dragOverlay = document.createElement('div');
                this.dragOverlay.style.position = 'absolute';
                this.dragOverlay.style.top = '0';
                this.dragOverlay.style.left = '0';
                this.dragOverlay.style.zIndex = `${overlayZIndex}`;
                this.dragOverlay.style.width = '100%';
                this.dragOverlay.style.height = '100%';
                this.dragOverlay.style.background = 'transparent';
                window.document.body.appendChild(this.dragOverlay);
            }
            ;
            e.target.style.zIndex = `${overlayZIndex + 1}`;
            e.target.classList.add('dragging');
            postNotebookMessage('cell-drag-start', {
                cellId: cellId,
                dragOffsetY: e.clientY,
            });
            // Continuously send updates while dragging instead of relying on `updateDrag`.
            // This lets us scroll the list based on drag position.
            const trySendDragUpdate = () => {
                if (this.currentDrag?.cellId !== cellId) {
                    return;
                }
                postNotebookMessage('cell-drag', {
                    cellId: cellId,
                    dragOffsetY: this.currentDrag.clientY,
                });
                window.requestAnimationFrame(trySendDragUpdate);
            };
            window.requestAnimationFrame(trySendDragUpdate);
        }
        updateDrag(e, cellId) {
            if (cellId !== this.currentDrag?.cellId) {
                this.currentDrag = undefined;
            }
            else {
                this.currentDrag = { cellId, clientY: e.clientY };
            }
        }
        endDrag(e, cellId) {
            this.currentDrag = undefined;
            e.target.classList.remove('dragging');
            postNotebookMessage('cell-drag-end', {
                cellId: cellId,
            });
            if (this.dragOverlay) {
                this.dragOverlay.remove();
                this.dragOverlay = undefined;
            }
            ;
            e.target.style.zIndex = '';
        }
    })();
}
export function preloadsScriptStr(styleValues, options, renderOptions, renderers, preloads, isWorkspaceTrusted, nonce) {
    const ctx = {
        style: styleValues,
        options,
        renderOptions,
        rendererData: renderers,
        staticPreloadsData: preloads,
        isWorkspaceTrusted,
        nonce,
    };
    // TS will try compiling `import()` in webviewPreloads, so use a helper function instead
    // of using `import(...)` directly
    return `
		const __import = (x) => import(x);
		(${webviewPreloads})(
			JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(ctx))}"))
		)\n//# sourceURL=notebookWebviewPreloads.js\n`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ByZWxvYWRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L3JlbmRlcmVycy93ZWJ2aWV3UHJlbG9hZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF5RmhHLEtBQUssVUFBVSxlQUFlLENBQUMsR0FBbUI7SUFDakQsZ0VBQWdFO0lBRWhFLGtFQUFrRTtJQUNsRSxpRUFBaUU7SUFDakUsa0RBQWtEO0lBRWxELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUE7SUFDckMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakQsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtJQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFBO0lBRXJDLFNBQVMsb0JBQW9CO1FBSzVCLElBQUksT0FBNEMsQ0FBQTtRQUNoRCxJQUFJLE1BQThCLENBQUE7UUFDbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDM0MsT0FBTyxHQUFHLEdBQUcsQ0FBQTtZQUNiLE1BQU0sR0FBRyxHQUFHLENBQUE7UUFDYixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQVEsRUFBRSxNQUFNLEVBQUUsTUFBTyxFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksY0FBYyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUE7SUFDaEMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUE7SUFDakQsSUFBSSxvQkFBb0IsR0FBRyxHQUFHLENBQUMsYUFB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