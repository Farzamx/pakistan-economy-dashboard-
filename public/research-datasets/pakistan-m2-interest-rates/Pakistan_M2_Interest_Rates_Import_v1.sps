* PEIC Pakistan Money Supply and Interest Rates dataset VERSION 1 (2026-11-20), FY1995-96 to FY2024-25: import into IBM SPSS Statistics.
* 1. Edit the folder in the FILE subcommand to where you saved the CSV.  2. Run all (Ctrl+A, then the Run button).
* Blank cells in the CSV become system-missing. Nothing is interpolated.

GET DATA
  /TYPE=TXT
  /FILE="C:\path\to\Pakistan_M2_Interest_Rates_Combined_v1.csv"
  /ENCODING='UTF8'
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    year F4.0
    fiscal_year A12
    m2_growth_pct F8.2
    sbp_policy_rate_pct F8.2
    cpi_inflation_pct F8.2
    real_policy_rate_pct F8.2.
CACHE.
EXECUTE.
DATASET NAME M2_InterestRates WINDOW=FRONT.

VARIABLE LABELS
  year 'Fiscal year ends in (calendar year)'
  fiscal_year 'Fiscal year (1 July - 30 June)'
  m2_growth_pct 'M2 growth, fiscal year (%), from end-June stocks; FY2020 blank'
  sbp_policy_rate_pct 'SBP policy rate, fiscal-year time-weighted average (%)'
  cpi_inflation_pct 'CPI inflation, fiscal-year average (%), PBS'
  real_policy_rate_pct 'Approx. ex-post real policy rate = policy rate - CPI inflation (%)'.

* Example: correlations and a regression of the policy rate on M2 growth.
* CORRELATIONS /VARIABLES=m2_growth_pct sbp_policy_rate_pct cpi_inflation_pct real_policy_rate_pct /MISSING=PAIRWISE.
* REGRESSION /DEPENDENT sbp_policy_rate_pct /METHOD=ENTER m2_growth_pct.
