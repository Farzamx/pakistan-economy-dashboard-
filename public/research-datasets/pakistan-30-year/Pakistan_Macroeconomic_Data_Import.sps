* PEIC Pakistan macroeconomic dataset, FY1995-96 to FY2024-25: import into IBM SPSS Statistics.
* 1. Edit the folder in the FILE subcommand to where you saved the CSV.  2. Run all (Ctrl+A, then the Run button).
* Blank cells in the CSV become system-missing. Nothing is interpolated.

GET DATA
  /TYPE=TXT
  /FILE="C:\path\to\Pakistan_Macroeconomic_Data_30_Years.csv"
  /ENCODING='UTF8'
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    year F4.0
    fiscal_year A12
    cpi_inflation_pct_fy_weo F22.6
    cpi_inflation_pct_cy_wb F22.6
    food_inflation_pct_fy_pbs_base2000_01 F22.6
    food_inflation_pct_fy_pbs_base2007_08 F22.6
    food_inflation_pct_fy_pbs_base2015_16 F22.6
    discount_rate_pct_fy_end_ifs F22.6
    policy_target_rate_pct_fy_end_sbp F22.6
    tbill_rate_pct_cy_avg_ifs F22.6
    lending_rate_pct_cy_wb F22.6
    deposit_rate_pct_cy_wb F22.6
    real_interest_rate_pct_cy_wb F22.6
    broad_money_m2_pkr_cy_end_wb F22.6
    broad_money_m2_pkr_mn_fy_end_june_sbp F22.6
    broad_money_growth_pct_fy_sbp F22.6
    broad_money_growth_pct_cy_end_wb F22.6
    exchange_rate_pkr_per_usd_cy_avg_wb F22.6
    exchange_rate_pkr_per_usd_cy_end_ifs F22.6
    gdp_current_usd_fy_wb F22.6
    gdp_current_pkr_fy_wb F22.6
    gdp_current_pkr_bn_fy_weo F22.6
    gdp_current_usd_bn_fy_weo F22.6
    real_gdp_growth_pct_fy_wb F22.6
    real_gdp_growth_pct_fy_weo F22.6
    gdp_per_capita_current_usd_fy_wb F22.6
    gdp_per_capita_growth_pct_fy_wb F22.6
    gfcf_pct_gdp_fy_wb F22.6
    gross_domestic_savings_pct_gdp_fy_wb F22.6
    unemployment_rate_pct_cy_ilo_wb F22.6
    unemployment_rate_pct_fy_weo F22.6
    labour_force_participation_pct_cy_ilo_wb F22.6
    population_total_midyear_wb F22.6
    population_growth_pct_midyear_wb F22.6
    population_total_mn_cy_pbs F22.6
    govt_revenue_pct_gdp_fy_weo F22.6
    govt_expenditure_pct_gdp_fy_weo F22.6
    fiscal_balance_pct_gdp_fy_weo F22.6
    primary_balance_pct_gdp_fy_weo F22.6
    public_debt_gross_pct_gdp_fy_weo F22.6
    public_debt_net_pct_gdp_fy_weo F22.6
    tax_revenue_consol_pkr_mn_fy_mof F22.6
    revenue_consol_pkr_mn_fy_mof F22.6
    expenditure_consol_pkr_mn_fy_mof F22.6
    interest_payments_consol_pkr_mn_fy_mof F22.6
    development_exp_consol_pkr_mn_fy_mof F22.6
    exports_goods_services_usd_fy_wb F22.6
    imports_goods_services_usd_fy_wb F22.6
    trade_balance_goods_services_usd_fy_wb F22.6
    current_account_balance_usd_cy_wb F22.6
    current_account_balance_pct_gdp_cy_wb F22.6
    current_account_balance_usd_bn_fy_weo F22.6
    current_account_balance_pct_gdp_fy_weo F22.6
    current_account_balance_pct_gdp_fy_mof F22.6
    fdi_net_inflows_usd_cy_wb F22.6
    reserves_total_incl_gold_usd_cy_end_wb F22.6
    reserves_sbp_total_usd_mn_fy_end_june_sbp F22.6
    workers_remittances_usd_cy_wb F22.6
    workers_remittances_pct_gdp_fy_mof F22.6
    poverty_headcount_national_pct_wb F22.6
    poverty_headcount_215usd_pct_wb F22.6
    agriculture_value_added_pct_gdp_fy_wb F22.6
    industry_value_added_pct_gdp_fy_wb F22.6
    services_value_added_pct_gdp_fy_wb F22.6
    energy_imports_net_pct_energy_use_cy_wb F22.6
    brent_crude_usd_per_bbl_cy_avg_imf F22.6
  .
CACHE.
EXECUTE.

VARIABLE LABELS
  year "Year in which the fiscal year ends (1996 = FY1995-96); calendar year for _cy_ variables"
  fiscal_year "Fiscal year label (July-June)"
  cpi_inflation_pct_fy_weo "CPI inflation, average consumer prices [% change; Fiscal year (July-June), labelled by the year it ends]"
  cpi_inflation_pct_cy_wb "CPI inflation, calendar year (World Bank) [% change; Calendar year (January-December)]"
  food_inflation_pct_fy_pbs_base2000_01 "Food CPI inflation, PBS base 2000-01 [% change; Fiscal year (July-June), labelled by the year it ends]"
  food_inflation_pct_fy_pbs_base2007_08 "Food CPI inflation, PBS base 2007-08 [% change; Fiscal year (July-June), labelled by the year it ends]"
  food_inflation_pct_fy_pbs_base2015_16 "Food CPI inflation, PBS base 2015-16 [% change; Fiscal year (July-June), labelled by the year it ends]"
  discount_rate_pct_fy_end_ifs "SBP discount rate at 30 June (IMF IFS) [% per annum; Value on 30 June (end of fiscal year)]"
  policy_target_rate_pct_fy_end_sbp "SBP policy (target) rate at 30 June [% per annum; Value on 30 June (end of fiscal year)]"
  tbill_rate_pct_cy_avg_ifs "Treasury bill rate (IMF IFS) [% per annum; Calendar year (January-December) average]"
  lending_rate_pct_cy_wb "Lending interest rate (World Bank) [% per annum; Calendar year (January-December)]"
  deposit_rate_pct_cy_wb "Deposit interest rate (World Bank) [% per annum; Calendar year (January-December)]"
  real_interest_rate_pct_cy_wb "Real interest rate (World Bank) [%; Calendar year (January-December)]"
  broad_money_m2_pkr_cy_end_wb "Broad money, end of calendar year (IMF/World Bank banking-survey basis) [PKR (current); Calendar year (January-December) end (31 December)]"
  broad_money_m2_pkr_mn_fy_end_june_sbp "Broad money (M2), SBP, end of June [PKR million; Value on 30 June (end of fiscal year)]"
  broad_money_growth_pct_fy_sbp "Broad money (M2) growth, SBP, fiscal year [% change; Fiscal year (July-June), labelled by the year it ends]"
  broad_money_growth_pct_cy_end_wb "Broad money growth, end of calendar year [% change; Calendar year (January-December)]"
  exchange_rate_pkr_per_usd_cy_avg_wb "Official exchange rate, calendar-year average [PKR per US$; Calendar year (January-December) average]"
  exchange_rate_pkr_per_usd_cy_end_ifs "Exchange rate, end of calendar year (IMF IFS) [PKR per US$; Calendar year (January-December) end (31 December)]"
  gdp_current_usd_fy_wb "GDP, current US$ [US$; Fiscal year (July-June), labelled by the year it ends]"
  gdp_current_pkr_fy_wb "GDP, current PKR [PKR (current); Fiscal year (July-June), labelled by the year it ends]"
  gdp_current_pkr_bn_fy_weo "GDP, current PKR billion (IMF WEO, linked history) [PKR billion; Fiscal year (July-June), labelled by the year it ends]"
  gdp_current_usd_bn_fy_weo "GDP, current US$ billion (IMF WEO, linked history) [US$ billion; Fiscal year (July-June), labelled by the year it ends]"
  real_gdp_growth_pct_fy_wb "Real GDP growth (World Bank) [% change; Fiscal year (July-June), labelled by the year it ends]"
  real_gdp_growth_pct_fy_weo "Real GDP growth (IMF WEO) [% change; Fiscal year (July-June), labelled by the year it ends]"
  gdp_per_capita_current_usd_fy_wb "GDP per capita, current US$ [US$; Fiscal year (July-June), labelled by the year it ends]"
  gdp_per_capita_growth_pct_fy_wb "GDP per capita growth [% change; Fiscal year (July-June), labelled by the year it ends]"
  gfcf_pct_gdp_fy_wb "Gross fixed capital formation, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  gross_domestic_savings_pct_gdp_fy_wb "Gross domestic savings, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  unemployment_rate_pct_cy_ilo_wb "Unemployment rate, ILO modelled estimate (World Bank) [% of labour force; Calendar year (January-December)]"
  unemployment_rate_pct_fy_weo "Unemployment rate (IMF WEO) [% of labour force; Fiscal year (July-June), labelled by the year it ends]"
  labour_force_participation_pct_cy_ilo_wb "Labour force participation rate, ILO modelled (World Bank) [% of population 15+; Calendar year (January-December)]"
  population_total_midyear_wb "Population, total (World Bank) [persons; Mid-year (30 June)]"
  population_growth_pct_midyear_wb "Population growth [% change; Mid-year to mid-year]"
  population_total_mn_cy_pbs "Population, total (Pakistan Bureau of Statistics) [million; Calendar year (January-December) (PBS annual estimate)]"
  govt_revenue_pct_gdp_fy_weo "General government revenue, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  govt_expenditure_pct_gdp_fy_weo "General government expenditure, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  fiscal_balance_pct_gdp_fy_weo "General government net lending/borrowing (overall balance), % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  primary_balance_pct_gdp_fy_weo "General government primary balance, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  public_debt_gross_pct_gdp_fy_weo "General government gross debt, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  public_debt_net_pct_gdp_fy_weo "General government net debt, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  tax_revenue_consol_pkr_mn_fy_mof "Tax revenue, consolidated federal + provincial [PKR million; Fiscal year (July-June), labelled by the year it ends]"
  revenue_consol_pkr_mn_fy_mof "Total revenue, consolidated federal + provincial [PKR million; Fiscal year (July-June), labelled by the year it ends]"
  expenditure_consol_pkr_mn_fy_mof "Total expenditure, consolidated federal + provincial [PKR million; Fiscal year (July-June), labelled by the year it ends]"
  interest_payments_consol_pkr_mn_fy_mof "Mark-up (interest) payments, consolidated federal + provincial [PKR million; Fiscal year (July-June), labelled by the year it ends]"
  development_exp_consol_pkr_mn_fy_mof "Development expenditure, consolidated federal + provincial [PKR million; Fiscal year (July-June), labelled by the year it ends]"
  exports_goods_services_usd_fy_wb "Exports of goods and services, current US$ [US$; Fiscal year (July-June), labelled by the year it ends]"
  imports_goods_services_usd_fy_wb "Imports of goods and services, current US$ [US$; Fiscal year (July-June), labelled by the year it ends]"
  trade_balance_goods_services_usd_fy_wb "External balance on goods and services, current US$ [US$; Fiscal year (July-June), labelled by the year it ends]"
  current_account_balance_usd_cy_wb "Current account balance, current US$ (World Bank) [US$; Calendar year (January-December)]"
  current_account_balance_pct_gdp_cy_wb "Current account balance, % of GDP (World Bank) [% of GDP; Calendar year (January-December)]"
  current_account_balance_usd_bn_fy_weo "Current account balance, US$ billion (IMF WEO) [US$ billion; Fiscal year (July-June), labelled by the year it ends]"
  current_account_balance_pct_gdp_fy_weo "Current account balance, % of GDP (IMF WEO) [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  current_account_balance_pct_gdp_fy_mof "Current account balance, % of GDP (official, fiscal year) [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  fdi_net_inflows_usd_cy_wb "Foreign direct investment, net inflows, current US$ [US$; Calendar year (January-December)]"
  reserves_total_incl_gold_usd_cy_end_wb "Total reserves incl. gold, end of calendar year [US$; Calendar year (January-December) end (31 December)]"
  reserves_sbp_total_usd_mn_fy_end_june_sbp "Foreign exchange reserves held and controlled by SBP, total (cash + gold), last day of June [US$ million; Value on 30 June (end of fiscal year)]"
  workers_remittances_usd_cy_wb "Workers' remittances received, current US$ [US$; Calendar year (January-December)]"
  workers_remittances_pct_gdp_fy_mof "Workers' remittances, % of GDP (official, fiscal year) [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  poverty_headcount_national_pct_wb "Poverty headcount ratio at national poverty lines [% of population; Household-survey year (as labelled by the World Bank)]"
  poverty_headcount_215usd_pct_wb "Poverty headcount ratio at US$2.15 a day (2017 PPP) [% of population; Household-survey year (as labelled by the World Bank)]"
  agriculture_value_added_pct_gdp_fy_wb "Agriculture, forestry and fishing value added, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  industry_value_added_pct_gdp_fy_wb "Industry (incl. construction) value added, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  services_value_added_pct_gdp_fy_wb "Services value added, % of GDP [% of GDP; Fiscal year (July-June), labelled by the year it ends]"
  energy_imports_net_pct_energy_use_cy_wb "Energy imports, net, % of energy use [% of energy use; Calendar year (January-December)]"
  brent_crude_usd_per_bbl_cy_avg_imf "Brent crude oil price (world), annual average [US$ per barrel; Calendar year (January-December) average]"
.

VARIABLE LEVEL year (SCALE).
VARIABLE LEVEL cpi_inflation_pct_fy_weo (SCALE).
VARIABLE LEVEL cpi_inflation_pct_cy_wb (SCALE).
VARIABLE LEVEL food_inflation_pct_fy_pbs_base2000_01 (SCALE).
VARIABLE LEVEL food_inflation_pct_fy_pbs_base2007_08 (SCALE).
VARIABLE LEVEL food_inflation_pct_fy_pbs_base2015_16 (SCALE).
VARIABLE LEVEL discount_rate_pct_fy_end_ifs (SCALE).
VARIABLE LEVEL policy_target_rate_pct_fy_end_sbp (SCALE).
VARIABLE LEVEL tbill_rate_pct_cy_avg_ifs (SCALE).
VARIABLE LEVEL lending_rate_pct_cy_wb (SCALE).
VARIABLE LEVEL deposit_rate_pct_cy_wb (SCALE).
VARIABLE LEVEL real_interest_rate_pct_cy_wb (SCALE).
VARIABLE LEVEL broad_money_m2_pkr_cy_end_wb (SCALE).
VARIABLE LEVEL broad_money_m2_pkr_mn_fy_end_june_sbp (SCALE).
VARIABLE LEVEL broad_money_growth_pct_fy_sbp (SCALE).
VARIABLE LEVEL broad_money_growth_pct_cy_end_wb (SCALE).
VARIABLE LEVEL exchange_rate_pkr_per_usd_cy_avg_wb (SCALE).
VARIABLE LEVEL exchange_rate_pkr_per_usd_cy_end_ifs (SCALE).
VARIABLE LEVEL gdp_current_usd_fy_wb (SCALE).
VARIABLE LEVEL gdp_current_pkr_fy_wb (SCALE).
VARIABLE LEVEL gdp_current_pkr_bn_fy_weo (SCALE).
VARIABLE LEVEL gdp_current_usd_bn_fy_weo (SCALE).
VARIABLE LEVEL real_gdp_growth_pct_fy_wb (SCALE).
VARIABLE LEVEL real_gdp_growth_pct_fy_weo (SCALE).
VARIABLE LEVEL gdp_per_capita_current_usd_fy_wb (SCALE).
VARIABLE LEVEL gdp_per_capita_growth_pct_fy_wb (SCALE).
VARIABLE LEVEL gfcf_pct_gdp_fy_wb (SCALE).
VARIABLE LEVEL gross_domestic_savings_pct_gdp_fy_wb (SCALE).
VARIABLE LEVEL unemployment_rate_pct_cy_ilo_wb (SCALE).
VARIABLE LEVEL unemployment_rate_pct_fy_weo (SCALE).
VARIABLE LEVEL labour_force_participation_pct_cy_ilo_wb (SCALE).
VARIABLE LEVEL population_total_midyear_wb (SCALE).
VARIABLE LEVEL population_growth_pct_midyear_wb (SCALE).
VARIABLE LEVEL population_total_mn_cy_pbs (SCALE).
VARIABLE LEVEL govt_revenue_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL govt_expenditure_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL fiscal_balance_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL primary_balance_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL public_debt_gross_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL public_debt_net_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL tax_revenue_consol_pkr_mn_fy_mof (SCALE).
VARIABLE LEVEL revenue_consol_pkr_mn_fy_mof (SCALE).
VARIABLE LEVEL expenditure_consol_pkr_mn_fy_mof (SCALE).
VARIABLE LEVEL interest_payments_consol_pkr_mn_fy_mof (SCALE).
VARIABLE LEVEL development_exp_consol_pkr_mn_fy_mof (SCALE).
VARIABLE LEVEL exports_goods_services_usd_fy_wb (SCALE).
VARIABLE LEVEL imports_goods_services_usd_fy_wb (SCALE).
VARIABLE LEVEL trade_balance_goods_services_usd_fy_wb (SCALE).
VARIABLE LEVEL current_account_balance_usd_cy_wb (SCALE).
VARIABLE LEVEL current_account_balance_pct_gdp_cy_wb (SCALE).
VARIABLE LEVEL current_account_balance_usd_bn_fy_weo (SCALE).
VARIABLE LEVEL current_account_balance_pct_gdp_fy_weo (SCALE).
VARIABLE LEVEL current_account_balance_pct_gdp_fy_mof (SCALE).
VARIABLE LEVEL fdi_net_inflows_usd_cy_wb (SCALE).
VARIABLE LEVEL reserves_total_incl_gold_usd_cy_end_wb (SCALE).
VARIABLE LEVEL reserves_sbp_total_usd_mn_fy_end_june_sbp (SCALE).
VARIABLE LEVEL workers_remittances_usd_cy_wb (SCALE).
VARIABLE LEVEL workers_remittances_pct_gdp_fy_mof (SCALE).
VARIABLE LEVEL poverty_headcount_national_pct_wb (SCALE).
VARIABLE LEVEL poverty_headcount_215usd_pct_wb (SCALE).
VARIABLE LEVEL agriculture_value_added_pct_gdp_fy_wb (SCALE).
VARIABLE LEVEL industry_value_added_pct_gdp_fy_wb (SCALE).
VARIABLE LEVEL services_value_added_pct_gdp_fy_wb (SCALE).
VARIABLE LEVEL energy_imports_net_pct_energy_use_cy_wb (SCALE).
VARIABLE LEVEL brent_crude_usd_per_bbl_cy_avg_imf (SCALE).

* Check: 30 cases (1996-2025).
FREQUENCIES VARIABLES=year /FORMAT=NOTABLE /STATISTICS=MINIMUM MAXIMUM.
DESCRIPTIVES VARIABLES=ALL /STATISTICS=MEAN STDDEV MIN MAX.
