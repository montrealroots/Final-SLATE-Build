# Research notes

These scoped summaries support the implementation decisions. They do not certify whole countries, entire contracts or complete legal routes. Current observations have no historical effective date unless explicitly listed.

## B01 — primary_current
US Business Complete monthly fee $15; waiver routes include $2,000 minimum daily balance. No minimum opening deposit stated. Full conditions apply.

Use: Current US product example, not a universal fee or historical January price.

Source: https://www.chase.com/business/banking/checking/business-complete-banking

## B02 — primary_current
US pricing displays $31 account-details setup; USD wire/Swift receipt $6.11. Other routes and currencies differ.

Use: Wise is a separate provider type; do not assume every service is an insured bank deposit. Product availability and fees scoped by market.

Source: https://wise.com/us/pricing/business/receive/

## B03 — primary_current
Business signup/account-details fee depends on registration country; marketed free registration does not mean all functionality is free.

Use: Store region and action for fees; resolve landing-page generalizations against local terms.

Source: https://wise.com/help/articles/2977969/fees-for-using-wise-business

## B04 — primary_current
Standard US insurance coverage is $250,000 per depositor per insured bank per ownership category, subject to requirements.

Use: Multiple same-category accounts at one bank do not each create a new limit. No claim of worldwide protection.

Source: https://www.fdic.gov/resources/deposit-insurance/brochures/deposits-at-a-glance

## C01 — primary_current
A US sole proprietorship is not a separate business entity; a trade name does not itself separate personal assets/liabilities.

Use: Supports distinction between independent creator/banner and entity; do not universalize US structure.

Source: https://www.sba.gov/business-guide/launch-your-business/choose-business-structure

## V01 — primary_current
Creative Worker route requires sponsorship and relevant eligibility; work is tied to sponsor. The page states that starting one’s own business is not permitted under this route.

Use: A wealthy independent beginner is not automatically eligible. Partial route extract only.

Source: https://www.gov.uk/creative-worker-visa/overview

## V02 — primary_current
Temporary Work including Creative Worker application fee shown as GBP 340 from October 8, 2026.

Use: Not the total cost; healthcare and other conditions are separate; do not backdate without evidence.

Source: https://www.gov.uk/government/publications/visa-regulations-revised-table/home-office-immigration-and-nationality-fees-8-october-2026

## V03 — primary_current
General work-permit application CAD 155; individual biometrics CAD 85 where applicable; permits/eligibility and exceptions must be checked separately.

Use: No complete C14 route encoded from this general fee guide.

Source: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5487-applying-work-permit-outside-canada.html

## V04 — primary_current
Work-permit exemptions do not necessarily remove visitor visa/eTA entry requirements.

Use: Entry and work permission must be separate checks.

Source: https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/work-without-permit.html

## V05 — primary_historical
USCIS January 2022 bulletin distinguishes O-1B motion-picture/TV assessment from arts.

Use: Partial classification guidance, not current complete route eligibility or fee. Main USCIS detail page returned 403.

Source: https://content.govdelivery.com/accounts/USDHSCIS/bulletins/30582d3

## D01 — primary_historical
August 2020 Sony/Appian Way multi-year multi-picture first look covered scripted features.

Use: Scope precedent; no verified monetary value or current-active claim.

Source: https://www.sonypictures.com/corp/press_releases/2020/0813

## D02 — primary_historical
2017 Amazon announcement: Bona Fide and Killer Films two-year film/TV first looks; Le Grisbi two-year indie-film first look.

Use: Separate scope and term; monetary terms unknown.

Source: https://press.aboutamazon.com/2017/5/amazon-studios-secures-producing-deals-with-bona-fide-productions-killer-films-and-le-grisbi-productions

## D03 — primary_historical
Imagine announces a multi-year Apple Studios first look for scripted movies.

Use: Producer primary source; no value or current status inferred.

Source: https://imagine-entertainment.com/highlights/2021-2/imagine-entertainment-apple-first-look-deal/

## D04 — primary_historical
Netflix February 2018 announcement describes an exclusive multi-year series/film overall agreement beginning July 1, 2018.

Use: Overall precedent, not a first-look quote.

Source: https://about.netflix.com/news/netflix-makes-overall-deal-with-prolific-producer-director-ryan-murphy

## D05 — secondary_reported
Reuters June 2023 report describes the 2018 five-year Netflix agreement as valued as high as USD 300m.

Use: Reported upper headline value; guarantee/component split unknown. Do not annualize as actual personal take-home.

Source: https://finance.yahoo.com/news/dahmer-producer-ryan-murphy-plans-204857142.html

## D06 — primary_historical
2019 WarnerMedia/Bad Robot agreement covered multiple media with initial term through 2024; official financial terms undisclosed.

Use: No automatic active status in 2026; no inferred personal salary.

Source: https://press.wbd.com/ca/media-release/warnermedia-and-bad-robot-productions-form-wide-ranging-content-collaboration?language_content_entity=en

## D07 — secondary_reported
Reuters reporting refers to a USD 250m WarnerMedia/Bad Robot agreement and subsequent scrutiny.

Use: Headline agreement value, not a bank deposit or universal deal tariff.

Source: https://www.investing.com/news/stock-market-news/warner-bros-discovery-expected-to-unveil-new-streaming-strategy-2863171

## D08 — primary_historical
A historical filed contract permits outside submission after rejection/nonresponse but requires resubmission after material changes under its terms.

Use: Contract-specific example; do not impose these clauses on all first-look deals.

Source: https://www.sec.gov/Archives/edgar/data/813828/000104746912010188/a2211663zex-10.htm

## U01 — primary_standard
Ordinary vertical content should reflow at width equivalent to 320 CSS pixels without losing function; exceptions exist for inherently two-dimensional content.

Use: Phone requirements use reflow, not shrinking a desktop canvas.

Source: https://www.w3.org/WAI/WCAG21/Understanding/reflow
