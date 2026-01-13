/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let globalObservableLogger;
export function addLogger(logger) {
    if (!globalObservableLogger) {
        globalObservableLogger = logger;
    }
    else if (globalObservableLogger instanceof ComposedLogger) {
        globalObservableLogger.loggers.push(logger);
    }
    else {
        globalObservableLogger = new ComposedLogger([globalObservableLogger, logger]);
    }
}
export function getLogger() {
    return globalObservableLogger;
}
let globalObservableLoggerFn = undefined;
export function setLogObservableFn(fn) {
    globalObservableLoggerFn = fn;
}
export function logObservable(obs) {
    if (globalObservableLoggerFn) {
        globalObservableLoggerFn(obs);
    }
}
class ComposedLogger {
    constructor(loggers) {
        this.loggers = loggers;
    }
    handleObservableCreated(observable) {
        for (const logger of this.loggers) {
            logger.handleObservableCreated(observable);
        }
    }
    handleOnListenerCountChanged(observable, newCount) {
        for (const logger of this.loggers) {
            logger.handleOnListenerCountChanged(observable, newCount);
        }
    }
    handleObservableUpdated(observable, info) {
        for (const logger of this.loggers) {
            logger.handleObservableUpdated(observable, info);
        }
    }
    handleAutorunCreated(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunCreated(autorun);
        }
    }
    handleAutorunDisposed(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunDisposed(autorun);
        }
    }
    handleAutorunDependencyChanged(autorun, observable, change) {
        for (const logger of this.loggers) {
            logger.handleAutorunDependencyChanged(autorun, observable, change);
        }
    }
    handleAutorunStarted(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunStarted(autorun);
        }
    }
    handleAutorunFinished(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunFinished(autorun);
        }
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        for (const logger of this.loggers) {
            logger.handleDerivedDependencyChanged(derived, observable, change);
        }
    }
    handleDerivedCleared(observable) {
        for (const logger of this.loggers) {
            logger.handleDerivedCleared(observable);
        }
    }
    handleBeginTransaction(transaction) {
        for (const logger of this.loggers) {
            logger.handleBeginTransaction(transaction);
        }
    }
    handleEndTransaction(transaction) {
        for (const logger of this.loggers) {
            logger.handleEndTransaction(transaction);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2xvZ2dpbmcvbG9nZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxJQUFJLHNCQUFxRCxDQUFBO0FBRXpELE1BQU0sVUFBVSxTQUFTLENBQUMsTUFBeUI7SUFDbEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDN0Isc0JBQXNCLEdBQUcsTUFBTSxDQUFBO0lBQ2hDLENBQUM7U0FBTSxJQUFJLHNCQUFzQixZQUFZLGNBQWMsRUFBRSxDQUFDO1FBQzdELHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQztTQUFNLENBQUM7UUFDUCxzQkFBc0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsU0FBUztJQUN4QixPQUFPLHNCQUFzQixDQUFBO0FBQzlCLENBQUM7QUFFRCxJQUFJLHdCQUF3QixHQUFrRCxTQUFTLENBQUE7QUFDdkYsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEVBQW1DO0lBQ3JFLHdCQUF3QixHQUFHLEVBQUUsQ0FBQTtBQUM5QixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFxQjtJQUNsRCxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDOUIsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDOUIsQ0FBQztBQUNGLENBQUM7QUFxQ0QsTUFBTSxjQUFjO0lBQ25CLFlBQTRCLE9BQTRCO1FBQTVCLFlBQU8sR0FBUCxPQUFPLENBQXFCO0lBQUcsQ0FBQztJQUU1RCx1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