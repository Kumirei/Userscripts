# Heat Map

This is a simple heat map library written with the needs of Wanikani Heatmap in mind. 
Provided with a config and a list of events, this script will create a heat map
element for each year of data provided and store it in the `.maps[year]`. It is 
also possible to create a heat map for a single day, and in this case it is stored
in `.maps.day`.

To create a heat map, you simply initiate an instance of the class with the
configuration object and your data 
```javascript
const heatmap = new Heatmap(config, data)
```

## Your Data

The data which you pass to the class consists of a list of events where each entry is a 
list `[date, counts, lists]`, where `date` is the unix epoch of the event. Counts
and lists contain data which is aggregated for whole day when the events are
processed. `counts` is a `[key, value]` pair (array) where `key` is the name of
the attribute you want to aggregate, and `value` is the numerical value this event
contributes. `lists` is similarly `[key, value]`, but instead of aggregating a count, it saves each value to a list on the day. 


## The Config Object

The config object has the following properties

- `id` - A string identifier you want to add to the top level element as a class
- `type` - Either `'year'` or `'day'`, to indicate if you want a heat maps for full years or only a single day
- `week_start` - Number indicating which day is the start of the week. `0=Monday, 7=Sunday` 
- `day_start` - Number of hours after midnight that the new day should start
- `first_date` - Unix epoch for when you want data to start being displayed
- `last_date` - Unix epoch for when you want data to stop being displayed
- `segment_years` - Boolean indicating whether to add gaps between months
- `zero_gap` - Boolean indicating whether to add gaps between days
- `markings` - A list of `[date, mark]` lists, where `date` is a unix epoch and `mark` is
a space separated list of *HTML class names* that you want added to the marked day  
- `day_hover_callback` - Function taking the arguments `[year, month, day], {counts, lists}`, where `year`, `month`, and `day`, are integers representing the date, `counts` and `list` are the day's aggregate data you passed when initialized the heat map. The function returns an element containing whatever information you want to display for that day
- `color_callback` - Like `day_hover_callback`, but you return a valid CSS color value for the day

