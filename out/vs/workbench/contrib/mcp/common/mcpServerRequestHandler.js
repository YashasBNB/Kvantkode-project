/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { DeferredPromise, IntervalTimer } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { canLog, LogLevel } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { MpcResponseError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Request handler for communicating with an MCP server.
 *
 * Handles sending requests and receiving responses, with automatic
 * handling of ping requests and typed client request methods.
 */
export class McpServerRequestHandler extends Disposable {
    set roots(roots) {
        if (!equals(this._roots, roots)) {
            this._roots = roots;
            if (this._hasAnnouncedRoots) {
                this.sendNotification({ method: 'notifications/roots/list_changed' });
                this._hasAnnouncedRoots = false;
            }
        }
    }
    get capabilities() {
        return this._serverInit.capabilities;
    }
    /**
     * Connects to the MCP server and does the initialization handshake.
     * @throws MpcResponseError if the server fails to initialize.
     */
    static async create(instaService, launch, logger, token) {
        const mcp = new McpServerRequestHandler(launch, logger);
        const store = new DisposableStore();
        try {
            const timer = store.add(new IntervalTimer());
            timer.cancelAndSet(() => {
                logger.info('Waiting for server to respond to `initialize` request...');
            }, 5000);
            await instaService.invokeFunction(async (accessor) => {
                const productService = accessor.get(IProductService);
                const initialized = await mcp.sendRequest({
                    method: 'initialize',
                    params: {
                        protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                        capabilities: {
                            roots: { listChanged: true },
                        },
                        clientInfo: {
                            name: productService.nameLong,
                            version: productService.version,
                        },
                    },
                }, token);
                mcp._serverInit = initialized;
                mcp.sendNotification({
                    method: 'notifications/initialized',
                });
            });
            return mcp;
        }
        catch (e) {
            mcp.dispose();
            throw e;
        }
        finally {
            store.dispose();
        }
    }
    constructor(launch, logger) {
        super();
        this.launch = launch;
        this.logger = logger;
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
        this._hasAnnouncedRoots = false;
        this._roots = [];
        // Event emitters for server notifications
        this._onDidReceiveCancelledNotification = this._register(new Emitter());
        this.onDidReceiveCancelledNotification = this._onDidReceiveCancelledNotification.event;
        this._onDidReceiveProgressNotification = this._register(new Emitter());
        this.onDidReceiveProgressNotification = this._onDidReceiveProgressNotification.event;
        this._onDidChangeResourceList = this._register(new Emitter());
        this.onDidChangeResourceList = this._onDidChangeResourceList.event;
        this._onDidUpdateResource = this._register(new Emitter());
        this.onDidUpdateResource = this._onDidUpdateResource.event;
        this._onDidChangeToolList = this._register(new Emitter());
        this.onDidChangeToolList = this._onDidChangeToolList.event;
        this._onDidChangePromptList = this._register(new Emitter());
        this.onDidChangePromptList = this._onDidChangePromptList.event;
        this._register(launch.onDidReceiveMessage((message) => this.handleMessage(message)));
        this._register(autorun((reader) => {
            const state = launch.state.read(reader).state;
            // the handler will get disposed when the launch stops, but if we're still
            // create()'ing we need to make sure to cancel the initialize request.
            if (state === 3 /* McpConnectionState.Kind.Error */ || state === 0 /* McpConnectionState.Kind.Stopped */) {
                this.cancelAllRequests();
            }
        }));
    }
    /**
     * Send a client request to the server and return the response.
     *
     * @param request The request to send
     * @param token Cancellation token
     * @param timeoutMs Optional timeout in milliseconds
     * @returns A promise that resolves with the response
     */
    async sendRequest(request, token = CancellationToken.None) {
        if (this._store.isDisposed) {
            return Promise.reject(new CancellationError());
        }
        const id = this._nextRequestId++;
        // Create the full JSON-RPC request
        const jsonRpcRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id,
            ...request,
        };
        const promise = new DeferredPromise();
        // Store the pending request
        this._pendingRequests.set(id, { promise });
        // Set up cancellation
        const cancelListener = token.onCancellationRequested(() => {
            if (!promise.isSettled) {
                this._pendingRequests.delete(id);
                this.sendNotification({ method: 'notifications/cancelled', params: { requestId: id } });
                promise.cancel();
            }
            cancelListener.dispose();
        });
        // Send the request
        this.send(jsonRpcRequest);
        const ret = promise.p.finally(() => {
            cancelListener.dispose();
            this._pendingRequests.delete(id);
        });
        return ret;
    }
    send(mcp) {
        if (canLog(this.logger.getLevel(), LogLevel.Debug)) {
            // avoid building the string if we don't need to
            this.logger.debug(`[editor -> server] ${JSON.stringify(mcp)}`);
        }
        this.launch.send(mcp);
    }
    /**
     * Handles paginated requests by making multiple requests until all items are retrieved.
     *
     * @param method The method name to call
     * @param getItems Function to extract the array of items from a result
     * @param initialParams Initial parameters
     * @param token Cancellation token
     * @returns Promise with all items combined
     */
    async sendRequestPaginated(method, getItems, initialParams, token = CancellationToken.None) {
        let allItems = [];
        let nextCursor = undefined;
        do {
            const params = {
                ...initialParams,
                cursor: nextCursor,
            };
            const result = await this.sendRequest({ method, params }, token);
            allItems = allItems.concat(getItems(result));
            nextCursor = result.nextCursor;
        } while (nextCursor !== undefined && !token.isCancellationRequested);
        return allItems;
    }
    sendNotification(notification) {
        this.send({ ...notification, jsonrpc: MCP.JSONRPC_VERSION });
    }
    /**
     * Handle incoming messages from the server
     */
    handleMessage(message) {
        if (canLog(this.logger.getLevel(), LogLevel.Debug)) {
            // avoid building the string if we don't need to
            this.logger.debug(`[server <- editor] ${JSON.stringify(message)}`);
        }
        // Handle responses to our requests
        if ('id' in message) {
            if ('result' in message) {
                this.handleResult(message);
            }
            else if ('error' in message) {
                this.handleError(message);
            }
        }
        // Handle requests from the server
        if ('method' in message) {
            if ('id' in message) {
                this.handleServerRequest(message);
            }
            else {
                this.handleServerNotification(message);
            }
        }
    }
    /**
     * Handle successful responses
     */
    handleResult(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.complete(response.result);
        }
    }
    /**
     * Handle error responses
     */
    handleError(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.error(new MpcResponseError(response.error.message, response.error.code, response.error.data));
        }
    }
    /**
     * Handle incoming server requests
     */
    handleServerRequest(request) {
        switch (request.method) {
            case 'ping':
                return this.respondToRequest(request, this.handlePing(request));
            case 'roots/list':
                return this.respondToRequest(request, this.handleRootsList(request));
            default: {
                const errorResponse = {
                    jsonrpc: MCP.JSONRPC_VERSION,
                    id: request.id,
                    error: {
                        code: MCP.METHOD_NOT_FOUND,
                        message: `Method not found: ${request.method}`,
                    },
                };
                this.send(errorResponse);
                break;
            }
        }
    }
    /**
     * Handle incoming server notifications
     */
    handleServerNotification(request) {
        switch (request.method) {
            case 'notifications/message':
                return this.handleLoggingNotification(request);
            case 'notifications/cancelled':
                this._onDidReceiveCancelledNotification.fire(request);
                return this.handleCancelledNotification(request);
            case 'notifications/progress':
                this._onDidReceiveProgressNotification.fire(request);
                return;
            case 'notifications/resources/list_changed':
                this._onDidChangeResourceList.fire();
                return;
            case 'notifications/resources/updated':
                this._onDidUpdateResource.fire(request);
                return;
            case 'notifications/tools/list_changed':
                this._onDidChangeToolList.fire();
                return;
            case 'notifications/prompts/list_changed':
                this._onDidChangePromptList.fire();
                return;
        }
    }
    handleCancelledNotification(request) {
        const pendingRequest = this._pendingRequests.get(request.params.requestId);
        if (pendingRequest) {
            this._pendingRequests.delete(request.params.requestId);
            pendingRequest.promise.cancel();
        }
    }
    handleLoggingNotification(request) {
        let contents = typeof request.params.data === 'string'
            ? request.params.data
            : JSON.stringify(request.params.data);
        if (request.params.logger) {
            contents = `${request.params.logger}: ${contents}`;
        }
        switch (request.params?.level) {
            case 'debug':
                this.logger.debug(contents);
                break;
            case 'info':
            case 'notice':
                this.logger.info(contents);
                break;
            case 'warning':
                this.logger.warn(contents);
                break;
            case 'error':
            case 'critical':
            case 'alert':
            case 'emergency':
                this.logger.error(contents);
                break;
            default:
                this.logger.info(contents);
                break;
        }
    }
    /**
     * Send a generic response to a request
     */
    respondToRequest(request, result) {
        const response = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: request.id,
            result,
        };
        this.send(response);
    }
    /**
     * Send a response to a ping request
     */
    handlePing(_request) {
        return {};
    }
    /**
     * Send a response to a roots/list request
     */
    handleRootsList(_request) {
        this._hasAnnouncedRoots = true;
        return { roots: this._roots };
    }
    cancelAllRequests() {
        this._pendingRequests.forEach((pending) => pending.promise.cancel());
        this._pendingRequests.clear();
    }
    dispose() {
        this.cancelAllRequests();
        super.dispose();
    }
    /**
     * Send an initialize request
     */
    initialize(params, token) {
        return this.sendRequest({ method: 'initialize', params }, token);
    }
    /**
     * List available resources
     */
    listResources(params, token) {
        return this.sendRequestPaginated('resources/list', (result) => result.resources, params, token);
    }
    /**
     * Read a specific resource
     */
    readResource(params, token) {
        return this.sendRequest({ method: 'resources/read', params }, token);
    }
    /**
     * List available resource templates
     */
    listResourceTemplates(params, token) {
        return this.sendRequestPaginated('resources/templates/list', (result) => result.resourceTemplates, params, token);
    }
    /**
     * Subscribe to resource updates
     */
    subscribe(params, token) {
        return this.sendRequest({ method: 'resources/subscribe', params }, token);
    }
    /**
     * Unsubscribe from resource updates
     */
    unsubscribe(params, token) {
        return this.sendRequest({ method: 'resources/unsubscribe', params }, token);
    }
    /**
     * List available prompts
     */
    listPrompts(params, token) {
        return this.sendRequestPaginated('prompts/list', (result) => result.prompts, params, token);
    }
    /**
     * Get a specific prompt
     */
    getPrompt(params, token) {
        return this.sendRequest({ method: 'prompts/get', params }, token);
    }
    /**
     * List available tools
     */
    listTools(params, token) {
        return this.sendRequestPaginated('tools/list', (result) => result.tools, params, token);
    }
    /**
     * Call a specific tool
     */
    callTool(params, token) {
        return this.sendRequest({ method: 'tools/call', params }, token);
    }
    /**
     * Set the logging level
     */
    setLevel(params, token) {
        return this.sendRequest({ method: 'logging/setLevel', params }, token);
    }
    /**
     * Find completions for an argument
     */
    complete(params, token) {
        return this.sendRequest({ method: 'completion/complete', params }, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFNlcnZlclJlcXVlc3RIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsTUFBTSxFQUFXLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUV2RixPQUFPLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQWMvQzs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBT3RELElBQVcsS0FBSyxDQUFDLEtBQWlCO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1lBQ25CLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQ0FBa0MsRUFBRSxDQUFDLENBQUE7Z0JBQ3JFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBR0QsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUE7SUFDckMsQ0FBQztJQTJCRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDekIsWUFBbUMsRUFDbkMsTUFBNEIsRUFDNUIsTUFBZSxFQUNmLEtBQXlCO1FBRXpCLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDNUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsMERBQTBELENBQUMsQ0FBQTtZQUN4RSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFUixNQUFNLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUNwRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLFdBQVcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQ3hDO29CQUNDLE1BQU0sRUFBRSxZQUFZO29CQUNwQixNQUFNLEVBQUU7d0JBQ1AsZUFBZSxFQUFFLEdBQUcsQ0FBQyx1QkFBdUI7d0JBQzVDLFlBQVksRUFBRTs0QkFDYixLQUFLLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO3lCQUM1Qjt3QkFDRCxVQUFVLEVBQUU7NEJBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxRQUFROzRCQUM3QixPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87eUJBQy9CO3FCQUNEO2lCQUNELEVBQ0QsS0FBSyxDQUNMLENBQUE7Z0JBRUQsR0FBRyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7Z0JBRTdCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBOEI7b0JBQ2pELE1BQU0sRUFBRSwyQkFBMkI7aUJBQ25DLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1lBRUYsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNiLE1BQU0sQ0FBQyxDQUFBO1FBQ1IsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFDa0IsTUFBNEIsRUFDN0IsTUFBZTtRQUUvQixLQUFLLEVBQUUsQ0FBQTtRQUhVLFdBQU0sR0FBTixNQUFNLENBQXNCO1FBQzdCLFdBQU0sR0FBTixNQUFNLENBQVM7UUFyR3hCLG1CQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ1QscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7UUFFcEUsdUJBQWtCLEdBQUcsS0FBSyxDQUFBO1FBQzFCLFdBQU0sR0FBZSxFQUFFLENBQUE7UUFpQi9CLDBDQUEwQztRQUN6Qix1Q0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuRSxJQUFJLE9BQU8sRUFBNkIsQ0FDeEMsQ0FBQTtRQUNRLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUE7UUFFekUsc0NBQWlDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEUsSUFBSSxPQUFPLEVBQTRCLENBQ3ZDLENBQUE7UUFDUSxxQ0FBZ0MsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFBO1FBRXZFLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3RFLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7UUFFckQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckQsSUFBSSxPQUFPLEVBQW1DLENBQzlDLENBQUE7UUFDUSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTdDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ2xFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFFN0MsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDcEUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQTREakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQzdDLDBFQUEwRTtZQUMxRSxzRUFBc0U7WUFDdEUsSUFBSSxLQUFLLDBDQUFrQyxJQUFJLEtBQUssNENBQW9DLEVBQUUsQ0FBQztnQkFDMUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNLLEtBQUssQ0FBQyxXQUFXLENBQ3hCLE9BQXFDLEVBQ3JDLFFBQTJCLGlCQUFpQixDQUFDLElBQUk7UUFFakQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBRUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRWhDLG1DQUFtQztRQUNuQyxNQUFNLGNBQWMsR0FBdUI7WUFDMUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxlQUFlO1lBQzVCLEVBQUU7WUFDRixHQUFHLE9BQU87U0FDVixDQUFBO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLEVBQW9CLENBQUE7UUFDdkQsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUMxQyxzQkFBc0I7UUFDdEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN6RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDdkYsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2pCLENBQUM7WUFDRCxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQUE7UUFFRixtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN6QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDbEMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDakMsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLEdBQWlCLENBQUE7SUFDekIsQ0FBQztJQUVPLElBQUksQ0FBQyxHQUF1QjtRQUNuQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELGdEQUFnRDtZQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNLLEtBQUssQ0FBQyxvQkFBb0IsQ0FLakMsTUFBbUIsRUFDbkIsUUFBNEIsRUFDNUIsYUFBbUQsRUFDbkQsUUFBMkIsaUJBQWlCLENBQUMsSUFBSTtRQUVqRCxJQUFJLFFBQVEsR0FBUSxFQUFFLENBQUE7UUFDdEIsSUFBSSxVQUFVLEdBQTJCLFNBQVMsQ0FBQTtRQUVsRCxHQUFHLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBZ0I7Z0JBQzNCLEdBQUcsYUFBYTtnQkFDaEIsTUFBTSxFQUFFLFVBQVU7YUFDbEIsQ0FBQTtZQUVELE1BQU0sTUFBTSxHQUFNLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6RSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQTtRQUMvQixDQUFDLFFBQVEsVUFBVSxLQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBQztRQUVwRSxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRU8sZ0JBQWdCLENBQW1DLFlBQWU7UUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxhQUFhLENBQUMsT0FBMkI7UUFDaEQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxnREFBZ0Q7WUFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7WUFDckIsSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxJQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQWlELENBQUMsQ0FBQTtZQUM1RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQTJELENBQUMsQ0FBQTtZQUMzRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLFlBQVksQ0FBQyxRQUE2QjtRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDekMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxXQUFXLENBQUMsUUFBMEI7UUFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUNwQixJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQ3RGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssbUJBQW1CLENBQUMsT0FBK0M7UUFDMUUsUUFBUSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsS0FBSyxNQUFNO2dCQUNWLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDaEUsS0FBSyxZQUFZO2dCQUNoQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBRXJFLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsTUFBTSxhQUFhLEdBQXFCO29CQUN2QyxPQUFPLEVBQUUsR0FBRyxDQUFDLGVBQWU7b0JBQzVCLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtvQkFDZCxLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0I7d0JBQzFCLE9BQU8sRUFBRSxxQkFBcUIsT0FBTyxDQUFDLE1BQU0sRUFBRTtxQkFDOUM7aUJBQ0QsQ0FBQTtnQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN4QixNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0Q7O09BRUc7SUFDSyx3QkFBd0IsQ0FDL0IsT0FBeUQ7UUFFekQsUUFBUSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsS0FBSyx1QkFBdUI7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQy9DLEtBQUsseUJBQXlCO2dCQUM3QixJQUFJLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRCxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNqRCxLQUFLLHdCQUF3QjtnQkFDNUIsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDcEQsT0FBTTtZQUNQLEtBQUssc0NBQXNDO2dCQUMxQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3BDLE9BQU07WUFDUCxLQUFLLGlDQUFpQztnQkFDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDdkMsT0FBTTtZQUNQLEtBQUssa0NBQWtDO2dCQUN0QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2hDLE9BQU07WUFDUCxLQUFLLG9DQUFvQztnQkFDeEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFBO2dCQUNsQyxPQUFNO1FBQ1IsQ0FBQztJQUNGLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxPQUFrQztRQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDMUUsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDdEQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QixDQUFDLE9BQXVDO1FBQ3hFLElBQUksUUFBUSxHQUNYLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUN0QyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJO1lBQ3JCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLFFBQVEsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFBO1FBQ25ELENBQUM7UUFFRCxRQUFRLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDL0IsS0FBSyxPQUFPO2dCQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMzQixNQUFLO1lBQ04sS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLFFBQVE7Z0JBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFCLE1BQUs7WUFDTixLQUFLLFNBQVM7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFCLE1BQUs7WUFDTixLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssVUFBVSxDQUFDO1lBQ2hCLEtBQUssT0FBTyxDQUFDO1lBQ2IsS0FBSyxXQUFXO2dCQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMzQixNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFCLE1BQUs7UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCLENBQUMsT0FBMkIsRUFBRSxNQUFrQjtRQUN2RSxNQUFNLFFBQVEsR0FBd0I7WUFDckMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxlQUFlO1lBQzVCLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNkLE1BQU07U0FDTixDQUFBO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxVQUFVLENBQUMsUUFBeUI7UUFDM0MsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQUMsUUFBOEI7UUFDckQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUM5QixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FDVCxNQUF1QyxFQUN2QyxLQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsRUFDaEMsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhLENBQ1osTUFBMkMsRUFDM0MsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBSTlCLGdCQUFnQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQ1gsTUFBeUMsRUFDekMsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUN0QixFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsRUFDcEMsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxxQkFBcUIsQ0FDcEIsTUFBbUQsRUFDbkQsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBSTlCLDBCQUEwQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ25GLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FDUixNQUFzQyxFQUN0QyxLQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxFQUN6QyxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVcsQ0FDVixNQUF3QyxFQUN4QyxLQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxFQUMzQyxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVcsQ0FDVixNQUF5QyxFQUN6QyxLQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FDL0IsY0FBYyxFQUNkLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUMxQixNQUFNLEVBQ04sS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLENBQ1IsTUFBc0MsRUFDdEMsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUN0QixFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLEVBQ2pDLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxDQUNSLE1BQXVDLEVBQ3ZDLEtBQXlCO1FBRXpCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUMvQixZQUFZLEVBQ1osQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQ3hCLE1BQU0sRUFDTixLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVEsQ0FDUCxNQUFxQyxFQUNyQyxLQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsRUFDaEMsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRLENBQ1AsTUFBcUMsRUFDckMsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUN0QixFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsRUFDdEMsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRLENBQ1AsTUFBcUMsRUFDckMsS0FBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUN0QixFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsRUFDekMsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==