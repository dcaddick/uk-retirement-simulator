# UK Retirement Simulator

An early-stage, transparent retirement-income modelling tool for approaching-retirement UK couples.

**Release status: Alpha 0.7.0.** The simulator is an estimate-only work in
progress, not financial, tax, legal or pension advice.

The version shown in the page header matches `CHANGELOG.md`. Quote it when
reporting feedback, since the app is distributed as a single file that users
save locally, and one saved copy is otherwise indistinguishable from another.

The version number and the release label are independent. The project is Alpha
and stays Alpha until that is changed deliberately: reaching any particular
version number does not on its own imply Beta. A future Beta label will require
definitive feedback from UK users and a separate review of the model's
assumptions and presentation.

The MVP models State Pension, simple private-pension drawdown, dated lump-sum
withdrawals, savings and cash in a deterministic annual projection. Read the [model methodology](docs/MODEL-METHODOLOGY.md)
for the annual calculation sequence, assumptions and deliberate exclusions.

## Open the simulator

[**Download UK Retirement Simulator**](https://github.com/dcaddick/uk-retirement-simulator/raw/master/uk-retirement-simulator.html)

[**Using a tablet? Open the simulator in your browser**](https://dcaddick.github.io/uk-retirement-simulator/)

Single HTML file, no installation, opens in a modern browser.

The hosted version is the same file, published straight from `master`. It exists
because saving and re-opening a local HTML file is awkward on a tablet, where
there is often no obvious file manager. Tap the second link and the simulator
runs; nothing to download and nothing to install.

Both versions behave identically and neither sends your figures anywhere.
Scenario data stays in the local storage of whichever browser you used, so a
scenario saved from a downloaded file does not appear on the hosted page and the
reverse is also true. Move a scenario between them with **Export JSON** and
**Import JSON**.

One difference worth knowing: the downloaded file makes no network requests at
all, which the test suite enforces. The hosted page is served by GitHub, so
GitHub sees ordinary web-request metadata including your IP address. It still
never receives the contents of your scenario.

## Run locally

No build step or server is required. Open `uk-retirement-simulator.html` directly
in a modern browser. The page is self-contained and makes no network requests.

The page opens in a dark theme; use **Light theme** in the header to switch.
The theme and the input-panel width are remembered on this device. Drag the
divider between the inputs and the results to resize, or focus it and use the
left and right arrow keys.

The starter scenario is fictional and illustrative, not statistically typical.
All assumptions are visible and editable in the page. Give the scenario a name
at the top of the Scenario panel; it is saved with the scenario and used as
the filename when you export. Use **Save locally** and **Load locally** to
store a scenario in this browser on this device, or use **Export JSON** and
**Import JSON** to move a scenario as a human-readable JSON file. Imported
files must match the MVP's two-person GBP scenario shape. Each lump-sum
withdrawal can be disabled without deleting it, to compare a scenario with and
without it.

Results are estimate-only outputs from the entered assumptions. This is not
financial, tax, legal or pension advice, and it does not model UK tax, National
Insurance, benefits, annuities, defined-benefit pensions, external investments,
law-specific limits, stochastic returns, mortality or survivor behaviour.

The approved starting design is in [docs/superpowers/specs/2026-08-04-uk-retirement-mvp-design.md](docs/superpowers/specs/2026-08-04-uk-retirement-mvp-design.md).
