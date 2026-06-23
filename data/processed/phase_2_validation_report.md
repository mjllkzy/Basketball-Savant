# Phase 2 Validation Report

Generated at: 2026-06-22T09:56:14+00:00
Raw workbook: `/Users/johnnypark/Documents/Codex/2026-06-16/aribradshaw-johnnystuff-https-github-com-aribradshaw/outputs/basketball-savant/data/raw/nba_data_2025_26.xlsx`
Source workbook SHA256: `196c596139340b0abe43668f0ecd42a1a77321767f1d6cde640251ee35d69169`
Issue-log workbook SHA256 matches current raw file: `True`

## Executive Summary

| Check | Result |
| --- | --- |
| Sheets found | 67 |
| Sheets imported | 67 |
| Sheets skipped | 0 |
| Sheets failed | 0 |
| Unique players | 582 |
| Total stat rows | 567552 |
| Generated profile JSON files | 582 |
| Players in public/data/players.json | 582 |
| Missing player profiles | 0 |
| Extra generated profiles | 0 |
| Profiles with missing required DB fields/stat rows | 0 |
| Profile files missing expected JSON keys in opening chunk | 0 |
| Duplicate cleaned column names within imported sheets | 0 |
| Raw Excel git status | clean / unchanged |
| SQLite git status | not staged / ignored |
| SQLite tracked by git | no |
| SQLite ignored rule | .gitignore:12:data/processed/*.sqlite	data/processed/nba_master.sqlite |
| Duplicate * 2.json files | 0 |
| Duplicate * copy*.json files | 0 |
| Duplicate numbered profile files (* [0-9].json) | 0 |

## Profile Integrity

Every player in `public/data/players.json` has a matching `public/data/player_profiles/{player_slug}.json` file: `True`.
Every generated profile is represented in SQLite with `player_name`, `player_slug`, `season`, `season_type`, `primary_team`, `teams`, source sheets, and stat rows: `True`.
Every generated profile file opening chunk includes the expected top-level JSON keys: `True`.

## Top 25 Players By Stat Rows

| Player | Slug | Team | Stat rows |
| --- | --- | --- | --- |
| CJ McCollum | cj-mccollum | ATL | 1267 |
| Khris Middleton | khris-middleton | DAL | 1222 |
| Bennedict Mathurin | bennedict-mathurin | LAC | 1201 |
| Ayo Dosunmu | ayo-dosunmu | MIN | 1192 |
| Dennis Schröder | dennis-schroder | CLE | 1192 |
| Kevin Huerter | kevin-huerter | DET | 1192 |
| James Harden | james-harden | CLE | 1177 |
| Jose Alvarado | jose-alvarado | NYK | 1177 |
| Nikola Vučević | nikola-vucevic | BOS | 1177 |
| Walter Clayton Jr. | walter-clayton-jr | MEM | 1177 |
| Kyle Anderson | kyle-anderson | MIN | 1174 |
| Anfernee Simons | anfernee-simons | CHI | 1171 |
| Coby White | coby-white | CHA | 1171 |
| Jaren Jackson Jr. | jaren-jackson-jr | UTA | 1171 |
| Tyus Jones | tyus-jones | DEN | 1165 |
| Collin Sexton | collin-sexton | CHI | 1162 |
| Darius Garland | darius-garland | LAC | 1156 |
| Corey Kispert | corey-kispert | ATL | 1147 |
| Luke Kennard | luke-kennard | LAL | 1147 |
| Buddy Hield | buddy-hield | ATL | 1141 |
| De'Andre Hunter | de-andre-hunter | SAC | 1141 |
| Jonathan Kuminga | jonathan-kuminga | ATL | 1141 |
| Jared McCain | jared-mccain | OKC | 1132 |
| Jock Landale | jock-landale | ATL | 1132 |
| Vít Krejčí | vit-krejci | POR | 1132 |

## Bottom 25 Players By Stat Rows

| Player | Slug | Team | Stat rows |
| --- | --- | --- | --- |
| Noa Essengue | noa-essengue | CHI | 614 |
| Stanley Umude | stanley-umude | SAS | 660 |
| Darius Brown | darius-brown | CLE | 663 |
| Hayden Gray | hayden-gray | UTA | 674 |
| Buddy Boeheim | buddy-boeheim | OKC | 690 |
| Colby Jones | colby-jones | DET | 690 |
| Trentyn Flowers | trentyn-flowers | CHI | 690 |
| Bismack Biyombo | bismack-biyombo | SAS | 694 |
| Colin Castleton | colin-castleton | ORL | 694 |
| Tosan Evbuomwan | tosan-evbuomwan | CHA | 694 |
| Vladislav Goldin | vladislav-goldin | MIA | 694 |
| Alex Morales | alex-morales | ORL | 696 |
| Harrison Ingram | harrison-ingram | SAS | 700 |
| Adou Thiero | adou-thiero | LAL | 710 |
| CJ Huntley | cj-huntley | PHX | 710 |
| Emanuel Miller | emanuel-miller | SAS | 710 |
| Hunter Dickinson | hunter-dickinson | NOP | 710 |
| Hunter Sallis | hunter-sallis | PHI | 710 |
| Jacob Toppin | jacob-toppin | ATL | 710 |
| Jahmyl Telfort | jahmyl-telfort | LAC | 710 |
| Jayson Kent | jayson-kent | POR | 710 |
| Mouhamadou Gueye | mouhamadou-gueye | CHI | 710 |
| N'Faly Dante | n-faly-dante | ATL | 710 |
| Norchad Omier | norchad-omier | LAC | 710 |
| Olivier Sarr | olivier-sarr | CLE | 710 |

## Sheets With Unusually Low Row Counts

Listed as the 12 lowest `imported_data_rows` sheets. Low counts are expected for play-type slices where only qualifying players appear.
| Sheet | Imported data rows | Stat rows created |
| --- | --- | --- |
| Playtype - Hand Off - Defense | 50 | 750 |
| Playtype - Misc - Offense | 50 | 750 |
| Playtype - Post Up - Offense | 149 | 2235 |
| Playtype - Off Screen - Offense | 215 | 3225 |
| General - Official Leaders | 234 | 4914 |
| Playtype - Pick & Roll Roll Man | 269 | 4035 |
| Playtype - Hand Off - Offense | 276 | 4140 |
| Playtype - Isolation - Offense | 284 | 4260 |
| Playtype - Putbacks - Offense | 301 | 4515 |
| Playtype - Off Screen - Defense | 317 | 4755 |
| Playtype - Post Up - Defense | 329 | 4935 |
| Playtype - Cut - Offense | 339 | 5085 |

## Sheets With Unusually High Row Counts

Listed as the 12 highest `imported_data_rows` sheets. The 661-row opponent sheets are NBA.com opponent exports and are expected to include more rows than the main 582-player index.
| Sheet | Imported data rows | Stat rows created |
| --- | --- | --- |
| General - Opponent - Per Game | 661 | 17186 |
| General - Opponent - Per Minute | 661 | 17186 |
| General - Opponent - Per Posses | 661 | 17186 |
| Bios | 582 | 10476 |
| General - Advanced | 582 | 12804 |
| General - Defense | 582 | 11058 |
| General - Estimated Advanced | 582 | 8730 |
| General - Misc | 582 | 10476 |
| General - Scoring | 582 | 12222 |
| General - Traditional | 582 | 16296 |
| General - Usage | 582 | 13968 |
| General - Violations | 582 | 11640 |

## Reviewed Sheets Now Imported

Total reviewed sheets imported: `18`.
| Sheet | Why safe to import now | Audit issues retained in log |
| --- | --- | --- |
| General - Official Leaders | Reviewed after audit: NBA.com official leaders export with a time-formatted 3PM header. | non_text_header_values, blank_rows |
| General - Traditional | Reviewed after audit: NBA.com Per Game export with one time-formatted 3PM header. | non_text_header_values, blank_header_columns, blank_rows |
| General - Estimated Advanced | Reviewed after audit: NBA.com estimated advanced export with player rows but no team column. | missing_team_column, blank_header_columns, blank_rows |
| Clutch - Traditional | Reviewed after audit: NBA.com clutch traditional export with one time-formatted 3PM header. | non_text_header_values, blank_header_columns, blank_rows |
| Sheet69 | Reviewed after audit: generic sheet name, but layout is a valid NBA.com defensive play type export. | generic_sheet_name, blank_rows |
| Sheet70 | Reviewed after audit: generic sheet name, but layout is a valid NBA.com defensive play type export. | generic_sheet_name, blank_rows |
| Tracking - Catch & Shoot | Reviewed after audit: NBA.com tracking export with one time-formatted 3PM header. | non_text_header_values, blank_rows |
| Tracking - Pullup Shooting | Reviewed after audit: NBA.com tracking export with one time-formatted 3PM header. | non_text_header_values, blank_rows |
| Shooting Dashboard - Overall | Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header. | non_text_header_values, blank_rows, merged_header_cells |
| Shooting Dashboard - Catch & Sh | Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header. | non_text_header_values, blank_rows, merged_header_cells |
| Shooting Dashboard - Pullups | Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header. | non_text_header_values, blank_rows, merged_header_cells |
| Shooting - 5ft Range | Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Shooting - 8ft Range | Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Shooting - By Zone | Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Opponent Shooting - 5ft Range | Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Opponent Shooting - 8ft Range | Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Opponent Shooting - By Zone | Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names. | multi_row_grouped_header, duplicate_column_names, blank_rows, merged_header_cells |
| Bios | Reviewed after audit: NBA.com bio export with height cells sometimes formatted as Excel dates. | height_serial_or_date_values, blank_rows |

## Issue Type Summary

| Issue type | Count |
| --- | --- |
| blank_stat_values | 52 |
| duplicate_original_column_name | 90 |
| missing_team_column | 1 |
| missing_team_values | 1 |
| non_numeric_stat_values | 11 |
| normalized_numeric_values | 2 |
| player_name_reformatted | 3 |
| reviewed_sheet_imported | 18 |
| time_formatted_header_normalized | 8 |

| Severity | Count |
| --- | --- |
| info | 83 |
| warning | 103 |

## duplicate_original_column_name

Count: `90`. These occur in grouped shooting sheets where each zone/range repeats headers like `FGM`, `FGA`, and `FG%`. The importer prefixes the zone/range, and duplicate cleaned column groups within a sheet are `0`.

Example: `Shooting - 5ft Range` original column `FGM`
| Excel col | Original | Cleaned | Notes |
| --- | --- | --- | --- |
| D | FGM | less_than_5ft_fgm | grouped_header_prefix:Less than 5ft. |
| G | FGM | stat_5_9_ft_fgm | grouped_header_prefix:5-9 ft. |
| J | FGM | stat_10_14_ft_fgm | grouped_header_prefix:10-14 ft. |
| M | FGM | stat_15_19_ft_fgm | grouped_header_prefix:15-19 ft. |
| P | FGM | stat_20_24_ft_fgm | grouped_header_prefix:20-24 ft. |
| S | FGM | stat_25_29_ft_fgm | grouped_header_prefix:25-29 ft. |

Example: `Shooting - By Zone` original column `FG%`
| Excel col | Original | Cleaned | Notes |
| --- | --- | --- | --- |
| F | FG% | restricted_area_fg_pct | grouped_header_prefix:Restricted Area |
| I | FG% | in_the_paint_non_ra_fg_pct | grouped_header_prefix:In The Paint (Non-RA) |
| L | FG% | mid_range_fg_pct | grouped_header_prefix:Mid-Range |
| O | FG% | left_corner_3_fg_pct | grouped_header_prefix:Left Corner 3. |
| R | FG% | right_corner_3_fg_pct | grouped_header_prefix:Right Corner 3. |
| U | FG% | corner_3_fg_pct | grouped_header_prefix:Corner 3 |
| X | FG% | above_the_break_3_fg_pct | grouped_header_prefix:Above the Break 3. |

Example: `Opponent Shooting - By Zone` original column `FGA`
| Excel col | Original | Cleaned | Notes |
| --- | --- | --- | --- |
| E | FGA | restricted_area_fga | grouped_header_prefix:Restricted Area |
| H | FGA | in_the_paint_non_ra_fga | grouped_header_prefix:In The Paint (Non-RA) |
| K | FGA | mid_range_fga | grouped_header_prefix:Mid-Range |
| N | FGA | left_corner_3_fga | grouped_header_prefix:Left Corner 3. |
| Q | FGA | right_corner_3_fga | grouped_header_prefix:Right Corner 3. |
| T | FGA | corner_3_fga | grouped_header_prefix:Corner 3 |
| W | FGA | above_the_break_3_fga | grouped_header_prefix:Above the Break 3. |

## blank_stat_values

Blank values are preserved as raw/null values with `numeric_value = null`; they are not guessed. Most examples are blank rank/helper columns in NBA.com exports.
| Sheet | Cleaned column | Original column | Blank count |
| --- | --- | --- | --- |
| General - Advanced | rank |  | 582 |
| General - Misc | rank |  | 582 |
| General - Scoring | rank |  | 582 |
| General - Usage | rank |  | 582 |
| General - Opponent - Per Game | rank |  | 661 |
| General - Opponent - Per Posses | rank |  | 661 |
| General - Opponent - Per Minute | rank |  | 661 |
| General - Defense | rank |  | 582 |
| General - Violations | rank |  | 582 |
| General - Estimated Advanced | rank |  | 582 |
| Clutch - Traditional | rank |  | 492 |
| Clutch - Advanced | rank |  | 492 |
| Clutch - Misc | rank |  | 492 |
| Clutch - Scoring | rank |  | 492 |
| Clutch - Usage | rank |  | 492 |

## non_numeric_stat_values

Non-numeric values are preserved raw with `numeric_value = null`. Current examples are expected text fields: defensive position labels, college/country strings, and `Undrafted` draft labels. Bios height values are no longer in this warning group because they are deterministically normalized to inches while preserving raw values.
| Sheet | Column | Original | Count | Example raw values |
| --- | --- | --- | --- | --- |
| Defense Dashboard - Overall | position | POSITION | 581 | G, F, G-F, C-F, C, F-C, F-G |
| Defense Dashboard - 3pt | position | POSITION | 576 | G, F, G-F, C-F, C, F-C, F-G |
| Defense Dashboard - 2pt | position | POSITION | 579 | G, F, G-F, C-F, C, F-C, F-G |
| Defense Dashboard - <6ft | position | POSITION | 578 | G, F, G-F, C-F, C, F-C, F-G |
| Defense Dashboard - <10ft | position | POSITION | 579 | G, F, G-F, C-F, C, F-C, F-G |
| Defense Dashboard - >15ft | position | POSITION | 579 | G, F, G-F, C-F, C, F-C, F-G |
| Bios | college | COLLEGE | 582 | South Carolina, Northern Iowa, None, Arizona, UCLA, Vanderbilt, Maryland, Rutgers |
| Bios | country | COUNTRY | 582 | Canada, USA, France, Nigeria, Belgium, Dominican Republic, Greece, Turkey |
| Bios | draft_year | DRAFT YEAR | 150 | Undrafted |
| Bios | draft_round | DRAFT ROUND | 150 | Undrafted |
| Bios | draft_number | DRAFT NUMBER | 150 | Undrafted |

## normalized_numeric_values

These values retain the raw Excel value and add a deterministic `numeric_value`.
| Sheet | Column | Original | Normalization | Count |
| --- | --- | --- | --- | --- |
| Bios | height | Height | height_excel_date_converted_to_inches | 545 |
| Bios | height | Height | height_text_converted_to_inches | 37 |

## missing_team_column

| Sheet | Header row | Meaning |
| --- | --- | --- |
| General - Estimated Advanced | 15 | The sheet has player rows but no team column. Team was left blank; no team was guessed. |

## missing_team_values

| Sheet | Count | Meaning |
| --- | --- | --- |
| General - Estimated Advanced | 582 | Rows imported with blank team because source sheet has no team field. |

Exact affected rows from `General - Estimated Advanced`:
| Sheet | Excel row | Player | Raw player value |
| --- | --- | --- | --- |
| General - Estimated Advanced | 16 | A.J. Lawson | A.J. Lawson |
| General - Estimated Advanced | 17 | AJ Green | AJ Green |
| General - Estimated Advanced | 18 | AJ Johnson | AJ Johnson |
| General - Estimated Advanced | 19 | Aaron Gordon | Aaron Gordon |
| General - Estimated Advanced | 20 | Aaron Holiday | Aaron Holiday |
| General - Estimated Advanced | 21 | Aaron Nesmith | Aaron Nesmith |
| General - Estimated Advanced | 22 | Aaron Wiggins | Aaron Wiggins |
| General - Estimated Advanced | 23 | Ace Bailey | Ace Bailey |
| General - Estimated Advanced | 24 | Adama Bal | Adama Bal |
| General - Estimated Advanced | 25 | Adem Bona | Adem Bona |
| General - Estimated Advanced | 26 | Adou Thiero | Adou Thiero |
| General - Estimated Advanced | 27 | Ajay Mitchell | Ajay Mitchell |
| General - Estimated Advanced | 28 | Al Horford | Al Horford |
| General - Estimated Advanced | 29 | Alex Antetokounmpo | Alex Antetokounmpo |
| General - Estimated Advanced | 30 | Alex Caruso | Alex Caruso |
| General - Estimated Advanced | 31 | Alex Morales | Alex Morales |
| General - Estimated Advanced | 32 | Alex Sarr | Alex Sarr |
| General - Estimated Advanced | 33 | Alijah Martin | Alijah Martin |
| General - Estimated Advanced | 34 | Alondes Williams | Alondes Williams |
| General - Estimated Advanced | 35 | Alperen Sengun | Alperen Sengun |
| General - Estimated Advanced | 36 | Amari Williams | Amari Williams |
| General - Estimated Advanced | 37 | Amen Thompson | Amen Thompson |
| General - Estimated Advanced | 38 | Amir Coffey | Amir Coffey |
| General - Estimated Advanced | 39 | Andersson Garcia | Andersson Garcia |
| General - Estimated Advanced | 40 | Andre Drummond | Andre Drummond |
| General - Estimated Advanced | 41 | Andre Jackson Jr. | Andre Jackson Jr. |
| General - Estimated Advanced | 42 | Andrew Nembhard | Andrew Nembhard |
| General - Estimated Advanced | 43 | Andrew Wiggins | Andrew Wiggins |
| General - Estimated Advanced | 44 | Anfernee Simons | Anfernee Simons |
| General - Estimated Advanced | 45 | Anthony Black | Anthony Black |
| General - Estimated Advanced | 46 | Anthony Davis | Anthony Davis |
| General - Estimated Advanced | 47 | Anthony Edwards | Anthony Edwards |
| General - Estimated Advanced | 48 | Anthony Gill | Anthony Gill |
| General - Estimated Advanced | 49 | Antonio Reeves | Antonio Reeves |
| General - Estimated Advanced | 50 | Ariel Hukporti | Ariel Hukporti |
| General - Estimated Advanced | 51 | Asa Newell | Asa Newell |
| General - Estimated Advanced | 52 | Ausar Thompson | Ausar Thompson |
| General - Estimated Advanced | 53 | Austin Reaves | Austin Reaves |
| General - Estimated Advanced | 54 | Ayo Dosunmu | Ayo Dosunmu |
| General - Estimated Advanced | 55 | Bam Adebayo | Bam Adebayo |
| General - Estimated Advanced | 56 | Baylor Scheierman | Baylor Scheierman |
| General - Estimated Advanced | 57 | Ben Saraf | Ben Saraf |
| General - Estimated Advanced | 58 | Ben Sheppard | Ben Sheppard |
| General - Estimated Advanced | 59 | Bennedict Mathurin | Bennedict Mathurin |
| General - Estimated Advanced | 60 | Bez Mbeng | Bez Mbeng |
| General - Estimated Advanced | 61 | Bilal Coulibaly | Bilal Coulibaly |
| General - Estimated Advanced | 62 | Bismack Biyombo | Bismack Biyombo |
| General - Estimated Advanced | 63 | Blake Hinson | Blake Hinson |
| General - Estimated Advanced | 64 | Blake Wesley | Blake Wesley |
| General - Estimated Advanced | 65 | Bobby Portis | Bobby Portis |
| General - Estimated Advanced | 66 | Bobi Klintman | Bobi Klintman |
| General - Estimated Advanced | 67 | Bogdan Bogdanović | Bogdan Bogdanović |
| General - Estimated Advanced | 68 | Bones Hyland | Bones Hyland |
| General - Estimated Advanced | 69 | Bradley Beal | Bradley Beal |
| General - Estimated Advanced | 70 | Branden Carlson | Branden Carlson |
| General - Estimated Advanced | 71 | Brandin Podziemski | Brandin Podziemski |
| General - Estimated Advanced | 72 | Brandon Clarke | Brandon Clarke |
| General - Estimated Advanced | 73 | Brandon Ingram | Brandon Ingram |
| General - Estimated Advanced | 74 | Brandon Miller | Brandon Miller |
| General - Estimated Advanced | 75 | Brandon Williams | Brandon Williams |
| General - Estimated Advanced | 76 | Brice Sensabaugh | Brice Sensabaugh |
| General - Estimated Advanced | 77 | Bronny James | Bronny James |
| General - Estimated Advanced | 78 | Brook Lopez | Brook Lopez |
| General - Estimated Advanced | 79 | Brooks Barnhizer | Brooks Barnhizer |
| General - Estimated Advanced | 80 | Bruce Brown | Bruce Brown |
| General - Estimated Advanced | 81 | Bryce McGowens | Bryce McGowens |
| General - Estimated Advanced | 82 | Bub Carrington | Bub Carrington |
| General - Estimated Advanced | 83 | Buddy Boeheim | Buddy Boeheim |
| General - Estimated Advanced | 84 | Buddy Hield | Buddy Hield |
| General - Estimated Advanced | 85 | CJ Huntley | CJ Huntley |
| General - Estimated Advanced | 86 | CJ McCollum | CJ McCollum |
| General - Estimated Advanced | 87 | Cade Cunningham | Cade Cunningham |
| General - Estimated Advanced | 88 | Caleb Houstan | Caleb Houstan |
| General - Estimated Advanced | 89 | Caleb Love | Caleb Love |
| General - Estimated Advanced | 90 | Caleb Martin | Caleb Martin |
| General - Estimated Advanced | 91 | Cam Christie | Cam Christie |
| General - Estimated Advanced | 92 | Cam Spencer | Cam Spencer |
| General - Estimated Advanced | 93 | Cam Thomas | Cam Thomas |
| General - Estimated Advanced | 94 | Cam Whitmore | Cam Whitmore |
| General - Estimated Advanced | 95 | Cameron Johnson | Cameron Johnson |
| General - Estimated Advanced | 96 | Cameron Payne | Cameron Payne |
| General - Estimated Advanced | 97 | Caris LeVert | Caris LeVert |
| General - Estimated Advanced | 98 | Carter Bryant | Carter Bryant |
| General - Estimated Advanced | 99 | Cason Wallace | Cason Wallace |
| General - Estimated Advanced | 100 | Cedric Coward | Cedric Coward |
| General - Estimated Advanced | 101 | Chaney Johnson | Chaney Johnson |
| General - Estimated Advanced | 102 | Charles Bassey | Charles Bassey |
| General - Estimated Advanced | 103 | Chaz Lanier | Chaz Lanier |
| General - Estimated Advanced | 104 | Chet Holmgren | Chet Holmgren |
| General - Estimated Advanced | 105 | Chris Boucher | Chris Boucher |
| General - Estimated Advanced | 106 | Chris Livingston | Chris Livingston |
| General - Estimated Advanced | 107 | Chris Mañon | Chris Mañon |
| General - Estimated Advanced | 108 | Chris Paul | Chris Paul |
| General - Estimated Advanced | 109 | Chris Youngblood | Chris Youngblood |
| General - Estimated Advanced | 110 | Christian Braun | Christian Braun |
| General - Estimated Advanced | 111 | Christian Koloko | Christian Koloko |
| General - Estimated Advanced | 112 | Chucky Hepburn | Chucky Hepburn |
| General - Estimated Advanced | 113 | Clint Capela | Clint Capela |
| General - Estimated Advanced | 114 | Coby White | Coby White |
| General - Estimated Advanced | 115 | Cody Martin | Cody Martin |
| General - Estimated Advanced | 116 | Cody Williams | Cody Williams |
| General - Estimated Advanced | 117 | Colby Jones | Colby Jones |
| General - Estimated Advanced | 118 | Cole Anthony | Cole Anthony |
| General - Estimated Advanced | 119 | Colin Castleton | Colin Castleton |
| General - Estimated Advanced | 120 | Collin Gillespie | Collin Gillespie |
| General - Estimated Advanced | 121 | Collin Murray-Boyles | Collin Murray-Boyles |
| General - Estimated Advanced | 122 | Collin Sexton | Collin Sexton |
| General - Estimated Advanced | 123 | Cooper Flagg | Cooper Flagg |
| General - Estimated Advanced | 124 | Corey Kispert | Corey Kispert |
| General - Estimated Advanced | 125 | Cormac Ryan | Cormac Ryan |
| General - Estimated Advanced | 126 | Craig Porter Jr. | Craig Porter Jr. |
| General - Estimated Advanced | 127 | Curtis Jones | Curtis Jones |
| General - Estimated Advanced | 128 | D'Angelo Russell | D'Angelo Russell |
| General - Estimated Advanced | 129 | DaQuan Jeffries | DaQuan Jeffries |
| General - Estimated Advanced | 130 | DaRon Holmes II | DaRon Holmes II |
| General - Estimated Advanced | 131 | Daeqwon Plowden | Daeqwon Plowden |
| General - Estimated Advanced | 132 | Dalano Banton | Dalano Banton |
| General - Estimated Advanced | 133 | Dalen Terry | Dalen Terry |
| General - Estimated Advanced | 134 | Dalton Knecht | Dalton Knecht |
| General - Estimated Advanced | 135 | Daniel Gafford | Daniel Gafford |
| General - Estimated Advanced | 136 | Daniss Jenkins | Daniss Jenkins |
| General - Estimated Advanced | 137 | Danny Wolf | Danny Wolf |
| General - Estimated Advanced | 138 | Dario Saric | Dario Saric |
| General - Estimated Advanced | 139 | Dariq Whitehead | Dariq Whitehead |
| General - Estimated Advanced | 140 | Darius Brown | Darius Brown |
| General - Estimated Advanced | 141 | Darius Garland | Darius Garland |
| General - Estimated Advanced | 142 | David Jones Garcia | David Jones Garcia |
| General - Estimated Advanced | 143 | David Roddy | David Roddy |
| General - Estimated Advanced | 144 | Davion Mitchell | Davion Mitchell |
| General - Estimated Advanced | 145 | Day'Ron Sharpe | Day'Ron Sharpe |
| General - Estimated Advanced | 146 | De'Aaron Fox | De'Aaron Fox |
| General - Estimated Advanced | 147 | De'Andre Hunter | De'Andre Hunter |
| General - Estimated Advanced | 148 | De'Anthony Melton | De'Anthony Melton |
| General - Estimated Advanced | 149 | DeAndre Jordan | DeAndre Jordan |
| General - Estimated Advanced | 150 | DeJon Jarreau | DeJon Jarreau |
| General - Estimated Advanced | 151 | DeMar DeRozan | DeMar DeRozan |
| General - Estimated Advanced | 152 | Dean Wade | Dean Wade |
| General - Estimated Advanced | 153 | Deandre Ayton | Deandre Ayton |
| General - Estimated Advanced | 154 | Dejounte Murray | Dejounte Murray |
| General - Estimated Advanced | 155 | Deni Avdija | Deni Avdija |
| General - Estimated Advanced | 156 | Dennis Schröder | Dennis Schröder |
| General - Estimated Advanced | 157 | Dereck Lively II | Dereck Lively II |
| General - Estimated Advanced | 158 | Derik Queen | Derik Queen |
| General - Estimated Advanced | 159 | Derrick Jones Jr. | Derrick Jones Jr. |
| General - Estimated Advanced | 160 | Derrick White | Derrick White |
| General - Estimated Advanced | 161 | Desmond Bane | Desmond Bane |
| General - Estimated Advanced | 162 | Devin Booker | Devin Booker |
| General - Estimated Advanced | 163 | Devin Carter | Devin Carter |
| General - Estimated Advanced | 164 | Devin Vassell | Devin Vassell |
| General - Estimated Advanced | 165 | Dillon Brooks | Dillon Brooks |
| General - Estimated Advanced | 166 | Dillon Jones | Dillon Jones |
| General - Estimated Advanced | 167 | Domantas Sabonis | Domantas Sabonis |
| General - Estimated Advanced | 168 | Dominick Barlow | Dominick Barlow |
| General - Estimated Advanced | 169 | Donovan Clingan | Donovan Clingan |
| General - Estimated Advanced | 170 | Donovan Mitchell | Donovan Mitchell |
| General - Estimated Advanced | 171 | Donte DiVincenzo | Donte DiVincenzo |
| General - Estimated Advanced | 172 | Dorian Finney-Smith | Dorian Finney-Smith |
| General - Estimated Advanced | 173 | Doug McDermott | Doug McDermott |
| General - Estimated Advanced | 174 | Drake Powell | Drake Powell |
| General - Estimated Advanced | 175 | Draymond Green | Draymond Green |
| General - Estimated Advanced | 176 | Drew Eubanks | Drew Eubanks |
| General - Estimated Advanced | 177 | Drew Peterson | Drew Peterson |
| General - Estimated Advanced | 178 | Drew Timme | Drew Timme |
| General - Estimated Advanced | 179 | Dru Smith | Dru Smith |
| General - Estimated Advanced | 180 | Duncan Robinson | Duncan Robinson |
| General - Estimated Advanced | 181 | Duop Reath | Duop Reath |
| General - Estimated Advanced | 182 | Dwight Powell | Dwight Powell |
| General - Estimated Advanced | 183 | Dylan Cardwell | Dylan Cardwell |
| General - Estimated Advanced | 184 | Dylan Harper | Dylan Harper |
| General - Estimated Advanced | 185 | Dyson Daniels | Dyson Daniels |
| General - Estimated Advanced | 186 | E.J. Liddell | E.J. Liddell |
| General - Estimated Advanced | 187 | Egor Dëmin | Egor Dëmin |
| General - Estimated Advanced | 188 | Elijah Harkless | Elijah Harkless |
| General - Estimated Advanced | 189 | Emanuel Miller | Emanuel Miller |
| General - Estimated Advanced | 190 | Enrique Freeman | Enrique Freeman |
| General - Estimated Advanced | 191 | Eric Gordon | Eric Gordon |
| General - Estimated Advanced | 192 | Ethan Thompson | Ethan Thompson |
| General - Estimated Advanced | 193 | Evan Mobley | Evan Mobley |
| General - Estimated Advanced | 194 | Franz Wagner | Franz Wagner |
| General - Estimated Advanced | 195 | GG Jackson | GG Jackson |
| General - Estimated Advanced | 196 | Gabe Vincent | Gabe Vincent |
| General - Estimated Advanced | 197 | Garrett Temple | Garrett Temple |
| General - Estimated Advanced | 198 | Garrison Mathews | Garrison Mathews |
| General - Estimated Advanced | 199 | Gary Harris | Gary Harris |
| General - Estimated Advanced | 200 | Gary Payton II | Gary Payton II |
| General - Estimated Advanced | 201 | Gary Trent Jr. | Gary Trent Jr. |
| General - Estimated Advanced | 202 | Giannis Antetokounmpo | Giannis Antetokounmpo |
| General - Estimated Advanced | 203 | Goga Bitadze | Goga Bitadze |
| General - Estimated Advanced | 204 | Gradey Dick | Gradey Dick |
| General - Estimated Advanced | 205 | Grant Nelson | Grant Nelson |
| General - Estimated Advanced | 206 | Grant Williams | Grant Williams |
| General - Estimated Advanced | 207 | Grayson Allen | Grayson Allen |
| General - Estimated Advanced | 208 | Guerschon Yabusele | Guerschon Yabusele |
| General - Estimated Advanced | 209 | Gui Santos | Gui Santos |
| General - Estimated Advanced | 210 | Harrison Barnes | Harrison Barnes |
| General - Estimated Advanced | 211 | Harrison Ingram | Harrison Ingram |
| General - Estimated Advanced | 212 | Hayden Gray | Hayden Gray |
| General - Estimated Advanced | 213 | Haywood Highsmith | Haywood Highsmith |
| General - Estimated Advanced | 214 | Herbert Jones | Herbert Jones |
| General - Estimated Advanced | 215 | Hugo González | Hugo González |
| General - Estimated Advanced | 216 | Hunter Dickinson | Hunter Dickinson |
| General - Estimated Advanced | 217 | Hunter Sallis | Hunter Sallis |
| General - Estimated Advanced | 218 | Hunter Tyson | Hunter Tyson |
| General - Estimated Advanced | 219 | Immanuel Quickley | Immanuel Quickley |
| General - Estimated Advanced | 220 | Isaac Jones | Isaac Jones |
| General - Estimated Advanced | 221 | Isaac Okoro | Isaac Okoro |
| General - Estimated Advanced | 222 | Isaiah Collier | Isaiah Collier |
| General - Estimated Advanced | 223 | Isaiah Crawford | Isaiah Crawford |
| General - Estimated Advanced | 224 | Isaiah Hartenstein | Isaiah Hartenstein |
| General - Estimated Advanced | 225 | Isaiah Jackson | Isaiah Jackson |
| General - Estimated Advanced | 226 | Isaiah Joe | Isaiah Joe |
| General - Estimated Advanced | 227 | Isaiah Livers | Isaiah Livers |
| General - Estimated Advanced | 228 | Isaiah Stevens | Isaiah Stevens |
| General - Estimated Advanced | 229 | Isaiah Stewart | Isaiah Stewart |
| General - Estimated Advanced | 230 | Ivica Zubac | Ivica Zubac |
| General - Estimated Advanced | 231 | JD Davison | JD Davison |
| General - Estimated Advanced | 232 | Ja Morant | Ja Morant |
| General - Estimated Advanced | 233 | Ja'Kobe Walter | Ja'Kobe Walter |
| General - Estimated Advanced | 234 | Jabari Smith Jr. | Jabari Smith Jr. |
| General - Estimated Advanced | 235 | Jabari Walker | Jabari Walker |
| General - Estimated Advanced | 236 | Jacob Toppin | Jacob Toppin |
| General - Estimated Advanced | 237 | Jaden Hardy | Jaden Hardy |
| General - Estimated Advanced | 238 | Jaden Ivey | Jaden Ivey |
| General - Estimated Advanced | 239 | Jaden McDaniels | Jaden McDaniels |
| General - Estimated Advanced | 240 | Jae'Sean Tate | Jae'Sean Tate |
| General - Estimated Advanced | 241 | Jahmai Mashack | Jahmai Mashack |
| General - Estimated Advanced | 242 | Jahmir Young | Jahmir Young |
| General - Estimated Advanced | 243 | Jahmyl Telfort | Jahmyl Telfort |
| General - Estimated Advanced | 244 | Jaime Jaquez Jr. | Jaime Jaquez Jr. |
| General - Estimated Advanced | 245 | Jake LaRavia | Jake LaRavia |
| General - Estimated Advanced | 246 | Jakob Poeltl | Jakob Poeltl |
| General - Estimated Advanced | 247 | Jalen Brunson | Jalen Brunson |
| General - Estimated Advanced | 248 | Jalen Duren | Jalen Duren |
| General - Estimated Advanced | 249 | Jalen Green | Jalen Green |
| General - Estimated Advanced | 250 | Jalen Johnson | Jalen Johnson |
| General - Estimated Advanced | 251 | Jalen Pickett | Jalen Pickett |
| General - Estimated Advanced | 252 | Jalen Slawson | Jalen Slawson |
| General - Estimated Advanced | 253 | Jalen Smith | Jalen Smith |
| General - Estimated Advanced | 254 | Jalen Suggs | Jalen Suggs |
| General - Estimated Advanced | 255 | Jalen Williams | Jalen Williams |
| General - Estimated Advanced | 256 | Jalen Wilson | Jalen Wilson |
| General - Estimated Advanced | 257 | Jamal Cain | Jamal Cain |
| General - Estimated Advanced | 258 | Jamal Murray | Jamal Murray |
| General - Estimated Advanced | 259 | Jamal Shead | Jamal Shead |
| General - Estimated Advanced | 260 | Jamaree Bouyea | Jamaree Bouyea |
| General - Estimated Advanced | 261 | James Harden | James Harden |
| General - Estimated Advanced | 262 | James Wiseman | James Wiseman |
| General - Estimated Advanced | 263 | Jamir Watkins | Jamir Watkins |
| General - Estimated Advanced | 264 | Jamison Battle | Jamison Battle |
| General - Estimated Advanced | 265 | Jarace Walker | Jarace Walker |
| General - Estimated Advanced | 266 | Jared McCain | Jared McCain |
| General - Estimated Advanced | 267 | Jaren Jackson Jr. | Jaren Jackson Jr. |
| General - Estimated Advanced | 268 | Jarred Vanderbilt | Jarred Vanderbilt |
| General - Estimated Advanced | 269 | Jarrett Allen | Jarrett Allen |
| General - Estimated Advanced | 270 | Jase Richardson | Jase Richardson |
| General - Estimated Advanced | 271 | Javon Small | Javon Small |
| General - Estimated Advanced | 272 | Javonte Cooke | Javonte Cooke |
| General - Estimated Advanced | 273 | Javonte Green | Javonte Green |
| General - Estimated Advanced | 274 | Jaxson Hayes | Jaxson Hayes |
| General - Estimated Advanced | 275 | Jay Huff | Jay Huff |
| General - Estimated Advanced | 276 | Jaylen Brown | Jaylen Brown |
| General - Estimated Advanced | 277 | Jaylen Clark | Jaylen Clark |
| General - Estimated Advanced | 278 | Jaylen Wells | Jaylen Wells |
| General - Estimated Advanced | 279 | Jaylin Williams | Jaylin Williams |
| General - Estimated Advanced | 280 | Jaylon Tyson | Jaylon Tyson |
| General - Estimated Advanced | 281 | Jayson Kent | Jayson Kent |
| General - Estimated Advanced | 282 | Jayson Tatum | Jayson Tatum |
| General - Estimated Advanced | 283 | Jeff Green | Jeff Green |
| General - Estimated Advanced | 284 | Jerami Grant | Jerami Grant |
| General - Estimated Advanced | 285 | Jeremiah Fears | Jeremiah Fears |
| General - Estimated Advanced | 286 | Jeremiah Robinson-Earl | Jeremiah Robinson-Earl |
| General - Estimated Advanced | 287 | Jeremy Sochan | Jeremy Sochan |
| General - Estimated Advanced | 288 | Jericho Sims | Jericho Sims |
| General - Estimated Advanced | 289 | Jett Howard | Jett Howard |
| General - Estimated Advanced | 290 | Jevon Carter | Jevon Carter |
| General - Estimated Advanced | 291 | Jimmy Butler III | Jimmy Butler III |
| General - Estimated Advanced | 292 | Joan Beringer | Joan Beringer |
| General - Estimated Advanced | 293 | Jock Landale | Jock Landale |
| General - Estimated Advanced | 294 | Joe Ingles | Joe Ingles |
| General - Estimated Advanced | 295 | Joel Embiid | Joel Embiid |
| General - Estimated Advanced | 296 | John Collins | John Collins |
| General - Estimated Advanced | 297 | John Konchar | John Konchar |
| General - Estimated Advanced | 298 | John Poulakidas | John Poulakidas |
| General - Estimated Advanced | 299 | John Tonje | John Tonje |
| General - Estimated Advanced | 300 | Johni Broome | Johni Broome |
| General - Estimated Advanced | 301 | Johnny Furphy | Johnny Furphy |
| General - Estimated Advanced | 302 | Johnny Juzang | Johnny Juzang |
| General - Estimated Advanced | 303 | Jonas Valančiūnas | Jonas Valančiūnas |
| General - Estimated Advanced | 304 | Jonathan Isaac | Jonathan Isaac |
| General - Estimated Advanced | 305 | Jonathan Kuminga | Jonathan Kuminga |
| General - Estimated Advanced | 306 | Jonathan Mogbo | Jonathan Mogbo |
| General - Estimated Advanced | 307 | Jordan Clarkson | Jordan Clarkson |
| General - Estimated Advanced | 308 | Jordan Goodwin | Jordan Goodwin |
| General - Estimated Advanced | 309 | Jordan Hawkins | Jordan Hawkins |
| General - Estimated Advanced | 310 | Jordan McLaughlin | Jordan McLaughlin |
| General - Estimated Advanced | 311 | Jordan Miller | Jordan Miller |
| General - Estimated Advanced | 312 | Jordan Poole | Jordan Poole |
| General - Estimated Advanced | 313 | Jordan Walsh | Jordan Walsh |
| General - Estimated Advanced | 314 | Jose Alvarado | Jose Alvarado |
| General - Estimated Advanced | 315 | Josh Giddey | Josh Giddey |
| General - Estimated Advanced | 316 | Josh Green | Josh Green |
| General - Estimated Advanced | 317 | Josh Hart | Josh Hart |
| General - Estimated Advanced | 318 | Josh Minott | Josh Minott |
| General - Estimated Advanced | 319 | Josh Oduro | Josh Oduro |
| General - Estimated Advanced | 320 | Josh Okogie | Josh Okogie |
| General - Estimated Advanced | 321 | Jrue Holiday | Jrue Holiday |
| General - Estimated Advanced | 322 | Julian Champagnie | Julian Champagnie |
| General - Estimated Advanced | 323 | Julian Phillips | Julian Phillips |
| General - Estimated Advanced | 324 | Julian Reese | Julian Reese |
| General - Estimated Advanced | 325 | Julian Strawther | Julian Strawther |
| General - Estimated Advanced | 326 | Julius Randle | Julius Randle |
| General - Estimated Advanced | 327 | Justin Champagnie | Justin Champagnie |
| General - Estimated Advanced | 328 | Justin Edwards | Justin Edwards |
| General - Estimated Advanced | 329 | Jusuf Nurkić | Jusuf Nurkić |
| General - Estimated Advanced | 330 | KJ Simpson | KJ Simpson |
| General - Estimated Advanced | 331 | Kadary Richmond | Kadary Richmond |
| General - Estimated Advanced | 332 | Kam Jones | Kam Jones |
| General - Estimated Advanced | 333 | Karl-Anthony Towns | Karl-Anthony Towns |
| General - Estimated Advanced | 334 | Karlo Matković | Karlo Matković |
| General - Estimated Advanced | 335 | Kasparas Jakučionis | Kasparas Jakučionis |
| General - Estimated Advanced | 336 | Kawhi Leonard | Kawhi Leonard |
| General - Estimated Advanced | 337 | Keaton Wallace | Keaton Wallace |
| General - Estimated Advanced | 338 | Keegan Murray | Keegan Murray |
| General - Estimated Advanced | 339 | Kel'el Ware | Kel'el Ware |
| General - Estimated Advanced | 340 | Keldon Johnson | Keldon Johnson |
| General - Estimated Advanced | 341 | Kelly Olynyk | Kelly Olynyk |
| General - Estimated Advanced | 342 | Kelly Oubre Jr. | Kelly Oubre Jr. |
| General - Estimated Advanced | 343 | Kennedy Chandler | Kennedy Chandler |
| General - Estimated Advanced | 344 | Kenrich Williams | Kenrich Williams |
| General - Estimated Advanced | 345 | Kentavious Caldwell-Pope | Kentavious Caldwell-Pope |
| General - Estimated Advanced | 346 | Keon Ellis | Keon Ellis |
| General - Estimated Advanced | 347 | Keshad Johnson | Keshad Johnson |
| General - Estimated Advanced | 348 | Keshon Gilbert | Keshon Gilbert |
| General - Estimated Advanced | 349 | Kevin Durant | Kevin Durant |
| General - Estimated Advanced | 350 | Kevin Huerter | Kevin Huerter |
| General - Estimated Advanced | 351 | Kevin Love | Kevin Love |
| General - Estimated Advanced | 352 | Kevin McCullar Jr. | Kevin McCullar Jr. |
| General - Estimated Advanced | 353 | Kevin Porter Jr. | Kevin Porter Jr. |
| General - Estimated Advanced | 354 | Kevon Looney | Kevon Looney |
| General - Estimated Advanced | 355 | Keyonte George | Keyonte George |
| General - Estimated Advanced | 356 | Khaman Maluach | Khaman Maluach |
| General - Estimated Advanced | 357 | Khris Middleton | Khris Middleton |
| General - Estimated Advanced | 358 | Killian Hayes | Killian Hayes |
| General - Estimated Advanced | 359 | Klay Thompson | Klay Thompson |
| General - Estimated Advanced | 360 | Kobe Brown | Kobe Brown |
| General - Estimated Advanced | 361 | Kobe Bufkin | Kobe Bufkin |
| General - Estimated Advanced | 362 | Kobe Sanders | Kobe Sanders |
| General - Estimated Advanced | 363 | Koby Brea | Koby Brea |
| General - Estimated Advanced | 364 | Kon Knueppel | Kon Knueppel |
| General - Estimated Advanced | 365 | Kris Dunn | Kris Dunn |
| General - Estimated Advanced | 366 | Kris Murray | Kris Murray |
| General - Estimated Advanced | 367 | Kristaps Porziņģis | Kristaps Porziņģis |
| General - Estimated Advanced | 368 | Kyle Anderson | Kyle Anderson |
| General - Estimated Advanced | 369 | Kyle Filipowski | Kyle Filipowski |
| General - Estimated Advanced | 370 | Kyle Kuzma | Kyle Kuzma |
| General - Estimated Advanced | 371 | Kyle Lowry | Kyle Lowry |
| General - Estimated Advanced | 372 | Kyshawn George | Kyshawn George |
| General - Estimated Advanced | 373 | LJ Cryer | LJ Cryer |
| General - Estimated Advanced | 374 | LaMelo Ball | LaMelo Ball |
| General - Estimated Advanced | 375 | Lachlan Olbrich | Lachlan Olbrich |
| General - Estimated Advanced | 376 | Landry Shamet | Landry Shamet |
| General - Estimated Advanced | 377 | Larry Nance Jr. | Larry Nance Jr. |
| General - Estimated Advanced | 378 | Lauri Markkanen | Lauri Markkanen |
| General - Estimated Advanced | 379 | Lawson Lovering | Lawson Lovering |
| General - Estimated Advanced | 380 | LeBron James | LeBron James |
| General - Estimated Advanced | 381 | Leaky Black | Leaky Black |
| General - Estimated Advanced | 382 | Leonard Miller | Leonard Miller |
| General - Estimated Advanced | 383 | Liam McNeeley | Liam McNeeley |
| General - Estimated Advanced | 384 | Lindy Waters III | Lindy Waters III |
| General - Estimated Advanced | 385 | Lonzo Ball | Lonzo Ball |
| General - Estimated Advanced | 386 | Lucas Williamson | Lucas Williamson |
| General - Estimated Advanced | 387 | Luguentz Dort | Luguentz Dort |
| General - Estimated Advanced | 388 | Luka Dončić | Luka Dončić |
| General - Estimated Advanced | 389 | Luka Garza | Luka Garza |
| General - Estimated Advanced | 390 | Luke Kennard | Luke Kennard |
| General - Estimated Advanced | 391 | Luke Kornet | Luke Kornet |
| General - Estimated Advanced | 392 | Luke Travers | Luke Travers |
| General - Estimated Advanced | 393 | Mac McClung | Mac McClung |
| General - Estimated Advanced | 394 | Malachi Smith | Malachi Smith |
| General - Estimated Advanced | 395 | Malaki Branham | Malaki Branham |
| General - Estimated Advanced | 396 | Malevy Leons | Malevy Leons |
| General - Estimated Advanced | 397 | Malik Monk | Malik Monk |
| General - Estimated Advanced | 398 | MarJon Beauchamp | MarJon Beauchamp |
| General - Estimated Advanced | 399 | Marcus Sasser | Marcus Sasser |
| General - Estimated Advanced | 400 | Marcus Smart | Marcus Smart |
| General - Estimated Advanced | 401 | Mark Sears | Mark Sears |
| General - Estimated Advanced | 402 | Mark Williams | Mark Williams |
| General - Estimated Advanced | 403 | Markelle Fultz | Markelle Fultz |
| General - Estimated Advanced | 404 | Marvin Bagley III | Marvin Bagley III |
| General - Estimated Advanced | 405 | Mason Plumlee | Mason Plumlee |
| General - Estimated Advanced | 406 | Matas Buzelis | Matas Buzelis |
| General - Estimated Advanced | 407 | Matisse Thybulle | Matisse Thybulle |
| General - Estimated Advanced | 408 | Max Christie | Max Christie |
| General - Estimated Advanced | 409 | Max Shulga | Max Shulga |
| General - Estimated Advanced | 410 | Max Strus | Max Strus |
| General - Estimated Advanced | 411 | Maxi Kleber | Maxi Kleber |
| General - Estimated Advanced | 412 | Maxime Raynaud | Maxime Raynaud |
| General - Estimated Advanced | 413 | Micah Peavy | Micah Peavy |
| General - Estimated Advanced | 414 | Micah Potter | Micah Potter |
| General - Estimated Advanced | 415 | Michael Porter Jr. | Michael Porter Jr. |
| General - Estimated Advanced | 416 | Mikal Bridges | Mikal Bridges |
| General - Estimated Advanced | 417 | Mike Conley | Mike Conley |
| General - Estimated Advanced | 418 | Miles Bridges | Miles Bridges |
| General - Estimated Advanced | 419 | Miles Kelly | Miles Kelly |
| General - Estimated Advanced | 420 | Miles McBride | Miles McBride |
| General - Estimated Advanced | 421 | Mitchell Robinson | Mitchell Robinson |
| General - Estimated Advanced | 422 | Mo Bamba | Mo Bamba |
| General - Estimated Advanced | 423 | Mohamed Diawara | Mohamed Diawara |
| General - Estimated Advanced | 424 | Monte Morris | Monte Morris |
| General - Estimated Advanced | 425 | Moritz Wagner | Moritz Wagner |
| General - Estimated Advanced | 426 | Moses Moody | Moses Moody |
| General - Estimated Advanced | 427 | Mouhamadou Gueye | Mouhamadou Gueye |
| General - Estimated Advanced | 428 | Mouhamed Gueye | Mouhamed Gueye |
| General - Estimated Advanced | 429 | Moussa Cisse | Moussa Cisse |
| General - Estimated Advanced | 430 | Moussa Diabaté | Moussa Diabaté |
| General - Estimated Advanced | 431 | Myles Turner | Myles Turner |
| General - Estimated Advanced | 432 | Myron Gardner | Myron Gardner |
| General - Estimated Advanced | 433 | N'Faly Dante | N'Faly Dante |
| General - Estimated Advanced | 434 | Nae'Qwan Tomlin | Nae'Qwan Tomlin |
| General - Estimated Advanced | 435 | Naji Marshall | Naji Marshall |
| General - Estimated Advanced | 436 | Nate Williams | Nate Williams |
| General - Estimated Advanced | 437 | Naz Reid | Naz Reid |
| General - Estimated Advanced | 438 | Neemias Queta | Neemias Queta |
| General - Estimated Advanced | 439 | Nic Claxton | Nic Claxton |
| General - Estimated Advanced | 440 | Nick Richards | Nick Richards |
| General - Estimated Advanced | 441 | Nick Smith Jr. | Nick Smith Jr. |
| General - Estimated Advanced | 442 | Nickeil Alexander-Walker | Nickeil Alexander-Walker |
| General - Estimated Advanced | 443 | Nicolas Batum | Nicolas Batum |
| General - Estimated Advanced | 444 | Nigel Hayes-Davis | Nigel Hayes-Davis |
| General - Estimated Advanced | 445 | Nikola Jokić | Nikola Jokić |
| General - Estimated Advanced | 446 | Nikola Jović | Nikola Jović |
| General - Estimated Advanced | 447 | Nikola Topić | Nikola Topić |
| General - Estimated Advanced | 448 | Nikola Vučević | Nikola Vučević |
| General - Estimated Advanced | 449 | Nique Clifford | Nique Clifford |
| General - Estimated Advanced | 450 | Noa Essengue | Noa Essengue |
| General - Estimated Advanced | 451 | Noah Clowney | Noah Clowney |
| General - Estimated Advanced | 452 | Noah Penda | Noah Penda |
| General - Estimated Advanced | 453 | Nolan Traore | Nolan Traore |
| General - Estimated Advanced | 454 | Norchad Omier | Norchad Omier |
| General - Estimated Advanced | 455 | Norman Powell | Norman Powell |
| General - Estimated Advanced | 456 | OG Anunoby | OG Anunoby |
| General - Estimated Advanced | 457 | Obi Toppin | Obi Toppin |
| General - Estimated Advanced | 458 | Ochai Agbaji | Ochai Agbaji |
| General - Estimated Advanced | 459 | Olivier Sarr | Olivier Sarr |
| General - Estimated Advanced | 460 | Olivier-Maxence Prosper | Olivier-Maxence Prosper |
| General - Estimated Advanced | 461 | Omer Yurtseven | Omer Yurtseven |
| General - Estimated Advanced | 462 | Onyeka Okongwu | Onyeka Okongwu |
| General - Estimated Advanced | 463 | Orlando Robinson | Orlando Robinson |
| General - Estimated Advanced | 464 | Oscar Tshiebwe | Oscar Tshiebwe |
| General - Estimated Advanced | 465 | Oso Ighodaro | Oso Ighodaro |
| General - Estimated Advanced | 466 | Ousmane Dieng | Ousmane Dieng |
| General - Estimated Advanced | 467 | P.J. Washington | P.J. Washington |
| General - Estimated Advanced | 468 | PJ Hall | PJ Hall |
| General - Estimated Advanced | 469 | Pacôme Dadiet | Pacôme Dadiet |
| General - Estimated Advanced | 470 | Paolo Banchero | Paolo Banchero |
| General - Estimated Advanced | 471 | Pascal Siakam | Pascal Siakam |
| General - Estimated Advanced | 472 | Pat Connaughton | Pat Connaughton |
| General - Estimated Advanced | 473 | Pat Spencer | Pat Spencer |
| General - Estimated Advanced | 474 | Patrick Baldwin Jr. | Patrick Baldwin Jr. |
| General - Estimated Advanced | 475 | Patrick Williams | Patrick Williams |
| General - Estimated Advanced | 476 | Paul George | Paul George |
| General - Estimated Advanced | 477 | Paul Reed | Paul Reed |
| General - Estimated Advanced | 478 | Payton Pritchard | Payton Pritchard |
| General - Estimated Advanced | 479 | Payton Sandfort | Payton Sandfort |
| General - Estimated Advanced | 480 | Pelle Larsson | Pelle Larsson |
| General - Estimated Advanced | 481 | Pete Nance | Pete Nance |
| General - Estimated Advanced | 482 | Peyton Watson | Peyton Watson |
| General - Estimated Advanced | 483 | Precious Achiuwa | Precious Achiuwa |
| General - Estimated Advanced | 484 | Quentin Grimes | Quentin Grimes |
| General - Estimated Advanced | 485 | Quenton Jackson | Quenton Jackson |
| General - Estimated Advanced | 486 | Quinten Post | Quinten Post |
| General - Estimated Advanced | 487 | RJ Barrett | RJ Barrett |
| General - Estimated Advanced | 488 | Rasheer Fleming | Rasheer Fleming |
| General - Estimated Advanced | 489 | RayJ Dennis | RayJ Dennis |
| General - Estimated Advanced | 490 | Rayan Rupert | Rayan Rupert |
| General - Estimated Advanced | 491 | Reed Sheppard | Reed Sheppard |
| General - Estimated Advanced | 492 | Riley Minix | Riley Minix |
| General - Estimated Advanced | 493 | Rob Dillingham | Rob Dillingham |
| General - Estimated Advanced | 494 | Robert Williams III | Robert Williams III |
| General - Estimated Advanced | 495 | Rocco Zikarsky | Rocco Zikarsky |
| General - Estimated Advanced | 496 | Ron Harper Jr. | Ron Harper Jr. |
| General - Estimated Advanced | 497 | Ronald Holland II | Ronald Holland II |
| General - Estimated Advanced | 498 | Royce O'Neale | Royce O'Neale |
| General - Estimated Advanced | 499 | Rudy Gobert | Rudy Gobert |
| General - Estimated Advanced | 500 | Rui Hachimura | Rui Hachimura |
| General - Estimated Advanced | 501 | Russell Westbrook | Russell Westbrook |
| General - Estimated Advanced | 502 | Ryan Dunn | Ryan Dunn |
| General - Estimated Advanced | 503 | Ryan Kalkbrenner | Ryan Kalkbrenner |
| General - Estimated Advanced | 504 | Ryan Nembhard | Ryan Nembhard |
| General - Estimated Advanced | 505 | Ryan Rollins | Ryan Rollins |
| General - Estimated Advanced | 506 | Saddiq Bey | Saddiq Bey |
| General - Estimated Advanced | 507 | Sam Hauser | Sam Hauser |
| General - Estimated Advanced | 508 | Sam Merrill | Sam Merrill |
| General - Estimated Advanced | 509 | Sandro Mamukelashvili | Sandro Mamukelashvili |
| General - Estimated Advanced | 510 | Santi Aldama | Santi Aldama |
| General - Estimated Advanced | 511 | Scoot Henderson | Scoot Henderson |
| General - Estimated Advanced | 512 | Scottie Barnes | Scottie Barnes |
| General - Estimated Advanced | 513 | Scotty Pippen Jr. | Scotty Pippen Jr. |
| General - Estimated Advanced | 514 | Sean Pedulla | Sean Pedulla |
| General - Estimated Advanced | 515 | Seth Curry | Seth Curry |
| General - Estimated Advanced | 516 | Shaedon Sharpe | Shaedon Sharpe |
| General - Estimated Advanced | 517 | Shai Gilgeous-Alexander | Shai Gilgeous-Alexander |
| General - Estimated Advanced | 518 | Sharife Cooper | Sharife Cooper |
| General - Estimated Advanced | 519 | Sidy Cissoko | Sidy Cissoko |
| General - Estimated Advanced | 520 | Simone Fontecchio | Simone Fontecchio |
| General - Estimated Advanced | 521 | Sion James | Sion James |
| General - Estimated Advanced | 522 | Skal Labissiere | Skal Labissiere |
| General - Estimated Advanced | 523 | Spencer Jones | Spencer Jones |
| General - Estimated Advanced | 524 | Stanley Umude | Stanley Umude |
| General - Estimated Advanced | 525 | Stephen Curry | Stephen Curry |
| General - Estimated Advanced | 526 | Stephon Castle | Stephon Castle |
| General - Estimated Advanced | 527 | Steven Adams | Steven Adams |
| General - Estimated Advanced | 528 | Svi Mykhailiuk | Svi Mykhailiuk |
| General - Estimated Advanced | 529 | T.J. McConnell | T.J. McConnell |
| General - Estimated Advanced | 530 | Taelon Peter | Taelon Peter |
| General - Estimated Advanced | 531 | Taj Gibson | Taj Gibson |
| General - Estimated Advanced | 532 | Tari Eason | Tari Eason |
| General - Estimated Advanced | 533 | Taurean Prince | Taurean Prince |
| General - Estimated Advanced | 534 | Taylor Hendricks | Taylor Hendricks |
| General - Estimated Advanced | 535 | Terance Mann | Terance Mann |
| General - Estimated Advanced | 536 | Terrence Shannon Jr. | Terrence Shannon Jr. |
| General - Estimated Advanced | 537 | Thanasis Antetokounmpo | Thanasis Antetokounmpo |
| General - Estimated Advanced | 538 | Thomas Bryant | Thomas Bryant |
| General - Estimated Advanced | 539 | Tidjane Salaün | Tidjane Salaün |
| General - Estimated Advanced | 540 | Tim Hardaway Jr. | Tim Hardaway Jr. |
| General - Estimated Advanced | 541 | Tobias Harris | Tobias Harris |
| General - Estimated Advanced | 542 | Toby Okani | Toby Okani |
| General - Estimated Advanced | 543 | Tolu Smith | Tolu Smith |
| General - Estimated Advanced | 544 | Tony Bradley | Tony Bradley |
| General - Estimated Advanced | 545 | Tosan Evbuomwan | Tosan Evbuomwan |
| General - Estimated Advanced | 546 | Toumani Camara | Toumani Camara |
| General - Estimated Advanced | 547 | Trae Young | Trae Young |
| General - Estimated Advanced | 548 | Trayce Jackson-Davis | Trayce Jackson-Davis |
| General - Estimated Advanced | 549 | Tre Johnson | Tre Johnson |
| General - Estimated Advanced | 550 | Tre Jones | Tre Jones |
| General - Estimated Advanced | 551 | Tre Mann | Tre Mann |
| General - Estimated Advanced | 552 | Trendon Watford | Trendon Watford |
| General - Estimated Advanced | 553 | Trentyn Flowers | Trentyn Flowers |
| General - Estimated Advanced | 554 | Trevon Scott | Trevon Scott |
| General - Estimated Advanced | 555 | Trevor Keels | Trevor Keels |
| General - Estimated Advanced | 556 | Trey Alexander | Trey Alexander |
| General - Estimated Advanced | 557 | Trey Jemison III | Trey Jemison III |
| General - Estimated Advanced | 558 | Trey Murphy III | Trey Murphy III |
| General - Estimated Advanced | 559 | Tristan Enaruna | Tristan Enaruna |
| General - Estimated Advanced | 560 | Tristan Vukcevic | Tristan Vukcevic |
| General - Estimated Advanced | 561 | Tristan da Silva | Tristan da Silva |
| General - Estimated Advanced | 562 | Tristen Newton | Tristen Newton |
| General - Estimated Advanced | 563 | Ty Jerome | Ty Jerome |
| General - Estimated Advanced | 564 | TyTy Washington Jr. | TyTy Washington Jr. |
| General - Estimated Advanced | 565 | Tyler Burton | Tyler Burton |
| General - Estimated Advanced | 566 | Tyler Herro | Tyler Herro |
| General - Estimated Advanced | 567 | Tyler Kolek | Tyler Kolek |
| General - Estimated Advanced | 568 | Tyler Smith | Tyler Smith |
| General - Estimated Advanced | 569 | Tyrese Martin | Tyrese Martin |
| General - Estimated Advanced | 570 | Tyrese Maxey | Tyrese Maxey |
| General - Estimated Advanced | 571 | Tyrese Proctor | Tyrese Proctor |
| General - Estimated Advanced | 572 | Tyson Etienne | Tyson Etienne |
| General - Estimated Advanced | 573 | Tyus Jones | Tyus Jones |
| General - Estimated Advanced | 574 | VJ Edgecombe | VJ Edgecombe |
| General - Estimated Advanced | 575 | Victor Wembanyama | Victor Wembanyama |
| General - Estimated Advanced | 576 | Vince Williams Jr. | Vince Williams Jr. |
| General - Estimated Advanced | 577 | Vladislav Goldin | Vladislav Goldin |
| General - Estimated Advanced | 578 | Vít Krejčí | Vít Krejčí |
| General - Estimated Advanced | 579 | Walker Kessler | Walker Kessler |
| General - Estimated Advanced | 580 | Walter Clayton Jr. | Walter Clayton Jr. |
| General - Estimated Advanced | 581 | Wendell Carter Jr. | Wendell Carter Jr. |
| General - Estimated Advanced | 582 | Wendell Moore Jr. | Wendell Moore Jr. |
| General - Estimated Advanced | 583 | Will Richard | Will Richard |
| General - Estimated Advanced | 584 | Will Riley | Will Riley |
| General - Estimated Advanced | 585 | Xavier Tillman | Xavier Tillman |
| General - Estimated Advanced | 586 | Yang Hansen | Yang Hansen |
| General - Estimated Advanced | 587 | Yanic Konan Niederhäuser | Yanic Konan Niederhäuser |
| General - Estimated Advanced | 588 | Yuki Kawamura | Yuki Kawamura |
| General - Estimated Advanced | 589 | Yves Missi | Yves Missi |
| General - Estimated Advanced | 590 | Zaccharie Risacher | Zaccharie Risacher |
| General - Estimated Advanced | 591 | Zach Collins | Zach Collins |
| General - Estimated Advanced | 592 | Zach Edey | Zach Edey |
| General - Estimated Advanced | 593 | Zach LaVine | Zach LaVine |
| General - Estimated Advanced | 594 | Zeke Nnaji | Zeke Nnaji |
| General - Estimated Advanced | 595 | Ziaire Williams | Ziaire Williams |
| General - Estimated Advanced | 596 | Zion Williamson | Zion Williamson |
| General - Estimated Advanced | 597 | Zyon Pullin | Zyon Pullin |

## player_name_reformatted

NBA.com opponent sheets use `Last, First`; the importer normalizes those names to `First Last` for stable player slugs and logs the deterministic rewrite.
| Sheet | Count |
| --- | --- |
| General - Opponent - Per Game | 660 |
| General - Opponent - Per Posses | 660 |
| General - Opponent - Per Minute | 660 |

## time_formatted_header_normalized

Excel interprets some `3PM` / `3FGM` headers as `15:00:00`. The importer preserves the original header and maps it to a usable cleaned stat name.
| Sheet | Column index | Original header | Cleaned name | Group label |
| --- | --- | --- | --- | --- |
| General - Official Leaders | 10 | 15:00:00 | three_pm |  |
| General - Traditional | 13 | 15:00:00 | three_pm |  |
| Clutch - Traditional | 13 | 15:00:00 | three_pm |  |
| Tracking - Catch & Shoot | 9 | 15:00:00 | three_pm |  |
| Tracking - Pullup Shooting | 11 | 15:00:00 | three_pm |  |
| Shooting Dashboard - Overall | 16 | 15:00:00 | three_fgm | 3 Point Field Goals |
| Shooting Dashboard - Catch & Sh | 16 | 15:00:00 | three_fgm | 3 Point Field Goals |
| Shooting Dashboard - Pullups | 16 | 15:00:00 | three_fgm | 3 Point Field Goals |

## Raw File And Generated File Safety

- Raw Excel file git status: `clean / unchanged`
- Raw Excel hash matches the hash recorded during ingestion: `True`
- `data/processed/nba_master.sqlite` git status: `not staged`
- `data/processed/nba_master.sqlite` tracked by git: `no`
- Ignore rule for SQLite: `.gitignore:12:data/processed/*.sqlite	data/processed/nba_master.sqlite`
- Duplicate `* 2.json` files: `0`
- Duplicate `* copy*.json` files: `0`
- Additional numbered duplicate profile files `* [0-9].json`: `0`

## Conclusion

Validation passed for Phase 2 data integrity: all workbook sheets import, generated player profile coverage is complete, SQLite remains ignored, the raw Excel file is unchanged, and duplicate generated profile copies are absent. Remaining warnings are logged and expected: grouped duplicate original headers, intentionally blank rank/helper values, text-only bio/position fields, the teamless estimated-advanced sheet, and deterministic header/name normalizations.
