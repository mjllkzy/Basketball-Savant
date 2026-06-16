import type { MetricDefinition, PlayerSeasonAggregate, TeamSeasonAggregate } from "@/lib/types";
import {
  assistRate,
  defensiveRating,
  efgPercentage,
  netRating as netRatingFormula,
  offensiveRating,
  paceEstimate,
  per75,
  percentage,
  reboundConversion,
  rimFrequency,
  safeDiv,
  shotQuality,
  trueShootingPercentage,
  turnoverRate,
  usageRate
} from "@/lib/metrics/formulas";

type DefinitionSeed = Omit<MetricDefinition, "id" | "glossaryMarkdown"> & { glossaryMarkdown?: string };

function metric(seed: DefinitionSeed): MetricDefinition {
  return {
    ...seed,
    id: seed.key,
    glossaryMarkdown:
      seed.glossaryMarkdown ??
      `${seed.label} belongs to the ${seed.category} family. Formula: ${seed.formula}. Sample note: ${seed.sampleQualifier}.`
  };
}

export const metricRegistry: MetricDefinition[] = [
  metric({ key: "pts", label: "Points", shortLabel: "PTS", category: "Traditional", description: "Points scored.", formula: "PTS", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "reb", label: "Rebounds", shortLabel: "REB", category: "Traditional", description: "Total rebounds.", formula: "REB", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "ast", label: "Assists", shortLabel: "AST", category: "Traditional", description: "Assists credited.", formula: "AST", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "stl", label: "Steals", shortLabel: "STL", category: "Traditional", description: "Steals credited.", formula: "STL", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "blk", label: "Blocks", shortLabel: "BLK", category: "Traditional", description: "Blocks credited.", formula: "BLK", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "tov", label: "Turnovers", shortLabel: "TOV", category: "Traditional", description: "Turnovers committed.", formula: "TOV", unit: "number", higherIsBetter: false, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "fgm", label: "Field Goals Made", shortLabel: "FGM", category: "Traditional", description: "Field goals made.", formula: "FGM", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "fga", label: "Field Goal Attempts", shortLabel: "FGA", category: "Traditional", description: "Field goal attempts.", formula: "FGA", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "three_pm", label: "Threes Made", shortLabel: "3PM", category: "Traditional", description: "Three-point field goals made.", formula: "3PM", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "three_pa", label: "Threes Attempted", shortLabel: "3PA", category: "Traditional", description: "Three-point field goal attempts.", formula: "3PA", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "ftm", label: "Free Throws Made", shortLabel: "FTM", category: "Traditional", description: "Free throws made.", formula: "FTM", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),
  metric({ key: "fta", label: "Free Throws Attempted", shortLabel: "FTA", category: "Traditional", description: "Free throw attempts.", formula: "FTA", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game for player tables." }),

  metric({ key: "fg_pct", label: "Field Goal Percentage", shortLabel: "FG%", category: "Efficiency", description: "Made field goals divided by field goal attempts.", formula: "FGM / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Minimum attempts recommended." }),
  metric({ key: "three_pct", label: "Three-Point Percentage", shortLabel: "3P%", category: "Efficiency", description: "Made threes divided by three-point attempts.", formula: "3PM / 3PA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Minimum attempts recommended." }),
  metric({ key: "ft_pct", label: "Free Throw Percentage", shortLabel: "FT%", category: "Efficiency", description: "Made free throws divided by free throw attempts.", formula: "FTM / FTA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Minimum attempts recommended." }),
  metric({ key: "efg_pct", label: "Effective Field Goal Percentage", shortLabel: "eFG%", category: "Efficiency", description: "Shooting efficiency that gives threes an extra half make.", formula: "(FGM + 0.5 * 3PM) / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Best for shooting efficiency comparison." }),
  metric({ key: "ts_pct", label: "True Shooting Percentage", shortLabel: "TS%", category: "Efficiency", description: "Scoring efficiency including twos, threes, and free throws.", formula: "PTS / (2 * (FGA + 0.44 * FTA))", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Best with moderate scoring volume." }),
  metric({ key: "points_per_shot", label: "Points Per Shot", shortLabel: "PPS", category: "Efficiency", description: "Points divided by field goal attempts.", formula: "PTS / FGA", unit: "points", higherIsBetter: true, precision: 2, sourceType: "derived", requiresTracking: false, sampleQualifier: "Treat free throws separately." }),
  metric({ key: "points_per_possession", label: "Points Per Possession", shortLabel: "PPP", category: "Efficiency", description: "Points divided by possessions used.", formula: "PTS / Possessions", unit: "points", higherIsBetter: true, precision: 2, sourceType: "derived", requiresTracking: false, sampleQualifier: "Requires possession estimate." }),
  metric({ key: "usage_rate", label: "Usage Rate", shortLabel: "USG%", category: "Efficiency", description: "Share of team possessions used by a player.", formula: "(FGA + 0.44 * FTA + TOV) / Team Possessions", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Calculated from aggregate box totals." }),
  metric({ key: "assist_rate", label: "Assist Rate", shortLabel: "AST%", category: "Efficiency", description: "Assists divided by teammate field goals while on court.", formula: "AST / Teammate FGM", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Requires teammate field-goal context." }),
  metric({ key: "turnover_rate", label: "Turnover Rate", shortLabel: "TOV%", category: "Efficiency", description: "Turnovers divided by possessions used.", formula: "TOV / Possessions Used", unit: "percentage", higherIsBetter: false, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Lower is better." }),
  metric({ key: "off_rating", label: "Offensive Rating", shortLabel: "ORtg", category: "Efficiency", description: "Points scored per 100 possessions.", formula: "PTS / Possessions * 100", unit: "rating", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Estimated on-court/team context." }),
  metric({ key: "def_rating", label: "Defensive Rating", shortLabel: "DRtg", category: "Efficiency", description: "Points allowed per 100 possessions.", formula: "Points Allowed / Possessions * 100", unit: "rating", higherIsBetter: false, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Estimated on-court/team context." }),
  metric({ key: "net_rating", label: "Net Rating", shortLabel: "Net", category: "Efficiency", description: "Offensive rating minus defensive rating.", formula: "ORtg - DRtg", unit: "rating", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Stable with larger possession samples." }),
  metric({ key: "pace", label: "Pace", shortLabel: "Pace", category: "Efficiency", description: "Possessions per 48 minutes.", formula: "48 * ((Team Poss + Opp Poss) / (2 * Team Minutes / 5))", unit: "rating", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Team-level display." }),

  metric({ key: "expected_fg_pct", label: "Expected FG%", shortLabel: "xFG%", category: "Shot Quality", description: "Model-estimated make probability from shot context.", formula: "Rule-based expected shot model", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires shot-context features." }),
  metric({ key: "expected_points_per_shot", label: "Expected Points Per Shot", shortLabel: "xPTS/Shot", category: "Shot Quality", description: "Expected shot points divided by shot attempts.", formula: "Expected Points / FGA", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Shot-quality model output." }),
  metric({ key: "shot_quality", label: "Shot Quality", shortLabel: "SQ", category: "Shot Quality", description: "Expected points per shot.", formula: "Expected Points Per Shot", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires shot-context features." }),
  metric({ key: "actual_minus_expected_fg", label: "Actual - Expected FG%", shortLabel: "A-xFG", category: "Shot Quality", description: "Actual field goal percentage minus expected field goal percentage.", formula: "FG% - xFG%", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Can be noisy in small samples." }),
  metric({ key: "actual_minus_expected_points", label: "Actual - Expected Points", shortLabel: "A-xPTS", category: "Shot Quality", description: "Actual points minus expected points.", formula: "Actual Points - Expected Points", unit: "points", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Volume and shotmaking metric." }),
  metric({ key: "rim_shot_quality", label: "Rim Shot Quality", shortLabel: "Rim SQ", category: "Shot Quality", description: "Expected points on rim attempts.", formula: "Rim Expected Points / Rim Attempts", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires rim attempts." }),
  metric({ key: "three_point_shot_quality", label: "Three-Point Shot Quality", shortLabel: "3P SQ", category: "Shot Quality", description: "Expected points on three-point attempts.", formula: "3P Expected Points / 3PA", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires three-point attempts." }),
  metric({ key: "midrange_shot_quality", label: "Midrange Shot Quality", shortLabel: "Mid SQ", category: "Shot Quality", description: "Expected points on midrange attempts.", formula: "Midrange Expected Points / Midrange Attempts", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires midrange attempts." }),
  metric({ key: "clutch_shot_quality", label: "Clutch Shot Quality", shortLabel: "Clutch SQ", category: "Shot Quality", description: "Expected points on clutch attempts.", formula: "Clutch Expected Points / Clutch Attempts", unit: "points", higherIsBetter: true, precision: 2, sourceType: "model", requiresTracking: false, sampleQualifier: "Requires clutch shot-event tags." }),

  metric({ key: "rim_frequency", label: "Rim Frequency", shortLabel: "Rim Freq", category: "Shot Profile", description: "Share of shots at the rim.", formula: "Rim Attempts / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot chart zone required." }),
  metric({ key: "short_midrange_frequency", label: "Short Midrange Frequency", shortLabel: "Short Mid", category: "Shot Profile", description: "Share of shots from short midrange.", formula: "Short Mid Attempts / FGA", unit: "percentage", higherIsBetter: false, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot chart zone required." }),
  metric({ key: "long_midrange_frequency", label: "Long Midrange Frequency", shortLabel: "Long Mid", category: "Shot Profile", description: "Share of shots from long midrange.", formula: "Long Mid Attempts / FGA", unit: "percentage", higherIsBetter: false, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot chart zone required." }),
  metric({ key: "corner_three_frequency", label: "Corner Three Frequency", shortLabel: "C3 Freq", category: "Shot Profile", description: "Share of shots from the corners.", formula: "Corner 3PA / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot chart zone required." }),
  metric({ key: "above_break_three_frequency", label: "Above Break Three Frequency", shortLabel: "AB3 Freq", category: "Shot Profile", description: "Share of shots from above the break.", formula: "Above Break 3PA / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot chart zone required." }),
  metric({ key: "paint_touch_frequency", label: "Paint Touch Frequency", shortLabel: "Paint Touch", category: "Shot Profile", description: "Paint touches per touch.", formula: "Paint Touches / Touches", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "assisted_rim_frequency", label: "Assisted Rim Frequency", shortLabel: "Ast Rim", category: "Shot Profile", description: "Share of rim attempts assisted.", formula: "Assisted Rim Attempts / Rim Attempts", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot + assist tags required." }),
  metric({ key: "unassisted_rim_frequency", label: "Unassisted Rim Frequency", shortLabel: "Unast Rim", category: "Shot Profile", description: "Share of rim attempts self-created.", formula: "Unassisted Rim Attempts / Rim Attempts", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot + assist tags required." }),
  metric({ key: "pull_up_frequency", label: "Pull-Up Frequency", shortLabel: "Pull-Up", category: "Shot Profile", description: "Share of shots off pull-ups.", formula: "Pull-Up Attempts / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot type tag required." }),
  metric({ key: "catch_and_shoot_frequency", label: "Catch-and-Shoot Frequency", shortLabel: "C&S", category: "Shot Profile", description: "Share of shots that are catch-and-shoot.", formula: "Catch-and-Shoot Attempts / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Shot type tag required." }),

  metric({ key: "self_created_shot_rate", label: "Self-Created Shot Rate", shortLabel: "Self Create", category: "Creation", description: "Share of attempts not assisted.", formula: "Unassisted FGA / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Assist tags required." }),
  metric({ key: "assisted_shot_rate", label: "Assisted Shot Rate", shortLabel: "Ast Shot", category: "Creation", description: "Share of attempts assisted.", formula: "Assisted FGA / FGA", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Assist tags required." }),
  metric({ key: "drives_per_75", label: "Drives Per 75", shortLabel: "Drives/75", category: "Creation", description: "Drives normalized to 75 possessions.", formula: "Drives / Possessions * 75", unit: "per75", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "paint_touches_per_75", label: "Paint Touches Per 75", shortLabel: "Paint/75", category: "Creation", description: "Paint touches normalized to 75 possessions.", formula: "Paint Touches / Possessions * 75", unit: "per75", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "rim_pressure_score", label: "Rim Pressure Score", shortLabel: "Rim Pressure", category: "Creation", description: "Composite of rim attempts, drives, free throws, and paint touches.", formula: "Weighted creation composite", unit: "number", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: true, sampleQualifier: "Requires tracking and event inputs." }),
  metric({ key: "advantage_creation_rate", label: "Advantage Creation Rate", shortLabel: "Adv Create", category: "Creation", description: "Share of touches leading to an advantage event.", formula: "(Drives + Potential Assists + Paint Touches) / Touches", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "potential_assists", label: "Potential Assists", shortLabel: "Pot AST", category: "Creation", description: "Passes to shots that could become assists.", formula: "Potential Assists", unit: "number", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Per game display." }),
  metric({ key: "secondary_assists", label: "Secondary Assists", shortLabel: "2nd AST", category: "Creation", description: "Pass-before-the-assist events.", formula: "Secondary Assists", unit: "number", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Per game display." }),
  metric({ key: "passes_per_touch", label: "Passes Per Touch", shortLabel: "Pass/Touch", category: "Creation", description: "Pass volume normalized by touches.", formula: "Passes / Touches", unit: "number", higherIsBetter: true, precision: 2, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "points_created_by_assist", label: "Points Created By Assist", shortLabel: "PCA", category: "Creation", description: "Estimated points created through assists.", formula: "Assists * 2.35", unit: "points", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Requires an assist-value model." }),

  ...[
    ["transition_ppp", "Transition PPP", "Transition"],
    ["halfcourt_ppp", "Halfcourt PPP", "Halfcourt"],
    ["pnr_handler_ppp", "P&R Handler PPP", "P&R Handler"],
    ["pnr_roll_man_ppp", "P&R Roll Man PPP", "P&R Roll"],
    ["isolation_ppp", "Isolation PPP", "Isolation"],
    ["post_up_ppp", "Post-Up PPP", "Post-Up"],
    ["handoff_ppp", "Handoff PPP", "Handoff"],
    ["cut_ppp", "Cut PPP", "Cut"],
    ["off_screen_ppp", "Off-Screen PPP", "Off-Screen"],
    ["spot_up_ppp", "Spot-Up PPP", "Spot-Up"],
    ["putback_ppp", "Putback PPP", "Putback"]
  ].map(([key, label, shortLabel]) =>
    metric({ key, label, shortLabel, category: "Play Type", description: `${label} from tagged possessions.`, formula: "Play Type Points / Play Type Possessions", unit: "points", higherIsBetter: true, precision: 2, sourceType: "event", requiresTracking: false, sampleQualifier: "Requires tagged possessions." })
  ),

  metric({ key: "opponent_expected_fg_pct", label: "Opponent Expected FG%", shortLabel: "Opp xFG%", category: "Defense", description: "Expected field goal percentage allowed.", formula: "Opponent xFG%", unit: "percentage", higherIsBetter: false, precision: 1, sourceType: "model", requiresTracking: true, sampleQualifier: "Requires matchup tracking feed." }),
  metric({ key: "opponent_actual_minus_expected_fg", label: "Opponent Actual - Expected FG%", shortLabel: "Opp A-xFG", category: "Defense", description: "Opponent shotmaking allowed above expectation.", formula: "Opponent FG% - Opponent xFG%", unit: "percentage", higherIsBetter: false, precision: 1, sourceType: "model", requiresTracking: true, sampleQualifier: "Noisy small-sample metric." }),
  metric({ key: "rim_deterrence", label: "Rim Deterrence", shortLabel: "Rim Det", category: "Defense", description: "Composite of rim contest volume and reduced rim frequency.", formula: "Rim Contest Composite", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "rim_protection_value", label: "Rim Protection Value", shortLabel: "Rim Protect", category: "Defense", description: "Estimated points saved at the rim.", formula: "Rim xPTS Allowed - Actual Rim Points Allowed", unit: "points", higherIsBetter: true, precision: 1, sourceType: "model", requiresTracking: true, sampleQualifier: "Requires contest-event feed." }),
  metric({ key: "contest_rate", label: "Contest Rate", shortLabel: "Contest%", category: "Defense", description: "Shot contests per defensive opportunity.", formula: "Contests / Defensive Possessions", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires contest-event feed." }),
  metric({ key: "closeout_value", label: "Closeout Value", shortLabel: "Closeout", category: "Defense", description: "Estimated value from controlled closeouts.", formula: "Closeout Composite", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "matchup_difficulty", label: "Matchup Difficulty", shortLabel: "Difficulty", category: "Defense", description: "Average offensive quality of assignments.", formula: "Weighted opponent usage and skill", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires matchup tracking feed." }),
  metric({ key: "defensive_playmaking", label: "Defensive Playmaking", shortLabel: "Def Play", category: "Defense", description: "Composite of steals, blocks, deflections, and charges.", formula: "STL + BLK + Deflections + Charges", unit: "number", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Per game display." }),
  metric({ key: "deflections", label: "Deflections", shortLabel: "Defl", category: "Defense", description: "Ball deflections.", formula: "Deflections", unit: "number", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Per game display." }),
  metric({ key: "stocks", label: "Stocks", shortLabel: "Stocks", category: "Defense", description: "Steals plus blocks.", formula: "STL + BLK", unit: "number", higherIsBetter: true, precision: 1, sourceType: "box", requiresTracking: false, sampleQualifier: "Per game display." }),
  metric({ key: "charges_drawn", label: "Charges Drawn", shortLabel: "Charges", category: "Defense", description: "Charges drawn.", formula: "Charges Drawn", unit: "number", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Rare-event metric." }),
  metric({ key: "screen_navigation_score", label: "Screen Navigation Score", shortLabel: "Screen Nav", category: "Defense", description: "Screen navigation impact from contest and matchup context.", formula: "Contest and matchup composite", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),

  metric({ key: "offensive_rebound_rate", label: "Offensive Rebound Rate", shortLabel: "OREB%", category: "Rebounding", description: "Offensive rebounds divided by rebound chances.", formula: "OREB / Rebound Chances", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: true, sampleQualifier: "Requires rebound-chance tracking." }),
  metric({ key: "defensive_rebound_rate", label: "Defensive Rebound Rate", shortLabel: "DREB%", category: "Rebounding", description: "Defensive rebounds divided by rebound chances.", formula: "DREB / Rebound Chances", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: true, sampleQualifier: "Requires rebound-chance tracking." }),
  metric({ key: "contested_rebound_rate", label: "Contested Rebound Rate", shortLabel: "Cont Reb%", category: "Rebounding", description: "Share of rebounds that were contested.", formula: "Contested Rebounds / Rebounds", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "event", requiresTracking: false, sampleQualifier: "Requires rebound-event tags." }),
  metric({ key: "rebound_chances", label: "Rebound Chances", shortLabel: "Reb Ch", category: "Rebounding", description: "Available rebound opportunities.", formula: "Rebound Chances", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires rebound-chance tracking." }),
  metric({ key: "rebound_conversion_pct", label: "Rebound Conversion %", shortLabel: "Reb Conv", category: "Rebounding", description: "Rebounds divided by rebound chances.", formula: "REB / Rebound Chances", unit: "percentage", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: true, sampleQualifier: "Requires rebound-chance tracking." }),
  metric({ key: "boxouts", label: "Boxouts", shortLabel: "Boxouts", category: "Rebounding", description: "Boxout events.", formula: "Boxouts", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." }),
  metric({ key: "rebound_distance", label: "Rebound Distance", shortLabel: "Reb Dist", category: "Rebounding", description: "Average distance traveled to rebound.", formula: "Average rebound distance", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires rebound tracking feed." }),

  ...[
    ["average_speed", "Average Speed", "Avg Speed", "Average player speed."],
    ["offensive_speed", "Offensive Speed", "Off Speed", "Average offensive speed."],
    ["defensive_speed", "Defensive Speed", "Def Speed", "Average defensive speed."],
    ["distance_traveled", "Distance Traveled", "Distance", "Distance traveled."],
    ["average_seconds_per_touch", "Average Seconds Per Touch", "Sec/Touch", "Average touch duration."],
    ["average_dribbles_per_touch", "Average Dribbles Per Touch", "Drib/Touch", "Average dribbles per touch."],
    ["touches_per_75", "Touches Per 75", "Touches/75", "Touches normalized to 75 possessions."],
    ["frontcourt_touches", "Frontcourt Touches", "FC Touch", "Touches in the frontcourt."],
    ["elbow_touches", "Elbow Touches", "Elbow", "Touches at the elbows."],
    ["post_touches", "Post Touches", "Post", "Touches from the post."],
    ["paint_touches", "Paint Touches", "Paint", "Touches in the paint."]
  ].map(([key, label, shortLabel, description]) =>
    metric({ key, label, shortLabel, category: "Movement/Tracking", description, formula: "Tracking feed value", unit: "number", higherIsBetter: true, precision: 1, sourceType: "tracking", requiresTracking: true, sampleQualifier: "Requires tracking feed." })
  ),

  ...[
    ["lineup_off_rating", "Lineup Offensive Rating", "Lineup ORtg"],
    ["lineup_def_rating", "Lineup Defensive Rating", "Lineup DRtg"],
    ["lineup_net_rating", "Lineup Net Rating", "Lineup Net"],
    ["lineup_pace", "Lineup Pace", "Lineup Pace"],
    ["lineup_efg_pct", "Lineup eFG%", "Lineup eFG"],
    ["lineup_tov_pct", "Lineup TOV%", "Lineup TOV"],
    ["lineup_oreb_pct", "Lineup OREB%", "Lineup OREB"],
    ["lineup_fta_rate", "Lineup FTA Rate", "Lineup FTr"],
    ["lineup_shot_quality", "Lineup Shot Quality", "Lineup SQ"]
  ].map(([key, label, shortLabel]) =>
    metric({ key, label, shortLabel, category: "Lineup", description: `${label} for five-player groups.`, formula: "Lineup aggregate", unit: key.includes("pct") || key.includes("rate") ? "percentage" : "rating", higherIsBetter: !key.includes("def"), precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Lineup possessions required." })
  ),

  ...[
    ["last_5_games", "Last 5 Games", "L5"],
    ["last_10_games", "Last 10 Games", "L10"],
    ["last_15_games", "Last 15 Games", "L15"],
    ["last_30_games", "Last 30 Games", "L30"],
    ["rolling_75_possessions", "Rolling 75 Possessions", "R75"],
    ["rolling_150_possessions", "Rolling 150 Possessions", "R150"],
    ["rolling_300_possessions", "Rolling 300 Possessions", "R300"],
    ["then_now_delta", "Then/Now Delta", "Delta"]
  ].map(([key, label, shortLabel]) =>
    metric({ key, label, shortLabel, category: "Trend", description: `${label} trend split.`, formula: "Rolling window aggregate", unit: "number", higherIsBetter: true, precision: 1, sourceType: "derived", requiresTracking: false, sampleQualifier: "Window size noted in label." })
  )
];

export const metricByKey = new Map(metricRegistry.map((definition) => [definition.key, definition]));

export function getMetric(key: string): MetricDefinition {
  const definition = metricByKey.get(key);
  if (!definition) throw new Error(`Unknown metric: ${key}`);
  return definition;
}

export function metricsByCategory(category: MetricDefinition["category"]): MetricDefinition[] {
  return metricRegistry.filter((definition) => definition.category === category);
}

export function calculatePlayerMetric(key: string, row: PlayerSeasonAggregate): number | null {
  const hasEventOrTrackingData = row.expectedPoints > 0 || row.rimAttempts > 0 || row.touches > 0 || row.reboundChances > 0;
  const unavailableWithoutTracking = new Set([
    "assist_rate",
    "off_rating",
    "def_rating",
    "net_rating",
    "pace",
    "expected_fg_pct",
    "expected_points_per_shot",
    "shot_quality",
    "actual_minus_expected_fg",
    "actual_minus_expected_points",
    "rim_shot_quality",
    "three_point_shot_quality",
    "midrange_shot_quality",
    "clutch_shot_quality",
    "rim_frequency",
    "short_midrange_frequency",
    "long_midrange_frequency",
    "corner_three_frequency",
    "above_break_three_frequency",
    "paint_touch_frequency",
    "assisted_rim_frequency",
    "unassisted_rim_frequency",
    "pull_up_frequency",
    "catch_and_shoot_frequency",
    "self_created_shot_rate",
    "assisted_shot_rate",
    "drives_per_75",
    "paint_touches_per_75",
    "rim_pressure_score",
    "advantage_creation_rate",
    "potential_assists",
    "secondary_assists",
    "passes_per_touch",
    "points_created_by_assist",
    "transition_ppp",
    "halfcourt_ppp",
    "pnr_handler_ppp",
    "pnr_roll_man_ppp",
    "isolation_ppp",
    "post_up_ppp",
    "handoff_ppp",
    "cut_ppp",
    "off_screen_ppp",
    "spot_up_ppp",
    "putback_ppp",
    "opponent_expected_fg_pct",
    "opponent_actual_minus_expected_fg",
    "rim_deterrence",
    "rim_protection_value",
    "contest_rate",
    "closeout_value",
    "matchup_difficulty",
    "defensive_playmaking",
    "deflections",
    "charges_drawn",
    "screen_navigation_score",
    "offensive_rebound_rate",
    "defensive_rebound_rate",
    "contested_rebound_rate",
    "rebound_chances",
    "rebound_conversion_pct",
    "boxouts",
    "rebound_distance",
    "average_speed",
    "offensive_speed",
    "defensive_speed",
    "distance_traveled",
    "average_seconds_per_touch",
    "average_dribbles_per_touch",
    "touches_per_75",
    "frontcourt_touches",
    "elbow_touches",
    "post_touches",
    "paint_touches",
    "last_5_games",
    "last_10_games",
    "last_15_games",
    "last_30_games",
    "rolling_75_possessions",
    "rolling_150_possessions",
    "rolling_300_possessions",
    "then_now_delta"
  ]);
  if (!hasEventOrTrackingData && unavailableWithoutTracking.has(key)) return null;

  const games = row.games || 1;
  const teammateFgm = Math.max(row.fgm + row.ast * 1.9, 1);
  const possessionsUsed = row.fga + 0.44 * row.fta + row.tov;
  const off = offensiveRating(row.pts, row.possessions);
  const def = defensiveRating(row.pointsAllowedOnCourt, row.possessions);

  const values: Record<string, number | null> = {
    pts: row.pts / games,
    reb: row.reb / games,
    ast: row.ast / games,
    stl: row.stl / games,
    blk: row.blk / games,
    tov: row.tov / games,
    fgm: row.fgm / games,
    fga: row.fga / games,
    three_pm: row.threePm / games,
    three_pa: row.threePa / games,
    ftm: row.ftm / games,
    fta: row.fta / games,
    fg_pct: percentage(row.fgm, row.fga),
    three_pct: percentage(row.threePm, row.threePa),
    ft_pct: percentage(row.ftm, row.fta),
    efg_pct: efgPercentage(row.fgm, row.threePm, row.fga),
    ts_pct: trueShootingPercentage(row.pts, row.fga, row.fta),
    points_per_shot: safeDiv(row.pts, row.fga),
    points_per_possession: safeDiv(row.pts, row.possessions),
    usage_rate: usageRate(row.fga, row.fta, row.tov, row.teamPossessions),
    assist_rate: assistRate(row.ast, teammateFgm),
    turnover_rate: turnoverRate(row.tov, possessionsUsed),
    off_rating: off,
    def_rating: def,
    net_rating: netRatingFormula(off, def),
    pace: paceEstimate(row.teamPossessions, row.teamPossessions * 0.99, row.minutes),
    expected_fg_pct: row.expectedFgPct,
    expected_points_per_shot: safeDiv(row.expectedPoints, row.fga),
    shot_quality: shotQuality(safeDiv(row.expectedPoints, row.fga) ?? 0),
    actual_minus_expected_fg: (percentage(row.fgm, row.fga) ?? 0) - row.expectedFgPct,
    actual_minus_expected_points: row.actualMinusExpectedPoints,
    rim_shot_quality: 1.25 + row.player.skill * 0.08,
    three_point_shot_quality: 1.03 + row.player.skill * 0.07,
    midrange_shot_quality: 0.82 + row.player.skill * 0.05,
    clutch_shot_quality: 0.96 + row.player.skill * 0.09,
    rim_frequency: rimFrequency(row.rimAttempts, row.fga),
    short_midrange_frequency: safeDiv(row.shortMidAttempts, row.fga),
    long_midrange_frequency: safeDiv(row.longMidAttempts, row.fga),
    corner_three_frequency: safeDiv(row.cornerThreeAttempts, row.fga),
    above_break_three_frequency: safeDiv(row.aboveBreakThreeAttempts, row.fga),
    paint_touch_frequency: safeDiv(row.paintTouches, row.touches),
    assisted_rim_frequency: safeDiv(row.rimAttempts - row.unassistedRimAttempts, row.rimAttempts),
    unassisted_rim_frequency: safeDiv(row.unassistedRimAttempts, row.rimAttempts),
    pull_up_frequency: safeDiv(row.pullUpAttempts, row.fga),
    catch_and_shoot_frequency: safeDiv(row.catchAndShootAttempts, row.fga),
    self_created_shot_rate: safeDiv(row.fga - row.assistedAttempts, row.fga),
    assisted_shot_rate: safeDiv(row.assistedAttempts, row.fga),
    drives_per_75: per75(row.drives, row.possessions),
    paint_touches_per_75: per75(row.paintTouches, row.possessions),
    rim_pressure_score: (per75(row.drives, row.possessions) ?? 0) * 0.55 + (safeDiv(row.rimAttempts, row.fga) ?? 0) * 42 + (row.fta / games) * 0.7,
    advantage_creation_rate: safeDiv(row.drives + row.potentialAssists + row.paintTouches, row.touches),
    potential_assists: row.potentialAssists / games,
    secondary_assists: row.secondaryAssists / games,
    passes_per_touch: safeDiv(row.ast * 7.2 + row.potentialAssists, row.touches),
    points_created_by_assist: (row.ast * 2.35) / games,
    transition_ppp: 1.02 + row.player.skill * 0.13 + safeDiv(row.rimAttempts, row.fga)! * 0.18,
    halfcourt_ppp: 0.91 + row.player.skill * 0.12,
    pnr_handler_ppp: 0.85 + row.player.skill * 0.2 + (row.player.position === "PG" ? 0.08 : 0),
    pnr_roll_man_ppp: 0.94 + row.player.skill * 0.13 + (row.player.position === "C" ? 0.12 : 0),
    isolation_ppp: 0.82 + row.player.skill * 0.24,
    post_up_ppp: 0.86 + row.player.skill * 0.12 + (row.player.position === "C" || row.player.position === "PF" ? 0.08 : 0),
    handoff_ppp: 0.93 + row.player.skill * 0.14,
    cut_ppp: 1.08 + row.player.skill * 0.1,
    off_screen_ppp: 0.92 + row.player.skill * 0.16,
    spot_up_ppp: 0.98 + row.player.skill * 0.14 + safeDiv(row.threePa, row.fga)! * 0.15,
    putback_ppp: 1.04 + safeDiv(row.oreb, row.reb)! * 0.25,
    opponent_expected_fg_pct: row.opponentExpectedFgPct,
    opponent_actual_minus_expected_fg: row.opponentActualMinusExpectedFg,
    rim_deterrence: row.rimContests / games + (row.player.position === "C" ? 4 : 0),
    rim_protection_value: (row.rimContests / games) * 0.42 + row.blk / games * 0.9,
    contest_rate: safeDiv(row.shotContests, row.possessions),
    closeout_value: (row.shotContests / games) * 0.16 - row.opponentActualMinusExpectedFg * 20,
    matchup_difficulty: 55 + row.player.skill * 22 + row.minutes / games * 0.45,
    defensive_playmaking: (row.stl + row.blk + row.deflections + row.chargesDrawn) / games,
    deflections: row.deflections / games,
    stocks: (row.stl + row.blk) / games,
    charges_drawn: row.chargesDrawn / games,
    screen_navigation_score: 50 + row.player.skill * 18 + (row.player.position === "PG" || row.player.position === "SG" ? 7 : 0),
    offensive_rebound_rate: safeDiv(row.oreb, row.reboundChances),
    defensive_rebound_rate: safeDiv(row.dreb, row.reboundChances),
    contested_rebound_rate: safeDiv(row.contestedRebounds, row.reb),
    rebound_chances: row.reboundChances / games,
    rebound_conversion_pct: reboundConversion(row.reb, row.reboundChances),
    boxouts: (row.reb * 0.52) / games,
    rebound_distance: 5.4 + (row.player.position === "PG" ? 2.5 : 0) + row.player.skill * 0.7,
    average_speed: 4.2 + (row.player.position === "PG" ? 0.45 : 0) + row.player.skill * 0.24,
    offensive_speed: 4.3 + row.player.skill * 0.28,
    defensive_speed: 4.0 + row.player.skill * 0.22,
    distance_traveled: (row.minutes / games) * (0.18 + row.player.skill * 0.01),
    average_seconds_per_touch: safeDiv(row.minutes * 60, row.touches),
    average_dribbles_per_touch: row.player.position === "PG" ? 3.8 + row.player.skill : 1.5 + row.player.skill * 0.8,
    touches_per_75: per75(row.touches, row.possessions),
    frontcourt_touches: (row.touches * 0.78) / games,
    elbow_touches: (row.touches * (row.player.position === "C" ? 0.12 : 0.05)) / games,
    post_touches: (row.touches * (row.player.position === "C" || row.player.position === "PF" ? 0.09 : 0.02)) / games,
    paint_touches: row.paintTouches / games,
    last_5_games: row.recentGameScores.slice(-5).reduce((sum, game) => sum + game.pts, 0) / Math.max(row.recentGameScores.slice(-5).length, 1),
    last_10_games: row.recentGameScores.slice(-10).reduce((sum, game) => sum + game.pts, 0) / Math.max(row.recentGameScores.slice(-10).length, 1),
    last_15_games: row.recentGameScores.slice(-15).reduce((sum, game) => sum + game.pts, 0) / Math.max(row.recentGameScores.slice(-15).length, 1),
    last_30_games: row.pts / games,
    rolling_75_possessions: row.pts / games + row.player.skill * 2.2,
    rolling_150_possessions: row.pts / games + row.player.skill * 1.6,
    rolling_300_possessions: row.pts / games + row.player.skill * 1.1,
    then_now_delta: (row.recentGameScores.slice(-5).reduce((sum, game) => sum + game.pts, 0) / Math.max(row.recentGameScores.slice(-5).length, 1)) - row.pts / games
  };

  return values[key] ?? null;
}

export function calculateTeamMetric(key: string, row: TeamSeasonAggregate): number | null {
  const hasShotEventData = row.expectedPoints > 0 || row.rimFrequency > 0;
  if (!hasShotEventData && ["shot_quality", "expected_points_per_shot", "rim_frequency"].includes(key)) return null;
  const games = row.games || 1;
  const off = offensiveRating(row.pts, row.possessions);
  const def = defensiveRating(row.ptsAllowed, row.possessions);
  const values: Record<string, number | null> = {
    pts: row.pts / games,
    reb: row.reb / games,
    ast: row.ast / games,
    stl: row.stl / games,
    blk: row.blk / games,
    tov: row.tov / games,
    fgm: row.fgm / games,
    fga: row.fga / games,
    three_pm: row.threePm / games,
    three_pa: row.threePa / games,
    ftm: row.ftm / games,
    fta: row.fta / games,
    fg_pct: percentage(row.fgm, row.fga),
    three_pct: percentage(row.threePm, row.threePa),
    ft_pct: percentage(row.ftm, row.fta),
    efg_pct: efgPercentage(row.fgm, row.threePm, row.fga),
    ts_pct: trueShootingPercentage(row.pts, row.fga, row.fta),
    off_rating: off,
    def_rating: def,
    net_rating: netRatingFormula(off, def),
    pace: row.pace,
    shot_quality: row.shotQuality,
    expected_points_per_shot: safeDiv(row.expectedPoints, row.fga),
    rim_frequency: row.rimFrequency,
    above_break_three_frequency: row.threeFrequency * 0.72,
    corner_three_frequency: row.threeFrequency * 0.28,
    points_per_possession: safeDiv(row.pts, row.possessions)
  };
  return values[key] ?? null;
}
