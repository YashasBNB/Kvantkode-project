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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sb2dnaW5nL2xvZ2dpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsSUFBSSxzQkFBcUQsQ0FBQTtBQUV6RCxNQUFNLFVBQVUsU0FBUyxDQUFDLE1BQXlCO0lBQ2xELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzdCLHNCQUFzQixHQUFHLE1BQU0sQ0FBQTtJQUNoQyxDQUFDO1NBQU0sSUFBSSxzQkFBc0IsWUFBWSxjQUFjLEVBQUUsQ0FBQztRQUM3RCxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzVDLENBQUM7U0FBTSxDQUFDO1FBQ1Asc0JBQXNCLEdBQUcsSUFBSSxjQUFjLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVM7SUFDeEIsT0FBTyxzQkFBc0IsQ0FBQTtBQUM5QixDQUFDO0FBRUQsSUFBSSx3QkFBd0IsR0FBa0QsU0FBUyxDQUFBO0FBQ3ZGLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxFQUFtQztJQUNyRSx3QkFBd0IsR0FBRyxFQUFFLENBQUE7QUFDOUIsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsR0FBcUI7SUFDbEQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQzlCLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLENBQUM7QUFDRixDQUFDO0FBcUNELE1BQU0sY0FBYztJQUNuQixZQUE0QixPQUE0QjtRQUE1QixZQUFPLEdBQVAsT0FBTyxDQUFxQjtJQUFHLENBQUM7SUFFNUQsdUJBQXVCLENBQUMsVUFBNEI7UUFDbkQs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