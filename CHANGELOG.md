# Change Log

## 1.0.0

- Initial release

## 1.0.1

- If there are no tasks scheduled until the current time, then get the last task from yesterday.

## 2.0.0

- No need to specify timezone in each mapping. Instead, define the `utcOffset` setting.

## 2.0.1

- Fixed bug when some tasks were skipped; Turns out the javascript runtime doesn't handle very well setTimouts passing a really long number as interval, so we're refreshing all the schedules every ten minutes.
