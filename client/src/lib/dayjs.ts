import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekYear from "dayjs/plugin/weekYear";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";

// antd's DatePicker/TimePicker (via rc-picker) call weekday()/localeData()/etc.
// on the dayjs objects we hand them, and parse strings with format args
// (customParseFormat). rc-picker extends these on its own load path, but the
// app's dayjs singleton is reached before that side-effect runs — so a value
// like dayjs("10:00", "HH:mm") produced "Invalid Date" and opening the calendar
// panel crashed (date.weekday is not a function). Extending the same plugin set
// here, imported first in main.tsx, guarantees the singleton is ready before any
// picker renders.
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);

export default dayjs;
