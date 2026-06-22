# NBA Excel Import Audit

## Summary

- Exact file path used: `/Users/johnnypark/Documents/Codex/2026-06-16/aribradshaw-johnnystuff-https-github-com-aribradshaw/outputs/basketball-savant/data/raw/nba_data_2025_26.xlsx`
- Workbook name: `nba_data_2025_26.xlsx`
- SHA256: `196c596139340b0abe43668f0ecd42a1a77321767f1d6cde640251ee35d69169`
- Original upload path checked: `/Users/johnnypark/Downloads/nba_data_2025_26.xlsx`
- Original upload checksum matches raw copy: `True`
- Sheets found: 67
- Importable sheets: 49
- Needs review: 18
- Skipped sheets: 0
- Major issues: 18

## Sheet Names

1. `General - Official Leaders`
2. `General - Traditional`
3. `General - Advanced`
4. `General - Misc`
5. `General - Scoring`
6. `General - Usage`
7. `General - Opponent - Per Game`
8. `General - Opponent - Per Posses`
9. `General - Opponent - Per Minute`
10. `General - Defense`
11. `General - Violations`
12. `General - Estimated Advanced`
13. `Clutch - Traditional`
14. `Clutch - Advanced`
15. `Clutch - Misc`
16. `Clutch - Scoring`
17. `Clutch - Usage`
18. `Playtype - Isolation - Offense`
19. `Playtype - Isolation - Defense`
20. `Playtype - Transition - Offense`
21. `Playtype - Pick & Roll Ball Han`
22. `Sheet69`
23. `Playtype - Pick & Roll Roll Man`
24. `Sheet70`
25. `Playtype - Post Up - Offense`
26. `Playtype - Post Up - Defense`
27. `Playtype - Spot Up - Offense`
28. `Playtype - Spot Up - Defense`
29. `Playtype - Hand Off - Offense`
30. `Playtype - Hand Off - Defense`
31. `Playtype - Cut - Offense`
32. `Playtype - Off Screen - Offense`
33. `Playtype - Off Screen - Defense`
34. `Playtype - Putbacks - Offense`
35. `Playtype - Misc - Offense`
36. `Tracking - Drives`
37. `Tracking - Defensive Impact`
38. `Tracking - Catch & Shoot`
39. `Tracking - Passing`
40. `Tracking - Touches`
41. `Tracking - Pullup Shooting`
42. `Tracking - Rebounding`
43. `Tracking - Offensive Rebounding`
44. `Tracking - Defensive Rebounding`
45. `Tracking - Shooting Efficiency`
46. `Tracking - Speed & Distance`
47. `Tracking - Elbow Touch`
48. `Tracking - Post Up`
49. `Tracking - Paint Touch`
50. `Defense Dashboard - Overall`
51. `Defense Dashboard - 3pt`
52. `Defense Dashboard - 2pt`
53. `Defense Dashboard - <6ft`
54. `Defense Dashboard - <10ft`
55. `Defense Dashboard - >15ft`
56. `Shooting Dashboard - Overall`
57. `Shooting Dashboard - Catch & Sh`
58. `Shooting Dashboard - Pullups`
59. `Shooting - 5ft Range`
60. `Shooting - 8ft Range`
61. `Shooting - By Zone`
62. `Opponent Shooting - 5ft Range`
63. `Opponent Shooting - 8ft Range`
64. `Opponent Shooting - By Zone`
65. `Hustle`
66. `Box Outs`
67. `Bios`

## Workbook-Wide Findings

- The workbook appears to be primarily NBA.com export sheets, with filter/control rows above the usable table headers.
- Most usable table headers begin around rows 18-20, not row 1.
- The raw workbook should remain immutable; import code should write normalized data to `data/processed/` or `public/data/` only.
- Generic sheet names requiring review: `Sheet69`, `Sheet70`.
- Multi-row/grouped header sheets requiring flattening: `Shooting - 5ft Range`, `Shooting - 8ft Range`, `Shooting - By Zone`, `Opponent Shooting - 5ft Range`, `Opponent Shooting - 8ft Range`, `Opponent Shooting - By Zone`.
- Sheets with date/time/numeric values in the detected header: `General - Official Leaders`, `General - Traditional`, `Clutch - Traditional`, `Tracking - Catch & Shoot`, `Tracking - Pullup Shooting`, `Shooting Dashboard - Overall`, `Shooting Dashboard - Catch & Sh`, `Shooting Dashboard - Pullups`.
- Sheets with Excel date/serial-like height values: `Bios`.
- Sheets that look like manual notes/helper sheets: none detected.

## Decision Buckets

- Clean import candidates (49): `General - Advanced`, `General - Misc`, `General - Scoring`, `General - Usage`, `General - Opponent - Per Game`, `General - Opponent - Per Posses`, `General - Opponent - Per Minute`, `General - Defense`, `General - Violations`, `Clutch - Advanced`, `Clutch - Misc`, `Clutch - Scoring`, `Clutch - Usage`, `Playtype - Isolation - Offense`, `Playtype - Isolation - Defense`, `Playtype - Transition - Offense`, `Playtype - Pick & Roll Ball Han`, `Playtype - Pick & Roll Roll Man`, `Playtype - Post Up - Offense`, `Playtype - Post Up - Defense`, `Playtype - Spot Up - Offense`, `Playtype - Spot Up - Defense`, `Playtype - Hand Off - Offense`, `Playtype - Hand Off - Defense`, `Playtype - Cut - Offense`, `Playtype - Off Screen - Offense`, `Playtype - Off Screen - Defense`, `Playtype - Putbacks - Offense`, `Playtype - Misc - Offense`, `Tracking - Drives`, `Tracking - Defensive Impact`, `Tracking - Passing`, `Tracking - Touches`, `Tracking - Rebounding`, `Tracking - Offensive Rebounding`, `Tracking - Defensive Rebounding`, `Tracking - Shooting Efficiency`, `Tracking - Speed & Distance`, `Tracking - Elbow Touch`, `Tracking - Post Up`, `Tracking - Paint Touch`, `Defense Dashboard - Overall`, `Defense Dashboard - 3pt`, `Defense Dashboard - 2pt`, `Defense Dashboard - <6ft`, `Defense Dashboard - <10ft`, `Defense Dashboard - >15ft`, `Hustle`, `Box Outs`
- Needs manual review before import (18): `General - Official Leaders`, `General - Traditional`, `General - Estimated Advanced`, `Clutch - Traditional`, `Sheet69`, `Sheet70`, `Tracking - Catch & Shoot`, `Tracking - Pullup Shooting`, `Shooting Dashboard - Overall`, `Shooting Dashboard - Catch & Sh`, `Shooting Dashboard - Pullups`, `Shooting - 5ft Range`, `Shooting - 8ft Range`, `Shooting - By Zone`, `Opponent Shooting - 5ft Range`, `Opponent Shooting - 8ft Range`, `Opponent Shooting - By Zone`, `Bios`
- Skip candidates (0): none

## Sheet Inventory

| # | Sheet | Rows | Cols | Header Row | Player Col | Team Col | Category | Decision | Key Issues |
|---:|---|---:|---:|---:|:---:|:---:|---|---|---|
| 1 | `General - Official Leaders` | 253 | 23 | 19 | yes | yes | Official leaders | review | non_text_header_values |
| 2 | `General - Traditional` | 601 | 30 | 19 | yes | yes | General player stats | review | non_text_header_values, blank_header_columns |
| 3 | `General - Advanced` | 601 | 24 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 4 | `General - Misc` | 601 | 20 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 5 | `General - Scoring` | 601 | 23 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 6 | `General - Usage` | 601 | 26 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 7 | `General - Opponent - Per Game` | 682 | 28 | 20 | yes | yes | General player stats | import | blank_header_columns |
| 8 | `General - Opponent - Per Posses` | 681 | 28 | 20 | yes | yes | General player stats | import | blank_header_columns |
| 9 | `General - Opponent - Per Minute` | 681 | 28 | 20 | yes | yes | General player stats | import | blank_header_columns |
| 10 | `General - Defense` | 601 | 21 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 11 | `General - Violations` | 601 | 22 | 19 | yes | yes | General player stats | import | blank_header_columns |
| 12 | `General - Estimated Advanced` | 597 | 16 | 15 | yes | no | General player stats | review | missing_team_column, blank_header_columns |
| 13 | `Clutch - Traditional` | 511 | 30 | 19 | yes | yes | Clutch player stats | review | non_text_header_values, blank_header_columns |
| 14 | `Clutch - Advanced` | 511 | 23 | 19 | yes | yes | Clutch player stats | import | blank_header_columns |
| 15 | `Clutch - Misc` | 511 | 20 | 19 | yes | yes | Clutch player stats | import | blank_header_columns |
| 16 | `Clutch - Scoring` | 511 | 23 | 19 | yes | yes | Clutch player stats | import | blank_header_columns |
| 17 | `Clutch - Usage` | 511 | 26 | 19 | yes | yes | Clutch player stats | import | blank_header_columns |
| 18 | `Playtype - Isolation - Offense` | 303 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 19 | `Playtype - Isolation - Defense` | 414 | 17 | 20 | yes | yes | Play type | import | blank_rows |
| 20 | `Playtype - Transition - Offense` | 428 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 21 | `Playtype - Pick & Roll Ball Han` | 366 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 22 | `Sheet69` | 435 | 17 | 20 | yes | yes | Unnamed NBA.com play type export | review | generic_sheet_name |
| 23 | `Playtype - Pick & Roll Roll Man` | 288 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 24 | `Sheet70` | 406 | 17 | 20 | yes | yes | Unnamed NBA.com play type export | review | generic_sheet_name |
| 25 | `Playtype - Post Up - Offense` | 168 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 26 | `Playtype - Post Up - Defense` | 349 | 17 | 20 | yes | yes | Play type | import | blank_rows |
| 27 | `Playtype - Spot Up - Offense` | 419 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 28 | `Playtype - Spot Up - Defense` | 439 | 17 | 20 | yes | yes | Play type | import | blank_rows |
| 29 | `Playtype - Hand Off - Offense` | 295 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 30 | `Playtype - Hand Off - Defense` | 70 | 17 | 20 | yes | yes | Play type | import | blank_rows |
| 31 | `Playtype - Cut - Offense` | 358 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 32 | `Playtype - Off Screen - Offense` | 234 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 33 | `Playtype - Off Screen - Defense` | 337 | 17 | 20 | yes | yes | Play type | import | blank_rows |
| 34 | `Playtype - Putbacks - Offense` | 320 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 35 | `Playtype - Misc - Offense` | 69 | 17 | 19 | yes | yes | Play type | import | blank_rows |
| 36 | `Tracking - Drives` | 602 | 23 | 20 | yes | yes | Tracking | import | blank_rows |
| 37 | `Tracking - Defensive Impact` | 602 | 12 | 20 | yes | yes | Tracking | import | blank_rows |
| 38 | `Tracking - Catch & Shoot` | 602 | 12 | 20 | yes | yes | Tracking | review | non_text_header_values |
| 39 | `Tracking - Passing` | 602 | 15 | 20 | yes | yes | Tracking | import | blank_rows |
| 40 | `Tracking - Touches` | 602 | 19 | 20 | yes | yes | Tracking | import | blank_rows |
| 41 | `Tracking - Pullup Shooting` | 602 | 14 | 20 | yes | yes | Tracking | review | non_text_header_values |
| 42 | `Tracking - Rebounding` | 598 | 14 | 20 | yes | yes | Tracking | import | blank_rows |
| 43 | `Tracking - Offensive Rebounding` | 598 | 14 | 20 | yes | yes | Tracking | import | blank_rows |
| 44 | `Tracking - Defensive Rebounding` | 598 | 14 | 20 | yes | yes | Tracking | import | blank_rows |
| 45 | `Tracking - Shooting Efficiency` | 602 | 20 | 20 | yes | yes | Tracking | import | blank_rows |
| 46 | `Tracking - Speed & Distance` | 602 | 13 | 20 | yes | yes | Tracking | import | blank_rows |
| 47 | `Tracking - Elbow Touch` | 602 | 24 | 20 | yes | yes | Tracking | import | blank_rows |
| 48 | `Tracking - Post Up` | 602 | 24 | 20 | yes | yes | Tracking | import | blank_rows |
| 49 | `Tracking - Paint Touch` | 602 | 24 | 20 | yes | yes | Tracking | import | blank_rows |
| 50 | `Defense Dashboard - Overall` | 600 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 51 | `Defense Dashboard - 3pt` | 595 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 52 | `Defense Dashboard - 2pt` | 598 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 53 | `Defense Dashboard - <6ft` | 597 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 54 | `Defense Dashboard - <10ft` | 598 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 55 | `Defense Dashboard - >15ft` | 598 | 12 | 19 | yes | yes | Defense dashboard | import | blank_rows |
| 56 | `Shooting Dashboard - Overall` | 602 | 18 | 20 | yes | yes | Shooting dashboard | review | non_text_header_values, merged_header_cells |
| 57 | `Shooting Dashboard - Catch & Sh` | 585 | 18 | 21 | yes | yes | Shooting dashboard | review | non_text_header_values, merged_header_cells |
| 58 | `Shooting Dashboard - Pullups` | 557 | 18 | 21 | yes | yes | Shooting dashboard | review | non_text_header_values, merged_header_cells |
| 59 | `Shooting - 5ft Range` | 601 | 21 | 19 | yes | yes | Player shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 60 | `Shooting - 8ft Range` | 602 | 18 | 20 | yes | yes | Player shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 61 | `Shooting - By Zone` | 602 | 24 | 20 | yes | yes | Player shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 62 | `Opponent Shooting - 5ft Range` | 601 | 21 | 19 | yes | yes | Opponent shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 63 | `Opponent Shooting - 8ft Range` | 602 | 18 | 20 | yes | yes | Opponent shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 64 | `Opponent Shooting - By Zone` | 602 | 24 | 20 | yes | yes | Opponent shooting zones/ranges | review | multi_row_grouped_header, duplicate_column_names, merged_header_cells |
| 65 | `Hustle` | 599 | 17 | 18 | yes | yes | Hustle | import | blank_rows |
| 66 | `Box Outs` | 599 | 14 | 18 | yes | yes | Box outs | import | blank_rows |
| 67 | `Bios` | 600 | 20 | 18 | yes | yes | Player bios and physical profile | review | height_serial_or_date_values |

## Per-Sheet Audit Details

### General - Official Leaders

- Rows x columns: 253 x 23
- Nonblank rows x columns: 252 x 23
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Official leaders
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Traditional

- Rows x columns: 601 x 30
- Nonblank rows x columns: 600 x 30
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Advanced

- Rows x columns: 601 x 24
- Nonblank rows x columns: 600 x 24
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Misc

- Rows x columns: 601 x 20
- Nonblank rows x columns: 600 x 20
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Scoring

- Rows x columns: 601 x 23
- Nonblank rows x columns: 600 x 23
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Usage

- Rows x columns: 601 x 26
- Nonblank rows x columns: 600 x 26
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Opponent - Per Game

- Rows x columns: 682 x 28
- Nonblank rows x columns: 680 x 28
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 2 (17, 682)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Opponent - Per Posses

- Rows x columns: 681 x 28
- Nonblank rows x columns: 680 x 28
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Opponent - Per Minute

- Rows x columns: 681 x 28
- Nonblank rows x columns: 680 x 28
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Defense

- Rows x columns: 601 x 21
- Nonblank rows x columns: 600 x 21
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Violations

- Rows x columns: 601 x 22
- Nonblank rows x columns: 600 x 22
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### General - Estimated Advanced

- Rows x columns: 597 x 16
- Nonblank rows x columns: 596 x 16
- Likely header row: 15
- Player/team columns: player=True, team=False
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: General player stats
- Import decision: review
- Blank rows: 1 (12)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] missing_team_column: No Team column was detected on the likely header row.
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Clutch - Traditional

- Rows x columns: 511 x 30
- Nonblank rows x columns: 510 x 30
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Clutch player stats
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Clutch - Advanced

- Rows x columns: 511 x 23
- Nonblank rows x columns: 510 x 23
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Clutch player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Clutch - Misc

- Rows x columns: 511 x 20
- Nonblank rows x columns: 510 x 20
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Clutch player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Clutch - Scoring

- Rows x columns: 511 x 23
- Nonblank rows x columns: 510 x 23
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Clutch player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Clutch - Usage

- Rows x columns: 511 x 26
- Nonblank rows x columns: 510 x 26
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Clutch player stats
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: A
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [warning] blank_header_columns: One or more used columns have a blank header cell.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Isolation - Offense

- Rows x columns: 303 x 17
- Nonblank rows x columns: 302 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Isolation - Defense

- Rows x columns: 414 x 17
- Nonblank rows x columns: 413 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Transition - Offense

- Rows x columns: 428 x 17
- Nonblank rows x columns: 427 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Pick & Roll Ball Han

- Rows x columns: 366 x 17
- Nonblank rows x columns: 365 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Sheet69

- Rows x columns: 435 x 17
- Nonblank rows x columns: 434 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Unnamed NBA.com play type export
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] generic_sheet_name: Sheet uses a generic Excel name and should be identified before import.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Pick & Roll Roll Man

- Rows x columns: 288 x 17
- Nonblank rows x columns: 287 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Sheet70

- Rows x columns: 406 x 17
- Nonblank rows x columns: 405 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Unnamed NBA.com play type export
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] generic_sheet_name: Sheet uses a generic Excel name and should be identified before import.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Post Up - Offense

- Rows x columns: 168 x 17
- Nonblank rows x columns: 167 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Post Up - Defense

- Rows x columns: 349 x 17
- Nonblank rows x columns: 348 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Spot Up - Offense

- Rows x columns: 419 x 17
- Nonblank rows x columns: 418 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Spot Up - Defense

- Rows x columns: 439 x 17
- Nonblank rows x columns: 438 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Hand Off - Offense

- Rows x columns: 295 x 17
- Nonblank rows x columns: 294 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Hand Off - Defense

- Rows x columns: 70 x 17
- Nonblank rows x columns: 69 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Cut - Offense

- Rows x columns: 358 x 17
- Nonblank rows x columns: 357 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Off Screen - Offense

- Rows x columns: 234 x 17
- Nonblank rows x columns: 233 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Off Screen - Defense

- Rows x columns: 337 x 17
- Nonblank rows x columns: 336 x 17
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Putbacks - Offense

- Rows x columns: 320 x 17
- Nonblank rows x columns: 319 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Playtype - Misc - Offense

- Rows x columns: 69 x 17
- Nonblank rows x columns: 68 x 17
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Play type
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Drives

- Rows x columns: 602 x 23
- Nonblank rows x columns: 601 x 23
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Defensive Impact

- Rows x columns: 602 x 12
- Nonblank rows x columns: 601 x 12
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Catch & Shoot

- Rows x columns: 602 x 12
- Nonblank rows x columns: 601 x 12
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Passing

- Rows x columns: 602 x 15
- Nonblank rows x columns: 601 x 15
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Touches

- Rows x columns: 602 x 19
- Nonblank rows x columns: 601 x 19
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Pullup Shooting

- Rows x columns: 602 x 14
- Nonblank rows x columns: 601 x 14
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Rebounding

- Rows x columns: 598 x 14
- Nonblank rows x columns: 597 x 14
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Offensive Rebounding

- Rows x columns: 598 x 14
- Nonblank rows x columns: 597 x 14
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Defensive Rebounding

- Rows x columns: 598 x 14
- Nonblank rows x columns: 597 x 14
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Shooting Efficiency

- Rows x columns: 602 x 20
- Nonblank rows x columns: 601 x 20
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Speed & Distance

- Rows x columns: 602 x 13
- Nonblank rows x columns: 601 x 13
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Elbow Touch

- Rows x columns: 602 x 24
- Nonblank rows x columns: 601 x 24
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Post Up

- Rows x columns: 602 x 24
- Nonblank rows x columns: 601 x 24
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Tracking - Paint Touch

- Rows x columns: 602 x 24
- Nonblank rows x columns: 601 x 24
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Tracking
- Import decision: import
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - Overall

- Rows x columns: 600 x 12
- Nonblank rows x columns: 599 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - 3pt

- Rows x columns: 595 x 12
- Nonblank rows x columns: 594 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - 2pt

- Rows x columns: 598 x 12
- Nonblank rows x columns: 597 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - <6ft

- Rows x columns: 597 x 12
- Nonblank rows x columns: 596 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - <10ft

- Rows x columns: 598 x 12
- Nonblank rows x columns: 597 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Defense Dashboard - >15ft

- Rows x columns: 598 x 12
- Nonblank rows x columns: 597 x 12
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Defense dashboard
- Import decision: import
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Shooting Dashboard - Overall

- Rows x columns: 602 x 18
- Nonblank rows x columns: 601 x 18
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Shooting dashboard
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: merged header cells F19:J19, O19:R19, K19:N19, A19:E19
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Shooting Dashboard - Catch & Sh

- Rows x columns: 585 x 18
- Nonblank rows x columns: 584 x 18
- Likely header row: 21
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Shooting dashboard
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: merged header cells K20:N20, F20:J20, O20:R20, A20:E20
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Shooting Dashboard - Pullups

- Rows x columns: 557 x 18
- Nonblank rows x columns: 556 x 18
- Likely header row: 21
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Shooting dashboard
- Import decision: review
- Blank rows: 1 (17)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: merged header cells K20:N20, F20:J20, O20:R20, A20:E20
- Issues:
  - [major] non_text_header_values: Likely header row contains date/time/numeric values where metric names were expected.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Shooting - 5ft Range

- Rows x columns: 601 x 21
- Nonblank rows x columns: 600 x 21
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Player shooting zones/ranges
- Import decision: review
- Blank rows: 1 (15)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P, S), FGA (E, H, K, N, Q, T), FG% (F, I, L, O, R, U)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Shooting - 8ft Range

- Rows x columns: 602 x 18
- Nonblank rows x columns: 601 x 18
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Player shooting zones/ranges
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P), FGA (E, H, K, N, Q), FG% (F, I, L, O, R)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Shooting - By Zone

- Rows x columns: 602 x 24
- Nonblank rows x columns: 601 x 24
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Player shooting zones/ranges
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P, S, V), FGA (E, H, K, N, Q, T, W), FG% (F, I, L, O, R, U, X)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Opponent Shooting - 5ft Range

- Rows x columns: 601 x 21
- Nonblank rows x columns: 600 x 21
- Likely header row: 19
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Opponent shooting zones/ranges
- Import decision: review
- Blank rows: 1 (15)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P, S), FGA (E, H, K, N, Q, T), FG% (F, I, L, O, R, U)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Opponent Shooting - 8ft Range

- Rows x columns: 602 x 18
- Nonblank rows x columns: 601 x 18
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Opponent shooting zones/ranges
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P), FGA (E, H, K, N, Q), FG% (F, I, L, O, R)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Opponent Shooting - By Zone

- Rows x columns: 602 x 24
- Nonblank rows x columns: 601 x 24
- Likely header row: 20
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Opponent shooting zones/ranges
- Import decision: review
- Blank rows: 1 (16)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: FGM (D, G, J, M, P, S, V), FGA (E, H, K, N, Q, T, W), FG% (F, I, L, O, R, U, X)
- Repeated header rows inside data: none
- Weird merged/header formatting: grouped or multi-row header detected
- Issues:
  - [major] multi_row_grouped_header: Header appears to use grouped NBA.com zone/range labels and must be flattened before import.
  - [warning] duplicate_column_names: Duplicate column labels were found on the likely header row.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.
  - [warning] merged_header_cells: Merged cells touch the likely header or grouped header rows.

### Hustle

- Rows x columns: 599 x 17
- Nonblank rows x columns: 598 x 17
- Likely header row: 18
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Hustle
- Import decision: import
- Blank rows: 1 (15)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Box Outs

- Rows x columns: 599 x 14
- Nonblank rows x columns: 598 x 14
- Likely header row: 18
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Box outs
- Import decision: import
- Blank rows: 1 (15)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

### Bios

- Rows x columns: 600 x 20
- Nonblank rows x columns: 599 x 20
- Likely header row: 18
- Player/team columns: player=True, team=True
- NBA.com export likely: True
- Manual notes/helper likely: False
- Possible stat category: Player bios and physical profile
- Import decision: review
- Blank rows: 1 (15)
- Blank columns: 0 (none)
- Blank header columns: none
- Duplicate column names: none
- Repeated header rows inside data: none
- Weird merged/header formatting: none detected
- Issues:
  - [major] height_serial_or_date_values: Height column includes Excel date/serial-like values that need normalization.
  - [info] blank_rows: Blank rows exist within the worksheet's used range.

## Safest Import Plan

1. Keep `data/raw/nba_data_2025_26.xlsx` as the immutable raw source of truth and never import directly from frontend code.
2. Build a read-only importer that normalizes each approved sheet into typed JSON/CSV outputs under `data/processed/`, then publish only validated frontend-ready data under `public/data/`.
3. Phase 1 should import clean single-header player tables marked `import`, keyed by normalized player name, NBA Stats player ID when available, team abbreviation, season, and stat category.
4. Phase 2 should handle `review` sheets with duplicate/grouped headers by explicitly flattening parent header rows into stable names, especially shooting zones and opponent shooting zones.
5. Phase 3 should normalize `Bios` after resolving Excel serial-like height values, then use it for height, weight, college, country, draft fields, and profile metadata.
6. Before using any generated data in the app, add validation for duplicate players, missing teams, nonnumeric stat cells, null sorting behavior, and row-count drift against this audit.
7. Defer any skipped or unresolved sheets until their source layout is mapped manually; do not hardcode fixes in React components.
