# Quote conversion

str.replace(/\[quote=\"(\w+), post:(\d+), topic:(\d+)"\]\n:game_die: (\d, \d, \d, \d, \d, \d)\n\[\/quote\]/g, `[$4](/t/x/$3/$2) by @$1`).replace(/\n\n/g, "\n")
