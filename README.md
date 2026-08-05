# UK Retirement Simulator

An early-stage, transparent retirement-income modelling tool for approaching-retirement UK couples.

**Release status: Alpha.** The simulator is an estimate-only work in progress,
not financial, tax, legal or pension advice.

The project will remain Alpha while it gathers definitive feedback from UK
users. A future Beta label will require that feedback and a separate review of
the model’s assumptions and presentation.

The MVP models State Pension, simple private-pension drawdown, dated lump-sum
withdrawals, savings and cash in a deterministic annual projection. Read the [model methodology](docs/MODEL-METHODOLOGY.md)
for the annual calculation sequence, assumptions and deliberate exclusions.

## Run locally

No build step or server is required. Open `uk-retirement-simulator.html` directly
in a modern browser. The page is self-contained and makes no network requests.

The starter scenario is fictional and illustrative, not statistically typical.
All assumptions are visible and editable in the page. Use **Save locally** and
**Load locally** to store a scenario in this browser on this device, or use
**Export JSON** and **Import JSON** to move a scenario as a human-readable JSON
file. Imported files must match the MVP's two-person GBP scenario shape.

Results are estimate-only outputs from the entered assumptions. This is not
financial, tax, legal or pension advice, and it does not model UK tax, National
Insurance, benefits, annuities, defined-benefit pensions, external investments,
law-specific limits, stochastic returns, mortality or survivor behaviour.

The approved starting design is in [docs/superpowers/specs/2026-08-04-uk-retirement-mvp-design.md](docs/superpowers/specs/2026-08-04-uk-retirement-mvp-design.md).
