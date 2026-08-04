# UK Retirement Simulator MVP Design

**Status:** Approved starting design

## Goal

Help an approaching-retirement UK couple understand whether a simple combination of State Pension, private pension pots, savings and cash can support their chosen household spending over time.

## Product boundary

The first release is a transparent, local-first, deterministic annual projection. It is an educational planning model, not regulated financial, tax or pension advice.

The primary user is a couple roughly five to ten years from retirement. The model should show the bridge between retirement, private-pension access and each person's State Pension start date.

## Household inputs

Each person has:

- current age;
- planned retirement age;
- simple current salary;
- simple annual private-pension contribution;
- private pension pot;
- private pension growth assumption;
- State Pension start age;
- annual State Pension amount.

The household has:

- cash balance;
- savings balance;
- savings interest assumption;
- essential annual spending;
- preferred annual spending;
- inflation assumption;
- projection end age;
- simple drawdown order.

## Annual calculation

For each projection year, the model will:

1. apply salary and private-pension contributions while each person is working;
2. grow private pensions, cash and savings using the entered assumptions;
3. start each State Pension when its person reaches the entered age;
4. count State Pension as household income;
5. use private pension, savings and cash to fund the preferred spending target;
6. identify whether the essential spending floor is covered;
7. report surplus, shortfall and remaining balances;
8. provide nominal and today's-money views.

The drawdown order is explicit and user-visible. The first candidate should be private pension, savings and cash in a configurable order, with State Pension treated as income rather than a drawdown source.

## Outputs

The MVP should provide:

- a headline result showing whether the essential spending floor remains funded;
- annual income by source;
- annual spending, surplus and shortfall;
- remaining private pension, savings and cash balances;
- the first year in which a funding source is exhausted, if applicable;
- a simple annual chart and inspectable table;
- a fictional starter scenario;
- local JSON scenario export and import.

## Deliberate exclusions

The first release will not model:

- UK income tax or National Insurance;
- Pension Credit or other means-tested benefits;
- annuity conversion;
- defined-benefit pensions;
- multiple private-pension pots per person;
- property or non-cash investments outside private pensions;
- detailed contribution limits or pension-law compliance;
- Monte Carlo or stochastic returns;
- mortality, survivor or inheritance behaviour;
- adviser recommendations.

## Reuse from the Australian simulator

The new repository should reuse the existing project's lessons and patterns rather than Australian rules or code wholesale:

- transparent annual calculation sequencing;
- person-level inputs with household aggregation;
- explicit assumptions and limitations;
- visible drawdown priorities;
- deterministic regression scenarios;
- JSON import/export;
- nominal and today's-money reporting;
- release and browser-verification discipline;
- fictional reference data rather than personal scenarios.

## Starter scenario principle

The default scenario will be plausible and fictional, not labelled as statistically typical. UK wealth and pension outcomes are unevenly distributed, so the scenario should be presented as an adjustable reference case with clearly visible assumptions.

## Initial success criteria

The MVP is successful when a user can enter a two-person approaching-retirement household and clearly answer:

1. When can each person retire under the entered assumptions?
2. How much income comes from State Pension versus private pension drawdown?
3. How long do cash and savings support the household?
4. Does the household meet its essential spending floor through the projection?
5. Which assumptions most affect the result?

## Next design step

Create the implementation plan for the deterministic calculation engine, scenario schema, minimal interface and regression fixtures. Do not add tax, benefits, Monte Carlo or advanced pension features until the base cash-flow model is tested and understandable.
