# UK MVP model methodology

This document describes the calculation used by `uk-retirement-simulator.html`.
The model is deliberately small and transparent: it is a deterministic annual
projection for a fictional two-person household, not a forecast of what is
likely to happen to any particular household.

## Annual calculation sequence

For each projection year, the simulator:

1. Advances each person's age by the number of years since the projection start.
2. Counts salary and the configured annual pension contribution only while that
   person's age is below their retirement age. Salary is shown as income; it is
   not automatically added to a cash or pension balance.
3. Adds each person's contribution to their private pension pot, then applies
   that person's configured annual private-pension growth rate to the resulting
   balance. Configured savings and cash interest are applied to their balances.
4. Adds the configured State Pension amount for each person whose age has
   reached their configured State Pension start age. These are user-entered
   assumptions, not a live lookup of current policy or entitlement.
5. Increases essential and preferred spending from the starting annual amounts
   by the configured inflation rate for each elapsed year.
6. Uses income and then draws from private pensions, savings and cash in the
   visible household drawdown order until preferred spending is met or all
   selected balances are exhausted. The projection records essential and
   preferred shortfalls and prevents balances and draws from becoming negative.
7. Records nominal pounds and a “today’s money” view by dividing projected
   values by the same cumulative inflation factor.

The annual table is the audit trail for these steps. The displayed sample
scenario is fictional and illustrative only. It is not presented as
statistically typical. Every material input is editable in the page and can be
saved locally or exported as JSON.

## Plain-language assumptions

- **Salary:** the annual gross salary entered for each person. It stops when
  the person's configured retirement age is reached; the model does not apply
  tax, National Insurance or salary growth.
- **Contributions:** the annual private-pension contribution entered for each
  person. It is paid while salary is active and is added to the private pension
  before that year's growth is calculated.
- **Growth and interest:** fixed annual percentage assumptions applied to the
  relevant opening balance (with private-pension contributions included before
  private-pension growth). They are deterministic rates, not forecasts or
  guaranteed returns.
- **State Pension income:** a fixed annual amount entered for each person,
  starting at that person's configured age. The model does not check National
  Insurance records, eligibility or current government rates.
- **Drawdown:** the amount taken from the configured private-pension, savings
  and cash balances to fund the modelled spending. The user chooses the order;
  the model does not optimise it or model tax consequences.
- **Spending:** essential spending is the minimum target and preferred spending
  is the higher target. Available salary and State Pension income plus ordered
  drawdown fund spending; any unfunded amount is reported as a shortfall.
- **Inflation:** one fixed annual percentage increases both spending targets
  from the first projection year. The “today’s money” display removes this
  same assumed inflation and does not represent a separate economic forecast.

## Deliberate exclusions and limits

The MVP intentionally excludes:

- UK income tax, pension tax treatment and tax-free cash;
- National Insurance and contribution-credit calculations;
- Pension Credit and other means-tested or state benefits;
- annuities and other guaranteed-income products;
- defined-benefit pensions;
- multiple private pension pots or pot-specific rules;
- property, mortgages and housing transactions;
- investments outside private pensions, savings and cash;
- detailed contribution limits, allowances and other pension-law rules;
- stochastic returns, volatility, sequence-of-returns risk and fees;
- mortality, life expectancy, death, survivor or other household behaviour;
- financial, tax, legal or pension advice, suitability assessment or a
  recommendation to act.

These omissions mean that a funded result is only an estimate under the
editable assumptions shown. It is not evidence that a household can safely
retire or that a particular product, contribution or drawdown strategy is
appropriate. Users should obtain up-to-date information and regulated advice
where appropriate.
