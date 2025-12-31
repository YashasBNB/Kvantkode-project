/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { LANGUAGE_DEFAULT } from './platform.js';
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
/**
 * Create a localized difference of the time between now and the specified date.
 * @param date The date to generate the difference from.
 * @param appendAgoLabel Whether to append the " ago" to the end.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 * @param disallowNow Whether to disallow the string "now" when the difference
 * is less than 30 seconds.
 */
export function fromNow(date, appendAgoLabel, useFullTimeWords, disallowNow) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const seconds = Math.round((new Date().getTime() - date) / 1000);
    if (seconds < -30) {
        return localize('date.fromNow.in', 'in {0}', fromNow(new Date().getTime() + seconds * 1000, false));
    }
    if (!disallowNow && seconds < 30) {
        return localize('date.fromNow.now', 'now');
    }
    let value;
    if (seconds < minute) {
        value = seconds;
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.singular.ago.fullWord', '{0} second ago', value)
                    : localize('date.fromNow.seconds.singular.ago', '{0} sec ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.plural.ago.fullWord', '{0} seconds ago', value)
                    : localize('date.fromNow.seconds.plural.ago', '{0} secs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.singular.fullWord', '{0} second', value)
                    : localize('date.fromNow.seconds.singular', '{0} sec', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.plural.fullWord', '{0} seconds', value)
                    : localize('date.fromNow.seconds.plural', '{0} secs', value);
            }
        }
    }
    if (seconds < hour) {
        value = Math.floor(seconds / minute);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.singular.ago.fullWord', '{0} minute ago', value)
                    : localize('date.fromNow.minutes.singular.ago', '{0} min ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.plural.ago.fullWord', '{0} minutes ago', value)
                    : localize('date.fromNow.minutes.plural.ago', '{0} mins ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.singular.fullWord', '{0} minute', value)
                    : localize('date.fromNow.minutes.singular', '{0} min', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.plural.fullWord', '{0} minutes', value)
                    : localize('date.fromNow.minutes.plural', '{0} mins', value);
            }
        }
    }
    if (seconds < day) {
        value = Math.floor(seconds / hour);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.singular.ago.fullWord', '{0} hour ago', value)
                    : localize('date.fromNow.hours.singular.ago', '{0} hr ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.plural.ago.fullWord', '{0} hours ago', value)
                    : localize('date.fromNow.hours.plural.ago', '{0} hrs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.singular.fullWord', '{0} hour', value)
                    : localize('date.fromNow.hours.singular', '{0} hr', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.plural.fullWord', '{0} hours', value)
                    : localize('date.fromNow.hours.plural', '{0} hrs', value);
            }
        }
    }
    if (seconds < week) {
        value = Math.floor(seconds / day);
        if (appendAgoLabel) {
            return value === 1
                ? localize('date.fromNow.days.singular.ago', '{0} day ago', value)
                : localize('date.fromNow.days.plural.ago', '{0} days ago', value);
        }
        else {
            return value === 1
                ? localize('date.fromNow.days.singular', '{0} day', value)
                : localize('date.fromNow.days.plural', '{0} days', value);
        }
    }
    if (seconds < month) {
        value = Math.floor(seconds / week);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.singular.ago.fullWord', '{0} week ago', value)
                    : localize('date.fromNow.weeks.singular.ago', '{0} wk ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.plural.ago.fullWord', '{0} weeks ago', value)
                    : localize('date.fromNow.weeks.plural.ago', '{0} wks ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.singular.fullWord', '{0} week', value)
                    : localize('date.fromNow.weeks.singular', '{0} wk', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.plural.fullWord', '{0} weeks', value)
                    : localize('date.fromNow.weeks.plural', '{0} wks', value);
            }
        }
    }
    if (seconds < year) {
        value = Math.floor(seconds / month);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.months.singular.ago.fullWord', '{0} month ago', value)
                    : localize('date.fromNow.months.singular.ago', '{0} mo ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.months.plural.ago.fullWord', '{0} months ago', value)
                    : localize('date.fromNow.months.plural.ago', '{0} mos ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.months.singular.fullWord', '{0} month', value)
                    : localize('date.fromNow.months.singular', '{0} mo', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.months.plural.fullWord', '{0} months', value)
                    : localize('date.fromNow.months.plural', '{0} mos', value);
            }
        }
    }
    value = Math.floor(seconds / year);
    if (appendAgoLabel) {
        if (value === 1) {
            return useFullTimeWords
                ? localize('date.fromNow.years.singular.ago.fullWord', '{0} year ago', value)
                : localize('date.fromNow.years.singular.ago', '{0} yr ago', value);
        }
        else {
            return useFullTimeWords
                ? localize('date.fromNow.years.plural.ago.fullWord', '{0} years ago', value)
                : localize('date.fromNow.years.plural.ago', '{0} yrs ago', value);
        }
    }
    else {
        if (value === 1) {
            return useFullTimeWords
                ? localize('date.fromNow.years.singular.fullWord', '{0} year', value)
                : localize('date.fromNow.years.singular', '{0} yr', value);
        }
        else {
            return useFullTimeWords
                ? localize('date.fromNow.years.plural.fullWord', '{0} years', value)
                : localize('date.fromNow.years.plural', '{0} yrs', value);
        }
    }
}
export function fromNowByDay(date, appendAgoLabel, useFullTimeWords) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const todayMidnightTime = new Date();
    todayMidnightTime.setHours(0, 0, 0, 0);
    const yesterdayMidnightTime = new Date(todayMidnightTime.getTime());
    yesterdayMidnightTime.setDate(yesterdayMidnightTime.getDate() - 1);
    if (date > todayMidnightTime.getTime()) {
        return localize('today', 'Today');
    }
    if (date > yesterdayMidnightTime.getTime()) {
        return localize('yesterday', 'Yesterday');
    }
    return fromNow(date, appendAgoLabel, useFullTimeWords);
}
/**
 * Gets a readable duration with intelligent/lossy precision. For example "40ms" or "3.040s")
 * @param ms The duration to get in milliseconds.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 */
export function getDurationString(ms, useFullTimeWords) {
    const seconds = Math.abs(ms / 1000);
    if (seconds < 1) {
        return useFullTimeWords
            ? localize('duration.ms.full', '{0} milliseconds', ms)
            : localize('duration.ms', '{0}ms', ms);
    }
    if (seconds < minute) {
        return useFullTimeWords
            ? localize('duration.s.full', '{0} seconds', Math.round(ms) / 1000)
            : localize('duration.s', '{0}s', Math.round(ms) / 1000);
    }
    if (seconds < hour) {
        return useFullTimeWords
            ? localize('duration.m.full', '{0} minutes', Math.round(ms / (1000 * minute)))
            : localize('duration.m', '{0} mins', Math.round(ms / (1000 * minute)));
    }
    if (seconds < day) {
        return useFullTimeWords
            ? localize('duration.h.full', '{0} hours', Math.round(ms / (1000 * hour)))
            : localize('duration.h', '{0} hrs', Math.round(ms / (1000 * hour)));
    }
    return localize('duration.d', '{0} days', Math.round(ms / (1000 * day)));
}
export function toLocalISOString(date) {
    return (date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0') +
        'T' +
        String(date.getHours()).padStart(2, '0') +
        ':' +
        String(date.getMinutes()).padStart(2, '0') +
        ':' +
        String(date.getSeconds()).padStart(2, '0') +
        '.' +
        (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z');
}
export const safeIntl = {
    DateTimeFormat(locales, options) {
        try {
            return new Intl.DateTimeFormat(locales, options);
        }
        catch {
            return new Intl.DateTimeFormat(undefined, options);
        }
    },
    Collator(locales, options) {
        try {
            return new Intl.Collator(locales, options);
        }
        catch {
            return new Intl.Collator(undefined, options);
        }
    },
    Segmenter(locales, options) {
        try {
            return new Intl.Segmenter(locales, options);
        }
        catch {
            return new Intl.Segmenter(undefined, options);
        }
    },
    Locale(tag, options) {
        try {
            return new Intl.Locale(tag, options);
        }
        catch {
            return new Intl.Locale(LANGUAGE_DEFAULT, options);
        }
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFaEQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO0FBQ2pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUE7QUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0FBQ3BCLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUE7QUFDdEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQTtBQUV0Qjs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQ3RCLElBQW1CLEVBQ25CLGNBQXdCLEVBQ3hCLGdCQUEwQixFQUMxQixXQUFxQjtJQUVyQixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO0lBQ2hFLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkIsT0FBTyxRQUFRLENBQ2QsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUNyRCxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxHQUFHLEVBQUUsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sUUFBUSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLEtBQWEsQ0FBQTtJQUNqQixJQUFJLE9BQU8sR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUN0QixLQUFLLEdBQUcsT0FBTyxDQUFBO1FBRWYsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDO29CQUNqRixDQUFDLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsMENBQTBDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDO29CQUNoRixDQUFDLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQztvQkFDekUsQ0FBQyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDL0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUM7b0JBQ3hFLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQixPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUM7b0JBQ2pGLENBQUMsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUM7b0JBQ2hGLENBQUMsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RFLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQixPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDO29CQUN6RSxDQUFDLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMvRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQztvQkFDeEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDOUQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDbkIsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQ2xDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUM7b0JBQzdFLENBQUMsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDO29CQUM1RSxDQUFDLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNuRSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztvQkFDckUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUM7b0JBQ3BFLENBQUMsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNqQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxLQUFLLENBQUM7Z0JBQ2pCLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQztnQkFDbEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEtBQUssS0FBSyxDQUFDO2dCQUNqQixDQUFDLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUM7Z0JBQzFELENBQUMsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDckIsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQ2xDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUM7b0JBQzdFLENBQUMsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDO29CQUM1RSxDQUFDLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNuRSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztvQkFDckUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUM7b0JBQ3BFLENBQUMsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQixPQUFPLGdCQUFnQjtvQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDO29CQUMvRSxDQUFDLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNyRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMseUNBQXlDLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDO29CQUM5RSxDQUFDLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNwRSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxnQkFBZ0I7b0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQztvQkFDdkUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDN0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUM7b0JBQ3RFLENBQUMsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNsQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sZ0JBQWdCO2dCQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUM7Z0JBQzdFLENBQUMsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxnQkFBZ0I7Z0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQztnQkFDNUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakIsT0FBTyxnQkFBZ0I7Z0JBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztnQkFDckUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLGdCQUFnQjtnQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDO2dCQUNwRSxDQUFDLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUMzQixJQUFtQixFQUNuQixjQUF3QixFQUN4QixnQkFBMEI7SUFFMUIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7SUFDcEMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUNuRSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFFbEUsSUFBSSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUN4QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksSUFBSSxHQUFHLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDNUMsT0FBTyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUE7QUFDdkQsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEVBQVUsRUFBRSxnQkFBMEI7SUFDdkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDbkMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDakIsT0FBTyxnQkFBZ0I7WUFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFDRCxJQUFJLE9BQU8sR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUN0QixPQUFPLGdCQUFnQjtZQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNuRSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDcEIsT0FBTyxnQkFBZ0I7WUFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5RSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFDRCxJQUFJLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNuQixPQUFPLGdCQUFnQjtZQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFFLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3pFLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBVTtJQUMxQyxPQUFPLENBQ04sSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNsQixHQUFHO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztRQUM1QyxHQUFHO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1FBQ3ZDLEdBQUc7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7UUFDeEMsR0FBRztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztRQUMxQyxHQUFHO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1FBQzFDLEdBQUc7UUFDSCxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsR0FBRyxDQUNILENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHO0lBQ3ZCLGNBQWMsQ0FDYixPQUE4QixFQUM5QixPQUFvQztRQUVwQyxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakQsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUNELFFBQVEsQ0FBQyxPQUE4QixFQUFFLE9BQThCO1FBQ3RFLElBQUksQ0FBQztZQUNKLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBQ0QsU0FBUyxDQUFDLE9BQThCLEVBQUUsT0FBK0I7UUFDeEUsSUFBSSxDQUFDO1lBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUMsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBeUIsRUFBRSxPQUE0QjtRQUM3RCxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQSJ9