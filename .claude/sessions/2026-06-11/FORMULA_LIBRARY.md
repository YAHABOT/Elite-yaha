# Health/Fitness Derived Metrics — Formula Library
*Compiled by Research Agent — 2026-06-11*

20 formulas · 14 simple · 6 cascading · 6 categories

---

## Dependency Map (Cascading Chains)

```
BMR (1)
  └─ TDEE (2)
       └─ Net Caloric Balance (4)

Body Fat % (8)
  └─ Lean Body Mass (9) [optional path]
  └─ Fat Mass (10)

Session Training Load (16)
  └─ ACWR (19)
  └─ Training Monotony (20)

Sleep Efficiency (11) ──┐
HRV Readiness (17) ─────┤─── Recovery Composite (18)
RHR Deviation (raw) ────┘
```

---

## NUTRITION

### 1. Basal Metabolic Rate (BMR) — Simple
Calories burned at complete rest — metabolic floor before activity or food.
- **Formula (male):** `(10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + 5`
- **Formula (female):** `(10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) - 161`
- **Inputs:** `weight_kg`, `height_cm`, `age_years`
- **Unit:** kcal/day
- **Source:** Mifflin-St Jeor (1990)

### 2. Total Daily Energy Expenditure (TDEE) — Cascading → BMR
Total calories burned including all activity.
- **Formula:** `BMR * activity_factor` (1.2 sedentary → 1.9 very active)
- **Inputs:** `BMR` (derived), `activity_factor`
- **Unit:** kcal/day

### 3. Thermic Effect of Food (TEF) — Simple
Calories spent digesting food — protein costs most to metabolize.
- **Formula:** `(protein_g * 4 * 0.30) + (carbs_g * 4 * 0.08) + (fat_g * 9 * 0.03)`
- **Inputs:** `protein_g`, `carbs_g`, `fat_g`
- **Unit:** kcal
- **Notes:** 30% of protein calories, 8% of carb calories, 3% of fat calories

### 4. Net Caloric Balance — Cascading → TDEE → BMR
Daily caloric surplus (+) or deficit (−).
- **Formula:** `calories_consumed - TDEE`
- **Inputs:** `calories_consumed`, `TDEE` (derived)
- **Unit:** kcal/day

### 5. Protein Adequacy Ratio — Simple
How protein intake aligns with evidence-based minimums.
- **Formula:** `protein_g / weight_kg`
- **Inputs:** `protein_g`, `weight_kg`
- **Unit:** g/kg
- **Bands:** <0.8 below RDA · 1.2–1.6 active · 1.6–2.4 muscle growth

### 6. Macro Caloric Distribution — Simple
Fraction of total calories from each macro.
- **Formula:** `(protein_g * 4) / total_calories * 100` (repeat for carbs × 4, fat × 9)
- **Inputs:** `protein_g`, `carbs_g`, `fat_g`, `total_calories`
- **Unit:** %

---

## BODY COMPOSITION

### 7. Body Mass Index (BMI) — Simple
Coarse height-to-weight ratio proxy.
- **Formula:** `weight_kg / (height_m * height_m)`
- **Inputs:** `weight_kg`, `height_m`
- **Unit:** kg/m²
- **Bands:** <18.5 underweight · 18.5–24.9 normal · 25–29.9 overweight · ≥30 obese

### 8. Body Fat % (US Navy Method) — Simple
Estimates body fat from circumference measurements (±3–4% vs DEXA).
- **Formula (male):** `495 / (1.0324 - 0.19077 * log10(waist_cm - neck_cm) + 0.15456 * log10(height_cm)) - 450`
- **Formula (female):** `495 / (1.29579 - 0.35004 * log10(waist_cm + hip_cm - neck_cm) + 0.22100 * log10(height_cm)) - 450`
- **Inputs:** `waist_cm`, `neck_cm`, `height_cm` (+ `hip_cm` for female)
- **Unit:** %

### 9. Lean Body Mass (LBM) — Cascading → Body Fat %
Total weight minus fat mass.
- **Formula:** `weight_kg * (1 - body_fat_pct / 100)`
- **Inputs:** `weight_kg`, `body_fat_pct` (derived)
- **Unit:** kg

### 10. Fat Mass — Cascading → Body Fat %
Absolute kilograms of body fat.
- **Formula:** `weight_kg * (body_fat_pct / 100)`
- **Inputs:** `weight_kg`, `body_fat_pct` (derived)
- **Unit:** kg

---

## SLEEP

### 11. Sleep Efficiency — Simple
Primary clinical marker for insomnia — fraction of time in bed actually asleep.
- **Formula:** `(total_sleep_time_hrs / time_in_bed_hrs) * 100`
- **Inputs:** `total_sleep_time_hrs`, `time_in_bed_hrs`
- **Unit:** %
- **Bands:** ≥85% healthy · ≥90% excellent · <75% clinically poor (CBT-I threshold)

### 12. Sleep Debt (7-Day Rolling) — Simple
Cumulative sleep shortfall vs. target over 7 days.
- **Formula:** `max(0, (sleep_target_hrs * 7) - sum_sleep_last_7_days_hrs)`
- **Inputs:** `sleep_target_hrs`, rolling 7-day sleep sum
- **Unit:** hours

### 13. Sleep Consistency Score — Simple
Regularity of sleep/wake timing — irregular schedules harm quality even when duration is adequate.
- **Formula:** `100 - (stddev(bedtime_hrs_7d) * 10 + stddev(waketime_hrs_7d) * 10)`
- **Inputs:** 7-day arrays of `bedtime_hrs`, `waketime_hrs`
- **Unit:** score 0–100

---

## FITNESS

### 14. VO2 Max Estimate (Uth-Sørensen Method) — Simple
Aerobic capacity estimate from resting HR — no treadmill required.
- **Formula:** `15 * (max_heart_rate / resting_heart_rate)`
  - `max_heart_rate` estimate: `208 - (0.7 * age_years)` (Tanaka formula)
- **Inputs:** `resting_heart_rate`, `age_years`
- **Unit:** mL/kg/min

### 15. Heart Rate Recovery (HRR-60) — Simple
BPM drop in 60s after peak exercise — validated cardiovascular fitness marker.
- **Formula:** `peak_hr - hr_at_60s_post_exercise`
- **Inputs:** `peak_hr`, `hr_at_60s_post_exercise`
- **Unit:** bpm
- **Bands:** ≥18 normal · ≥25 good · <12 elevated cardiovascular risk

### 16. Session Training Load (sRPE — Foster Method) — Simple
Internal training load combining perceived effort × duration.
- **Formula:** `rpe_score * workout_duration_min`
- **Inputs:** `rpe_score` (CR-10 scale 0–10), `workout_duration_min`
- **Unit:** AU (arbitrary units)
- **Source:** Foster et al. (2001)

---

## RECOVERY

### 17. HRV Readiness Score — Simple
Today's HRV vs. personal baseline — >1 = better than usual, <1 = suppressed.
- **Formula:** `ln(hrv_rmssd_today) / ln(hrv_rmssd_7day_avg)`
- **Inputs:** `hrv_rmssd_today`, `hrv_rmssd_7day_avg`
- **Unit:** ratio (0.7–1.3 typical)
- **Bands:** >1.05 green · 0.95–1.05 yellow · <0.95 red

### 18. Recovery Composite Score (Oura-Inspired) — Cascading → Sleep Efficiency + HRV Readiness
Weighted aggregate of three validated recovery signals.
- **Formula:** `(hrv_readiness * 0.40) + (sleep_efficiency_pct * 0.35) + (rhr_deviation_score * 0.25)`
  - `rhr_deviation_score = 100 - clamp((resting_hr_today - resting_hr_baseline) * 10, 0, 100)`
- **Inputs:** `hrv_rmssd_today`, `hrv_rmssd_7day_avg`, `total_sleep_time_hrs`, `time_in_bed_hrs`, `resting_hr_today`, `resting_hr_baseline`
- **Unit:** score 0–100
- **Cascades from:** #11 Sleep Efficiency, #17 HRV Readiness

---

## TRAINING LOAD

### 19. Acute:Chronic Workload Ratio (ACWR) — Cascading → Session Training Load
Injury risk indicator — is this week's load spiked vs. the 4-week baseline?
- **Formula:** `acute_load / chronic_load`
  - `acute_load` = sum session loads last 7 days
  - `chronic_load` = avg weekly session load last 28 days
- **Inputs:** session training load entries (last 28 days)
- **Unit:** ratio
- **Bands:** 0.8–1.3 sweet spot · >1.5 spike risk · <0.5 detraining risk
- **Cascades from:** #16 Session Training Load

### 20. Training Monotony — Cascading → Session Training Load
Day-to-day variety in training stress — excessive uniformity + high load = overtraining predictor.
- **Formula:** `mean(session_loads_7d) / stddev(session_loads_7d)`
- **Inputs:** daily session training load (last 7 days, 0 on rest days)
- **Unit:** ratio
- **Bands:** <1.5 healthy variation · >2.0 excessive monotony risk
- **Cascades from:** #16 Session Training Load

---

## Notes
- WHOOP Strain and Garmin Body Battery exact weights are proprietary — #17, #18, #19, #20 are open-science equivalents
- BMI caveat: does not distinguish muscle from fat — flag in UI
- ACWR has methodological debate (2019–2022) but remains the most practical single injury-risk metric without lab equipment
