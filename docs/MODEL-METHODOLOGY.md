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
4. Applies any configured, enabled lump-sum withdrawals for the oldest
   person's current age in that projection year, after growth. A withdrawal
   with its enabled flag turned off is skipped entirely for that year, as if
   it were not in the scenario. The fulfilled amount is one-off spending, not
   income: it is deducted from the selected private-pension, savings or cash
   source but does not count towards funding this year's household spending
   target. A source shortfall is reported on the annual row rather than
   allowing a balance to become negative.
5. Adds the configured State Pension amount for each person whose age has
   reached their configured State Pension start age. These are user-entered
   assumptions, not a live lookup of current policy or entitlement. The
   amount is entered in today's money and is increased by the configured
   inflation rate for each elapsed year since the projection start, the same
   as spending targets in step 6; a person's entered salary is not inflated.
6. Adds each enabled other-income entry whose configured start age (measured
   against the oldest person's age, like a lump sum) has been reached.
   Other income is household-level rather than tied to a specific person,
   is entered in today's money and inflates the same way State Pension does,
   and continues every year once started rather than being one-off like a
   lump sum.
7. Increases essential and preferred spending from the starting annual amounts
   by the configured inflation rate for each elapsed year.
8. Treats household resources as cumulative. Salary, State Pension and other
   income count towards the spending target first; the simulator then draws
   only the remaining gap from private pensions, savings and cash in the
   visible household drawdown order until preferred spending is met or all
   selected balances are exhausted. These income sources are therefore
   alongside private pension drawdown in time, but not an independent second
   spending target. The projection records essential and preferred
   shortfalls and prevents balances and draws from becoming negative.
9. Records nominal pounds and a “today’s money” view by dividing projected
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
- **State Pension income:** an annual amount entered for each person in
  today's money, starting at that person's configured age. It inflates at the
  configured rate from the projection start year, the same as spending
  targets; the model does not check National Insurance records, eligibility
  or current government rates, and does not model the actual UK State Pension
  uprating rules (such as the triple lock) beyond this flat assumed rate.
- **Other income:** a household-level, recurring annual amount entered in
  today's money, starting at a configured age (measured against the oldest
  person, like a lump sum) and inflating the same way State Pension does. For
  income not modelled elsewhere: a defined benefit pension, an annuity,
  rental income and similar. It is not tied to a specific person, is not a
  drawable balance, and does not model any product-specific rules (a DB
  scheme's own revaluation and survivor rules, an annuity's guarantee
  period, property-specific tax) beyond the flat entered amount; it can be
  disabled without deleting it, the same as a lump sum.
- **Drawdown:** the amount taken from the configured private-pension, savings
  and cash balances to fund the modelled spending. The user chooses the order;
  the model does not optimise it or model tax consequences.
- **Spending:** essential spending is the minimum target and preferred spending
  is the higher target. Available salary, State Pension and other income plus
  ordered drawdown cumulatively fund one household spending target; private
  pension is a flexible top-up, not a full withdrawal alongside these income
  sources. Any unfunded amount is reported as a shortfall.
- **Lump-sum withdrawals:** dated one-off amounts entered with an age, source
  and optional description. The simulator fulfils them from the selected source
  after that year's growth. The fulfilled amount is one-off spending, not
  income: it never permits the source balance to go below zero, but it also
  does not count towards funding that year's regular household spending. Each
  withdrawal can be disabled without deleting it, to compare a scenario with
  and without it; a disabled withdrawal is skipped entirely by the projection.
- **Inflation:** one fixed annual percentage, defaulting to 2%, the Bank of
  England's inflation target and a standard long-run planning assumption
  rather than a live rate, a forecast, or a near-term-versus-long-run split.
  It increases both spending targets and entered State Pension amounts from
  the first projection year. Entered salary is not inflated. The “today’s
  money” display removes this same assumed inflation and does not represent a
  separate economic forecast.

## Deliberate exclusions and limits

The MVP intentionally excludes:

- UK income tax, pension tax treatment and tax-free cash;
- National Insurance and contribution-credit calculations;
- Pension Credit and other means-tested or state benefits;
- annuities, defined-benefit pensions and other guaranteed-income products'
  own rules (revaluation, guarantee periods, survivor benefits and similar);
  Other income lets a flat, inflating approximation of one be entered
  manually, with none of those product-specific rules applied;
- multiple private pension pots or pot-specific rules;
- property, mortgages and housing transactions; a property's rental income
  could be entered as Other income, but no stamp duty, mortgage debt or
  property-specific tax treatment is modelled;
- growable, drawable assets outside private pensions, savings and cash (an
  ISA, a share portfolio and similar); tracked separately from Other income,
  which is a recurring income stream, and not yet modelled at all (see
  the project's open issues);
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
